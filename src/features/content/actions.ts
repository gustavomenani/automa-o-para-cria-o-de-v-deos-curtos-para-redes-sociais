"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createContentProject,
  createProjectWithUploads,
  parseProjectFormData,
} from "@/features/content/services/upload-service";
import { runAssetPipelineForProject } from "@/features/content/services/ai-asset-orchestrator";
import { requireUser } from "@/features/auth/session";
import { videoService } from "@/features/video/services/video-service";
import { geminiService } from "@/integrations/gemini/gemini-service";
import { prisma } from "@/lib/prisma";
import { deleteProjectStorage } from "@/lib/storage/local-storage";

const GENERIC_CREATE_ERROR = "Nao foi possivel criar o conteudo.";
const GENERIC_ASSET_ERROR = "Nao foi possivel gerar os assets automaticamente.";
const GENERIC_VIDEO_ERROR = "Nao foi possivel gerar o video. Revise os arquivos enviados e tente novamente.";
const FORBIDDEN_CONTENT_ERROR = "Voce nao tem acesso a este conteudo.";

function isKnownFriendlyMessage(message: string) {
  return [
    "GEMINI_API_KEY nao configurada. Adicione a chave no arquivo .env.",
    "GEMINI_API_KEY não configurada. Adicione a chave no arquivo .env.",
    "Projeto precisa de pelo menos uma imagem.",
    "Projeto precisa de um arquivo de audio.",
    "Projeto nao encontrado.",
    "Conteudo nao encontrado.",
  ].some((knownMessage) => message.includes(knownMessage));
}

function looksInternalOrSensitive(message: string) {
  return (
    message.length > 260 ||
    /^[\[{]/.test(message.trim()) ||
    /\b(ffmpeg|ffprobe|stderr|stdout|spawn|traceback|stack|node_modules|libx264)\b/i.test(message) ||
    /\bat\s+\S+\s+\(/.test(message) ||
    /([A-Z]:\\|\/Users\/|\/home\/|storage[\\/]|\.env)/i.test(message) ||
    /(AIza[0-9A-Za-z_-]{20,}|MANUS_API_KEY|GEMINI_API_KEY=|sk-[0-9A-Za-z_-]{20,})/.test(message)
  );
}

function friendlyErrorMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message.trim() : "";

  if (!message) {
    return fallback;
  }

  if (isKnownFriendlyMessage(message)) {
    return message;
  }

  return looksInternalOrSensitive(message) ? fallback : message;
}

function redirectWithNewContentError(error: unknown): never {
  const message = friendlyErrorMessage(error, GENERIC_CREATE_ERROR);
  redirect(`/contents/new?error=${encodeURIComponent(message)}`);
}

function parseContentFormOrRedirect(formData: FormData): ReturnType<typeof parseProjectFormData> {
  try {
    return parseProjectFormData(formData);
  } catch (error) {
    redirectWithNewContentError(error);
  }
}

async function revalidateContentPages(contentId?: string) {
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/contents");

  if (contentId) {
    revalidatePath(`/contents/${contentId}`);
  }
}

export async function createContentAction(formData: FormData) {
  const user = await requireUser();
  const parsedForm = parseContentFormOrRedirect(formData);
  const { input, files } = parsedForm;
  const intent = formData.get("intent");

  if (intent === "gemini") {
    let content;

    try {
      content = await createContentProject(input, user.id);
    } catch (error) {
      redirectWithNewContentError(error);
    }

    let targetUrl = `/contents/${content.id}?gemini=1`;

    try {
      const result = await runAssetPipelineForProject({
        projectId: content.id,
        prompt: input.prompt,
      });

      const canGenerateVideo = result.images.length > 0 && Boolean(result.audio);
      const params = new URLSearchParams({ gemini: "1" });

      if (canGenerateVideo) {
        try {
          await videoService.generateProjectVideo(content.id);
          params.set("generated", "1");
        } catch (error) {
          params.set(
            "videoWarning",
            friendlyErrorMessage(error, "Assets gerados, mas o video nao foi criado."),
          );
        }
      } else {
        params.set(
          "videoWarning",
          `O provedor (${result.providerUsed}) retornou o plano textual, mas não gerou imagens e áudio suficientes para montar o MP4 automaticamente. Complete manualmente.`,
        );
      }

      await prisma.contentProject.update({
        where: { id: content.id },
        data: {
          status: result.status === "FAILED" || result.status === "MANUAL_ACTION_REQUIRED" ? "ERROR" : "DRAFT",
          errorMessage: result.warnings.length > 0 ? result.warnings.join(" | ") : null,
        },
      });

      await revalidateContentPages(content.id);
      targetUrl = `/contents/${content.id}?${params.toString()}`;
    } catch (error) {
      await prisma.contentProject.update({
        where: { id: content.id },
        data: {
          status: "ERROR",
          errorMessage: friendlyErrorMessage(error, GENERIC_ASSET_ERROR),
        },
      });

      await revalidateContentPages(content.id);
      targetUrl = `/contents/${content.id}?geminiError=${encodeURIComponent(
        friendlyErrorMessage(error, GENERIC_ASSET_ERROR),
      )}`;
    }

    redirect(targetUrl);
  }

  let content;

  try {
    content = await createProjectWithUploads(input, files, user.id);
  } catch (error) {
    redirectWithNewContentError(error);
  }

  let successParam = "created=1";

  if (intent === "generate") {
    try {
      await videoService.generateProjectVideo(content.id);
    } catch (error) {
      await revalidateContentPages(content.id);
      redirect(
        `/contents/${content.id}?error=${encodeURIComponent(
          friendlyErrorMessage(error, "Projeto salvo, mas o video nao foi gerado."),
        )}`,
      );
    }

    successParam = "generated=1";
  }

  await revalidateContentPages(content.id);
  redirect(`/contents/${content.id}?${successParam}`);
}

export async function generateContentVideoAction(contentId: string) {
  const user = await requireUser();
  let targetUrl = `/contents/${contentId}?generated=1`;

  try {
    await assertOwnedContent(contentId, user.id);
    await videoService.generateProjectVideo(contentId);
  } catch (error) {
    targetUrl = `/contents/${contentId}?error=${encodeURIComponent(
      friendlyErrorMessage(error, GENERIC_VIDEO_ERROR),
    )}`;
  }

  await revalidateContentPages(contentId);
  redirect(targetUrl);
}

export async function generateGeminiAssetsAction(contentId: string) {
  const user = await requireUser();

  try {
    const project = await prisma.contentProject.findFirst({
      where: { id: contentId, userId: user.id },
      select: { prompt: true },
    });

    if (!project) {
      throw new Error(FORBIDDEN_CONTENT_ERROR);
    }

    await geminiService.generateTestAssetsForProject(contentId, project.prompt);

    await revalidateContentPages(contentId);
  } catch (error) {
    const message = friendlyErrorMessage(error, GENERIC_ASSET_ERROR);
    redirect(`/contents/${contentId}?geminiError=${encodeURIComponent(message)}`);
  }

  redirect(`/contents/${contentId}?gemini=1`);
}

type DeleteContentRedirectTarget = "contents" | "schedule";

const deleteRedirects: Record<DeleteContentRedirectTarget, string> = {
  contents: "/contents?deleted=1",
  schedule: "/schedule?deleted=1",
};

async function assertOwnedContent(contentId: string, userId: string) {
  const project = await prisma.contentProject.findFirst({
    where: { id: contentId, userId },
    select: { id: true },
  });

  if (!project) {
    throw new Error(FORBIDDEN_CONTENT_ERROR);
  }

  return project;
}

export async function deleteContentProjectAction(
  contentId: string,
  redirectTarget: DeleteContentRedirectTarget = "contents",
) {
  const user = await requireUser();
  const project = await prisma.contentProject.findFirst({
    where: { id: contentId, userId: user.id },
    include: {
      mediaFiles: true,
      generatedVideos: true,
      scheduledPosts: true,
    },
  });

  if (!project) {
    throw new Error("Conteudo nao encontrado.");
  }

  await prisma.contentProject.delete({
    where: { id: project.id },
  });

  await deleteProjectStorage(
    project.id,
    project.generatedVideos.map((video) => video.path),
  );

  revalidatePath("/");
  revalidatePath("/contents");
  revalidatePath("/dashboard");
  revalidatePath("/schedule");
  redirect(deleteRedirects[redirectTarget]);
}
