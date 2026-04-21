"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { generateVerticalVideo } from "@/lib/ffmpeg/video-generator";
import { prisma } from "@/lib/prisma";
import { getGeneratedVideoPath, saveUploadedFile } from "@/lib/storage/local-storage";

const contentSchema = z.object({
  title: z.string().trim().min(2, "Informe um titulo."),
  caption: z.string().trim().min(1, "Informe uma legenda."),
});

function filesFromFormData(formData: FormData, field: string) {
  return formData
    .getAll(field)
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);
}

export async function createContentAction(formData: FormData) {
  const parsed = contentSchema.safeParse({
    title: formData.get("title"),
    caption: formData.get("caption"),
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

  const content = await prisma.content.create({
    data: {
      title: parsed.data.title,
      caption: parsed.data.caption,
      status: "DRAFT",
    },
  });

  try {
    const namespace = content.id;
    const storedImages = await Promise.all(
      images.map((image) => saveUploadedFile(image, namespace)),
    );
    const storedAudio = await saveUploadedFile(audio, namespace);

    await prisma.asset.createMany({
      data: [
        ...storedImages.map((image) => ({
          contentId: content.id,
          type: "IMAGE" as const,
          fileName: image.fileName,
          mimeType: image.mimeType,
          path: image.path,
          size: image.size,
        })),
        {
          contentId: content.id,
          type: "AUDIO" as const,
          fileName: storedAudio.fileName,
          mimeType: storedAudio.mimeType,
          path: storedAudio.path,
          size: storedAudio.size,
        },
      ],
    });
  } catch (error) {
    await prisma.content.update({
      where: { id: content.id },
      data: {
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Falha ao salvar arquivos.",
      },
    });
    throw error;
  }

  revalidatePath("/");
  revalidatePath("/contents");
  redirect(`/contents/${content.id}/review`);
}

export async function generateContentVideoAction(contentId: string) {
  const content = await prisma.content.findUnique({
    where: { id: contentId },
    include: { assets: true },
  });

  if (!content) {
    throw new Error("Conteudo nao encontrado.");
  }

  const imagePaths = content.assets
    .filter((asset) => asset.type === "IMAGE")
    .map((asset) => asset.path);
  const audioPath = content.assets.find((asset) => asset.type === "AUDIO")?.path;

  if (!audioPath || imagePaths.length === 0) {
    throw new Error("Conteudo precisa de imagens e audio antes da geracao.");
  }

  const output = await getGeneratedVideoPath(content.id);

  try {
    await generateVerticalVideo({
      images: imagePaths,
      audio: audioPath,
      caption: content.caption,
      output,
    });

    await prisma.content.update({
      where: { id: content.id },
      data: {
        status: "READY",
        videoPath: output,
        errorMessage: null,
      },
    });
  } catch (error) {
    await prisma.content.update({
      where: { id: content.id },
      data: {
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Falha ao gerar video.",
      },
    });
    throw error;
  }

  revalidatePath("/");
  revalidatePath("/contents");
  revalidatePath(`/contents/${content.id}/review`);
}
