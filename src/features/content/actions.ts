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

function friendlyErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function redirectWithNewContentError(error: unknown): never {
  const message = friendlyErrorMessage(error, "Falha ao criar conteudo.");
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
          errorMessage: friendlyErrorMessage(error, "Falha ao gerar assets com Gemini."),
        },
      });

      await revalidateContentPages(content.id);
      targetUrl = `/contents/${content.id}?geminiError=${encodeURIComponent(
        friendlyErrorMessage(error, "Falha ao gerar assets com Gemini."),
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
  await videoService.generateProjectVideo(contentId);

  await revalidateContentPages(contentId);
  redirect(`/contents/${contentId}?generated=1`);
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
    const message = error instanceof Error ? error.message : "Falha ao gerar assets com Gemini.";
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
