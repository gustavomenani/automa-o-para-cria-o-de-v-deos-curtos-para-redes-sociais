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

function toFormat(fileName: string, mimeType: string) {
  const extension = path.extname(fileName).replace(".", "");
  return extension || mimeType.split("/").at(1)?.split(";").at(0) || "bin";
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

    for (const audio of manusResult.assets.audio) {
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
    }

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
- Forneca TODAS as imagens necessarias (minimo 3, proporcao 9:16) como anexos reais na resposta.
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
      return {
        providerUsed: "MANUS",
        plan: manusResult.plan ?? null,
        images: [],
        audio: null,
        status: "RUNNING",
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

  const manusResult = await manusService.getNormalizedTaskResult(latestRun.providerTaskId);

  if (manusResult.taskStatus !== "stopped") {
    await updateAssetGenerationRun({
      runId: latestRun.id,
      status: "RUNNING",
      summary: manusResult.rawText,
    });

    return { completed: false };
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
