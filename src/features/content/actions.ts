"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { generateVerticalVideo } from "@/lib/ffmpeg/video-generator";
import { prisma } from "@/lib/prisma";
import { getGeneratedVideoPath } from "@/lib/storage/local-storage";
import {
  createProjectWithUploads,
  parseProjectFormData,
} from "@/features/content/upload-service";

export async function createContentAction(formData: FormData) {
  const { input, files } = parseProjectFormData(formData);
  const content = await createProjectWithUploads(input, files);

  if (formData.get("intent") === "generate") {
    await generateProjectVideo(content.id);
  }

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/contents");
  redirect(`/contents/${content.id}`);
}

async function generateProjectVideo(contentId: string) {
  const content = await prisma.contentProject.findUnique({
    where: { id: contentId },
    include: { mediaFiles: true },
  });

  if (!content) {
    throw new Error("Conteudo nao encontrado.");
  }

  const imagePaths = content.mediaFiles
    .filter((asset) => asset.type === "IMAGE")
    .map((asset) => asset.path);
  const audioPath = content.mediaFiles.find((asset) => asset.type === "AUDIO")?.path;

  if (!audioPath || imagePaths.length === 0) {
    throw new Error("Conteudo precisa de imagens e audio antes da geracao.");
  }

  const output = await getGeneratedVideoPath(content.id);

  try {
    await prisma.contentProject.update({
      where: { id: content.id },
      data: { status: "PROCESSING", errorMessage: null },
    });

    await generateVerticalVideo({
      images: imagePaths,
      audio: audioPath,
      caption: content.caption || content.prompt,
      output,
    });

    await prisma.$transaction([
      prisma.generatedVideo.create({
        data: {
          projectId: content.id,
          path: output,
          duration: null,
          resolution: "1080x1920",
          status: "READY",
        },
      }),
      prisma.contentProject.update({
        where: { id: content.id },
        data: {
          status: "READY",
          errorMessage: null,
        },
      }),
    ]);
  } catch (error) {
    await prisma.contentProject.update({
      where: { id: content.id },
      data: {
        status: "ERROR",
        errorMessage: error instanceof Error ? error.message : "Falha ao gerar video.",
      },
    });
    throw error;
  }

}

export async function generateContentVideoAction(contentId: string) {
  await generateProjectVideo(contentId);

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/contents");
  revalidatePath(`/contents/${contentId}`);
}
