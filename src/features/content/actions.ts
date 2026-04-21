"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { generateVerticalVideo } from "@/lib/ffmpeg/video-generator";
import { prisma } from "@/lib/prisma";
import { getGeneratedVideoPath, saveUploadedFile } from "@/lib/storage/local-storage";

const contentSchema = z.object({
  title: z.string().trim().min(2, "Informe um titulo."),
  prompt: z.string().trim().min(1, "Informe um prompt."),
  caption: z.string().trim().optional(),
  contentType: z
    .enum(["REELS", "STORY", "TIKTOK", "YOUTUBE_SHORTS"])
    .default("REELS"),
});

function filesFromFormData(formData: FormData, field: string) {
  return formData
    .getAll(field)
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);
}

export async function createContentAction(formData: FormData) {
  const parsed = contentSchema.safeParse({
    title: formData.get("title"),
    prompt: formData.get("prompt"),
    caption: formData.get("caption"),
    contentType: formData.get("contentType") || "REELS",
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados invalidos.");
  }

  const images = filesFromFormData(formData, "images");
  const audio = filesFromFormData(formData, "audio")[0];

  if (images.length === 0) {
    throw new Error("Envie pelo menos uma imagem.");
  }

  if (!audio) {
    throw new Error("Envie um arquivo de audio.");
  }

  const content = await prisma.contentProject.create({
    data: {
      title: parsed.data.title,
      prompt: parsed.data.prompt,
      caption: parsed.data.caption || null,
      contentType: parsed.data.contentType,
      status: "DRAFT",
    },
  });

  try {
    const namespace = content.id;
    const storedImages = await Promise.all(
      images.map((image) => saveUploadedFile(image, namespace)),
    );
    const storedAudio = await saveUploadedFile(audio, namespace);

    await prisma.mediaFile.createMany({
      data: [
        ...storedImages.map((image) => ({
          projectId: content.id,
          type: "IMAGE" as const,
          originalName: image.fileName,
          format: image.fileName.split(".").pop()?.toLowerCase() ?? "image",
          mimeType: image.mimeType,
          path: image.path,
          size: image.size,
        })),
        {
          projectId: content.id,
          type: "AUDIO" as const,
          originalName: storedAudio.fileName,
          format: storedAudio.fileName.split(".").pop()?.toLowerCase() ?? "audio",
          mimeType: storedAudio.mimeType,
          path: storedAudio.path,
          size: storedAudio.size,
        },
      ],
    });
  } catch (error) {
    await prisma.contentProject.update({
      where: { id: content.id },
      data: {
        status: "ERROR",
        errorMessage: error instanceof Error ? error.message : "Falha ao salvar arquivos.",
      },
    });
    throw error;
  }

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
