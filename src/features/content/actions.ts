"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createContentProject,
  createProjectWithUploads,
  parseProjectFormData,
} from "@/features/content/services/upload-service";
import { videoService } from "@/features/video/services/video-service";
import { geminiService } from "@/integrations/gemini/gemini-service";
import { prisma } from "@/lib/prisma";
import { deleteProjectStorage } from "@/lib/storage/local-storage";

const GENERIC_CREATE_ERROR = "Nao foi possivel criar o conteudo.";
const GENERIC_ASSET_ERROR = "Nao foi possivel gerar os assets automaticamente.";
const GENERIC_VIDEO_ERROR = "Nao foi possivel gerar o video. Revise os arquivos enviados e tente novamente.";

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
  const parsedForm = parseContentFormOrRedirect(formData);
  const { input, files } = parsedForm;
  const intent = formData.get("intent");

  if (intent === "gemini") {
    let plan;

    try {
      plan = await geminiService.generateReelsPlan(input.prompt);
    } catch (error) {
      redirectWithNewContentError(error);
    }

    const content = await createContentProject(input);
    let targetUrl = `/contents/${content.id}?gemini=1`;

    try {
      const result = await geminiService.generateTestAssetsForProject(
        content.id,
        content.prompt,
        plan,
      );
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
          "A Gemini retornou o plano textual, mas nao gerou imagens e audio suficientes para montar o MP4 automaticamente.",
        );
      }

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
    content = await createProjectWithUploads(input, files);
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
  let targetUrl = `/contents/${contentId}?generated=1`;

  try {
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
  try {
    const project = await prisma.contentProject.findUnique({
      where: { id: contentId },
      select: { prompt: true },
    });

    if (!project) {
      throw new Error("Conteudo nao encontrado.");
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

export async function deleteContentProjectAction(
  contentId: string,
  redirectTarget: DeleteContentRedirectTarget = "contents",
) {
  const project = await prisma.contentProject.findUnique({
    where: { id: contentId },
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
