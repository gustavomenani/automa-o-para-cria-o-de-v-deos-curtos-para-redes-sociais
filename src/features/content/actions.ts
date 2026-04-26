"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createContentProject,
  createProjectWithUploads,
  parseProjectFormData,
} from "@/features/content/services/upload-service";
import { requireUser } from "@/features/auth/session";
import { publishProjectNow } from "@/integrations/social/publish-orchestrator";
import { socialPlatformLabels } from "@/integrations/social/social-platforms";
import { videoService } from "@/features/video/services/video-service";
import { prisma } from "@/lib/prisma";
import { normalizeSafeError } from "@/lib/api-response";
import { deleteProjectStorage } from "@/lib/storage/local-storage";

const GENERIC_CREATE_ERROR = "Nao foi possivel criar o conteudo.";
const GENERIC_ASSET_ERROR = "Nao foi possivel gerar os assets automaticamente.";
const GENERIC_VIDEO_ERROR = "Nao foi possivel gerar o video. Revise os arquivos enviados e tente novamente.";
const FORBIDDEN_CONTENT_ERROR = "Voce nao tem acesso a este conteudo.";

function isKnownFriendlyMessage(message: string) {
  return [
    "MANUS_API_KEY nao configurada. Cadastre a chave em /settings ou no arquivo .env.",
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
    /(MANUS_API_KEY|sk-[0-9A-Za-z_-]{20,})/.test(message)
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

  return normalizeSafeError(error, looksInternalOrSensitive(message) ? fallback : fallback);
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

  if (intent === "manus") {
    let content;

    try {
      content = await createContentProject(input, user.id);
    } catch (error) {
      redirectWithNewContentError(error);
    }

    let targetUrl = `/contents/${content.id}?manus=1`;

    try {
      const { runAssetPipelineForProject } = await import(
        "@/features/content/services/ai-asset-orchestrator"
      );
      const result = await runAssetPipelineForProject({
        projectId: content.id,
        prompt: input.prompt,
      });

      const canGenerateVideo = result.images.length > 0 && Boolean(result.audio);
      const params = new URLSearchParams({ manus: "1" });
      const manusWarnings = result.warnings.length > 0 ? result.warnings.join(" | ") : null;
      let videoGenerated = false;
      let videoGenerationFailed = false;

      if (canGenerateVideo) {
        try {
          await videoService.generateProjectVideo(content.id);
          videoGenerated = true;
          params.set("generated", "1");
        } catch (error) {
          videoGenerationFailed = true;
          params.set(
            "videoWarning",
            friendlyErrorMessage(error, "Assets gerados, mas o video nao foi criado."),
          );
        }
      } else {
        params.set(
          "videoWarning",
          `A Manus retornou o plano textual, mas nao gerou imagens e audio suficientes para montar o MP4 automaticamente. Complete manualmente.`,
        );
      }

      const updateData: {
        status?: "DRAFT" | "READY" | "ERROR";
        errorMessage?: string | null;
      } = {};

      if (result.status === "FAILED" || result.status === "MANUAL_ACTION_REQUIRED") {
        updateData.status = "ERROR";
        updateData.errorMessage = manusWarnings;
      } else if (videoGenerated) {
        updateData.status = "READY";

        if (manusWarnings) {
          updateData.errorMessage = manusWarnings;
        }
      } else if (!videoGenerationFailed) {
        updateData.status = "DRAFT";
        updateData.errorMessage = manusWarnings;
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.contentProject.update({
          where: { id: content.id },
          data: updateData,
        });
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
      targetUrl = `/contents/${content.id}?manusError=${encodeURIComponent(
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

export async function syncManusAssetsAction(contentId: string) {
  const user = await requireUser();
  let completed = false;

  try {
    await assertOwnedContent(contentId, user.id);
    const { syncPendingManusRunForProject } = await import(
      "@/features/content/services/ai-asset-orchestrator"
    );
    const synced = await syncPendingManusRunForProject(contentId);
    completed = synced.completed;

    await revalidateContentPages(contentId);
  } catch (error) {
    await revalidateContentPages(contentId);
    redirect(
      `/contents/${contentId}?manusError=${encodeURIComponent(
        friendlyErrorMessage(error, GENERIC_ASSET_ERROR),
      )}`,
    );
  }

  if (!completed) {
    redirect(`/contents/${contentId}?manusPending=1`);
  }

  redirect(`/contents/${contentId}?manus=1`);
}

export async function publishSocialNowAction(
  contentId: string,
  platform: "INSTAGRAM" | "TIKTOK" | "YOUTUBE",
  formData: FormData,
) {
  const user = await requireUser();
  const providerLabel = socialPlatformLabels[platform];

  try {
    await assertOwnedContent(contentId, user.id);
    const socialAccountId = String(formData.get("socialAccountId") ?? "").trim();
    const caption = String(formData.get("caption") ?? "").trim();
    const visibility = String(formData.get("visibility") ?? "private").trim();

    if (!socialAccountId) {
      throw new Error(`Selecione uma conta conectada do ${providerLabel}.`);
    }

    if (!caption) {
      throw new Error("Informe a legenda antes de publicar.");
    }

    const socialAccount = await prisma.socialAccount.findFirst({
      where: {
        id: socialAccountId,
        userId: user.id,
        platform,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    if (!socialAccount) {
      throw new Error(`A conta selecionada nao pertence ao ${providerLabel}.`);
    }

    await publishProjectNow({
      projectId: contentId,
      socialAccountId,
      caption,
      visibility,
    });

    await revalidateContentPages(contentId);
    redirect(`/contents/${contentId}?publishedPlatform=${platform}`);
  } catch (error) {
    await revalidateContentPages(contentId);
    redirect(
      `/contents/${contentId}?publishError=${encodeURIComponent(
        friendlyErrorMessage(error, `Nao foi possivel publicar no ${providerLabel}.`),
      )}`,
    );
  }
}

export async function saveCaptionReviewAction(contentId: string, formData: FormData) {
  const user = await requireUser();
  const caption = String(formData.get("caption") ?? "").trim();

  if (!caption || caption.length > 5000) {
    redirect(
      `/contents/${contentId}?error=${encodeURIComponent(
        "Nao foi possivel concluir a acao. Revise os dados e tente novamente.",
      )}`,
    );
  }

  const updated = await prisma.contentProject.updateMany({
    where: { id: contentId, userId: user.id },
    data: {
      caption,
      errorMessage: null,
    },
  });

  if (updated.count === 0) {
    redirect(`/contents/${contentId}?error=${encodeURIComponent(FORBIDDEN_CONTENT_ERROR)}`);
  }

  await revalidateContentPages(contentId);
  redirect(`/contents/${contentId}?captionSaved=1`);
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
