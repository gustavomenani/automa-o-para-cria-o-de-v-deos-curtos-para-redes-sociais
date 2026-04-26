import { prisma } from "@/lib/prisma";
import {
  manusService,
  writeStoredManusPlan,
  type ManusStoredPlan,
} from "@/integrations/manus/manus-service";
import {
  startAssetGenerationRun,
  updateAssetGenerationRun,
  completeAssetGenerationRun,
  failAssetGenerationRun,
} from "./asset-generation-run-service";
import { saveGeneratedAsset } from "@/lib/storage/local-storage";
import type { AssetProvider, AssetGenerationStatus, Prisma } from "@prisma/client";
import path from "node:path";
import fs from "node:fs/promises";

const MIN_MANUS_IMAGE_COUNT = 8;
const MAX_MANUS_IMAGE_COUNT = 10;
const MAX_MANUS_AUDIO_SECONDS = 110;

function toFormat(fileName: string, mimeType: string) {
  const extension = path.extname(fileName).replace(".", "");
  return extension || mimeType.split("/").at(1)?.split(";").at(0) || "bin";
}

async function validateManusAssetPackage(
  manusResult: Awaited<ReturnType<typeof manusService.getNormalizedTaskResult>>,
) {
  const imageCount = manusResult.assets.images.length;

  if (imageCount < MIN_MANUS_IMAGE_COUNT || imageCount > MAX_MANUS_IMAGE_COUNT) {
    throw new Error(
      `A Manus retornou ${imageCount} imagens. O padrao exigido para geracao automatica e de ${MIN_MANUS_IMAGE_COUNT} a ${MAX_MANUS_IMAGE_COUNT} imagens.`,
    );
  }

  if (manusResult.assets.audio.length !== 1) {
    throw new Error(
      `A Manus retornou ${manusResult.assets.audio.length} arquivos de audio. O fluxo automatico exige exatamente 1 narracao final.`,
    );
  }

  const primaryAudio = manusResult.assets.audio[0]!;
  const { probeAudioDurationFromBuffer } = await import(
    "@/features/content/services/manus-audio-probe"
  );
  const audioDurationSeconds = await probeAudioDurationFromBuffer(
    primaryAudio.buffer,
    primaryAudio.fileName,
  );

  if (audioDurationSeconds > MAX_MANUS_AUDIO_SECONDS) {
    throw new Error(
      `A Manus retornou audio com ${Math.round(audioDurationSeconds)}s. O limite automatico para este projeto e ${MAX_MANUS_AUDIO_SECONDS}s.`,
    );
  }
}

export type OrchestratorResult = {
  providerUsed: AssetProvider;
  plan: unknown;
  images: unknown[];
  audio: unknown | null;
  status: AssetGenerationStatus;
  missingAssets: { images: boolean; audio: boolean };
  warnings: string[];
  runId: string;
};

async function importCompletedManusResult({
  projectId,
  projectTitle,
  projectCaption,
  runId,
  manusResult,
}: {
  projectId: string;
  projectTitle: string;
  projectCaption: string | null;
  runId: string;
  manusResult: Awaited<ReturnType<typeof manusService.getNormalizedTaskResult>>;
}): Promise<OrchestratorResult> {
  if (!manusResult.plan) {
    throw new Error("A Manus nao retornou o plano estruturado esperado.");
  }

  if (manusResult.missingAssets.images || manusResult.missingAssets.audio) {
    throw new Error("A Manus nao retornou imagens e audio suficientes para concluir a geracao automatica.");
  }

  if (manusResult.status === "FAILED" || manusResult.status === "MANUAL_ACTION_REQUIRED") {
    throw new Error(manusResult.warnings[0] || "A Manus nao concluiu a geracao automatica.");
  }

  await validateManusAssetPackage(manusResult);

  const savedPaths: string[] = [];
  const mediaRows: Record<string, unknown>[] = [];

  try {
    await writeStoredManusPlan(projectId, manusResult.plan as ManusStoredPlan);

    for (const img of manusResult.assets.images) {
      const file = await saveGeneratedAsset(img.buffer, projectId, img.fileName, img.mimeType);
      savedPaths.push(file.path);
      mediaRows.push({
        type: "IMAGE" as const,
        path: file.path,
        originalName: file.fileName,
        size: file.size,
        format: toFormat(file.fileName, img.mimeType),
        mimeType: img.mimeType,
      });
    }

    const audio = manusResult.assets.audio[0]!;
    const file = await saveGeneratedAsset(audio.buffer, projectId, audio.fileName, audio.mimeType);
    savedPaths.push(file.path);
    mediaRows.push({
      type: "AUDIO" as const,
      path: file.path,
      originalName: file.fileName,
      size: file.size,
      format: toFormat(file.fileName, audio.mimeType),
      mimeType: audio.mimeType,
    });

    await prisma.$transaction(async (tx) => {
      await tx.contentProject.update({
        where: { id: projectId },
        data: {
          title: (manusResult.plan as Record<string, unknown>)?.title as string || projectTitle,
          caption: (manusResult.plan as Record<string, unknown>)?.caption as string || projectCaption,
          status: "DRAFT",
          errorMessage: manusResult.warnings.length > 0 ? manusResult.warnings.join(" | ") : null,
        },
      });

      if (mediaRows.length > 0) {
        await tx.mediaFile.createMany({
          data: mediaRows.map((row) => ({
            ...row,
            projectId,
          })) as Prisma.MediaFileCreateManyInput[],
        });
      }
    });

    const createdMedia = await prisma.mediaFile.findMany({
      where: { projectId, path: { in: mediaRows.map((r) => r.path as string) } },
    });

    await completeAssetGenerationRun({
      runId,
      status: manusResult.status,
      missingAssets: manusResult.missingAssets,
      summary: manusResult.rawText,
    });

    return {
      providerUsed: "MANUS",
      plan: manusResult.plan,
      images: createdMedia.filter((m) => m.type === "IMAGE"),
      audio: createdMedia.find((m) => m.type === "AUDIO") || null,
      status: manusResult.status,
      missingAssets: manusResult.missingAssets,
      warnings: manusResult.warnings,
      runId,
    };
  } catch (err) {
    await Promise.all(savedPaths.map((p) => fs.rm(p, { force: true }).catch(() => {})));
    throw err;
  }
}

export async function runAssetPipelineForProject({
  projectId,
  prompt,
}: {
  projectId: string;
  prompt: string;
}): Promise<OrchestratorResult> {
  const project = await prisma.contentProject.findUnique({
    where: { id: projectId },
  });

  if (!project) throw new Error("Projeto não encontrado.");

  if (!manusService.hasApiKey) {
    throw new Error("MANUS_API_KEY nao configurada. Cadastre a chave em /settings ou no arquivo .env.");
  }

  const providerUsed: AssetProvider = "MANUS";

  const run = await startAssetGenerationRun({
    projectId,
    provider: providerUsed,
  });

  try {
    const promptToManus = `Gere todos os assets para um video curto vertical a partir do prompt: "${prompt}".

Regras obrigatorias:
- Retorne um JSON dentro de \`\`\`json ... \`\`\` com a seguinte estrutura: {"title": "...", "script": "...", "caption": "...", "hashtags": ["..."], "sceneIdeas": ["..."], "imagePrompts": ["..."]}
- O tempo final do video deve seguir o que o usuario pediu no prompt, com limite maximo de ${MAX_MANUS_AUDIO_SECONDS} segundos.
- Planeje a historia para renderizar com padrao de ${MIN_MANUS_IMAGE_COUNT} a ${MAX_MANUS_IMAGE_COUNT} imagens, sempre em proporcao 9:16.
- Forneca TODAS as imagens necessarias (${MIN_MANUS_IMAGE_COUNT} a ${MAX_MANUS_IMAGE_COUNT}) como anexos reais na resposta.
- Forneca tambem UM arquivo de audio de narracao completo como anexo real.
- Nao responda so com texto: a tarefa so termina corretamente quando vierem JSON + imagens + audio.`;
      
    const task = await manusService.createTask(promptToManus);
      
    await updateAssetGenerationRun({
      runId: run.id,
      providerTaskId: task.id,
      status: "RUNNING",
    });

    const maxWaitMs = 600_000;
    const startedAt = Date.now();
    let manusResult = await manusService.getNormalizedTaskResult(task.id);
      
    while (manusResult.status === "QUEUED" || manusResult.status === "RUNNING") {
      if (Date.now() - startedAt > maxWaitMs) {
        manusResult.warnings.push("Timeout ao aguardar resposta da Manus.");
        manusResult.status = "FAILED";
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 5000));
      manusResult = await manusService.getNormalizedTaskResult(task.id);
        
      await updateAssetGenerationRun({
        runId: run.id,
        summary: manusResult.rawText,
      });
    }

    if (manusResult.taskStatus !== "stopped") {
      if (
        manusResult.status === "FAILED" ||
        manusResult.status === "MANUAL_ACTION_REQUIRED"
      ) {
        throw new Error(
          manusResult.warnings[0] || "A Manus nao concluiu a geracao automatica.",
        );
      }

      return {
        providerUsed: "MANUS",
        plan: manusResult.plan ?? null,
        images: [],
        audio: null,
        status: manusResult.status,
        missingAssets: { images: true, audio: true },
        warnings: manusResult.warnings,
        runId: run.id,
      };
    }

    return await importCompletedManusResult({
      projectId,
      projectTitle: project.title,
      projectCaption: project.caption,
      runId: run.id,
      manusResult,
    });
  } catch (error) {
    await failAssetGenerationRun({
      runId: run.id,
      summary: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function syncPendingManusRunForProject(projectId: string) {
  const project = await prisma.contentProject.findUnique({
    where: { id: projectId },
    include: {
      assetGenerationRuns: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!project) {
    throw new Error("Projeto nao encontrado.");
  }

  const latestRun = project.assetGenerationRuns.at(0);

  if (!latestRun?.providerTaskId || latestRun.provider !== "MANUS") {
    throw new Error("Nao existe uma geracao Manus pendente para sincronizar.");
  }

  if (latestRun.status === "COMPLETED" || latestRun.status === "PARTIAL") {
    return { completed: true };
  }

  if (latestRun.status === "FAILED" || latestRun.status === "MANUAL_ACTION_REQUIRED") {
    const summary =
      typeof latestRun.summary === "string" && latestRun.summary.trim()
        ? latestRun.summary.trim()
        : "A Manus nao concluiu a geracao automatica.";
    throw new Error(summary);
  }

  const manusResult = await manusService.getNormalizedTaskResult(latestRun.providerTaskId);

  if (manusResult.taskStatus !== "stopped") {
    if (
      manusResult.status === "FAILED" ||
      manusResult.status === "MANUAL_ACTION_REQUIRED"
    ) {
      await failAssetGenerationRun({
        runId: latestRun.id,
        summary: manusResult.rawText || manusResult.warnings[0] || "A Manus nao concluiu a geracao automatica.",
        missingAssets: manusResult.missingAssets,
      });

      throw new Error(manusResult.warnings[0] || "A Manus nao concluiu a geracao automatica.");
    }

    await updateAssetGenerationRun({
      runId: latestRun.id,
      status: "RUNNING",
      missingAssets: manusResult.missingAssets,
      summary: manusResult.rawText,
    });

    return { completed: false };
  }

  const finalizationClaim = await prisma.assetGenerationRun.updateMany({
    where: {
      id: latestRun.id,
      provider: "MANUS",
      status: {
        in: ["RUNNING", "QUEUED"],
      },
      finishedAt: null,
    },
    data: {
      finishedAt: new Date(),
    },
  });

  if (finalizationClaim.count === 0) {
    const currentRun = await prisma.assetGenerationRun.findUnique({
      where: { id: latestRun.id },
      select: {
        status: true,
        summary: true,
      },
    });

    if (currentRun?.status === "FAILED" || currentRun?.status === "MANUAL_ACTION_REQUIRED") {
      const summary =
        typeof currentRun.summary === "string" && currentRun.summary.trim()
          ? currentRun.summary.trim()
          : "A Manus nao concluiu a geracao automatica.";
      throw new Error(summary);
    }

    return { completed: currentRun?.status === "COMPLETED" || currentRun?.status === "PARTIAL" };
  }

  return {
    completed: true,
    result: await importCompletedManusResult({
      projectId,
      projectTitle: project.title,
      projectCaption: project.caption,
      runId: latestRun.id,
      manusResult,
    }),
  };
}
