import type { ContentProject, MediaFile } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  deleteProjectStorage,
  saveUploadedFile,
  type StoredFile,
} from "@/lib/storage/local-storage";
import {
  contentProjectInputSchema,
  type ContentProjectInput,
} from "@/features/content/schemas";

const imageMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const audioMimeTypes = new Set([
  "audio/aac",
  "audio/m4a",
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
  "audio/x-m4a",
  "audio/x-wav",
]);

export type ProjectFilesInput = {
  images: File[];
  audio?: File;
};

export type CreateProjectWithUploadsResult = ContentProject & {
  mediaFiles: MediaFile[];
};

export function filesFromFormData(formData: FormData, field: string) {
  return formData
    .getAll(field)
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);
}

function getFileFormat(fileName: string, mimeType: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (extension && extension !== fileName.toLowerCase()) {
    return extension;
  }

  return mimeType.split("/").at(1)?.toLowerCase() ?? "bin";
}

function validateFileType(file: File, expected: "image" | "audio") {
  const allowed = expected === "image" ? imageMimeTypes : audioMimeTypes;

  if (!allowed.has(file.type)) {
    throw new Error(
      expected === "image"
        ? `Imagem invalida: ${file.name}. Use JPG, PNG ou WEBP.`
        : `Audio invalido: ${file.name}. Use MP3, WAV, M4A, AAC, OGG ou WEBM.`,
    );
  }
}

export function validateProjectFiles(files: ProjectFilesInput, options = { requireAudio: true }) {
  if (files.images.length === 0 && !files.audio) {
    throw new Error("Envie pelo menos uma imagem ou um audio.");
  }

  for (const image of files.images) {
    validateFileType(image, "image");
  }

  if (options.requireAudio && !files.audio) {
    throw new Error("Envie um arquivo de audio.");
  }

  if (files.audio) {
    validateFileType(files.audio, "audio");
  }
}

function mediaData(projectId: string, type: "IMAGE" | "AUDIO", storedFile: StoredFile) {
  return {
    projectId,
    type,
    path: storedFile.path,
    originalName: storedFile.fileName,
    size: storedFile.size,
    format: getFileFormat(storedFile.fileName, storedFile.mimeType),
    mimeType: storedFile.mimeType,
  };
}

export async function attachMediaFilesToProject(
  projectId: string,
  files: ProjectFilesInput,
  userId?: string,
) {
  validateProjectFiles(files, { requireAudio: false });

  const project = await prisma.contentProject.findFirst({
    where: { id: projectId, ...(userId ? { userId } : {}) },
    select: { id: true },
  });

  if (!project) {
    throw new Error("Projeto nao encontrado.");
  }

  const storedImages = await Promise.all(
    files.images.map((image) => saveUploadedFile(image, projectId)),
  );
  const storedAudio = files.audio ? await saveUploadedFile(files.audio, projectId) : null;

  const data = [
    ...storedImages.map((image) => mediaData(projectId, "IMAGE", image)),
    ...(storedAudio ? [mediaData(projectId, "AUDIO", storedAudio)] : []),
  ];

  if (data.length === 0) {
    return [];
  }

  await prisma.mediaFile.createMany({ data });

  return prisma.mediaFile.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createContentProject(input: ContentProjectInput, userId?: string) {
  const parsed = contentProjectInputSchema.parse(input);

  return prisma.contentProject.create({
    data: {
      title: parsed.title,
      prompt: parsed.prompt,
      caption: parsed.caption || null,
      contentType: parsed.contentType,
      status: "DRAFT",
      userId,
    },
  });
}

export async function createProjectWithUploads(
  input: ContentProjectInput,
  files: ProjectFilesInput,
  userId?: string,
) {
  const parsed = contentProjectInputSchema.parse(input);
  validateProjectFiles(files);

  const project = await createContentProject(parsed, userId);

  try {
    await attachMediaFilesToProject(project.id, files, userId);

    return prisma.contentProject.findUniqueOrThrow({
      where: { id: project.id },
      include: {
        mediaFiles: { orderBy: { createdAt: "desc" } },
        generatedVideos: { orderBy: { createdAt: "desc" } },
      },
    });
  } catch (error) {
    await deleteProjectStorage(project.id);

    await prisma.contentProject.update({
      where: { id: project.id },
      data: {
        status: "ERROR",
        errorMessage:
          error instanceof Error ? error.message : "Falha ao salvar arquivos do projeto.",
      },
    });
    throw error;
  }
}

export function parseProjectFormData(formData: FormData) {
  const audioFiles = filesFromFormData(formData, "audio");

  if (audioFiles.length > 1) {
    throw new Error("Envie apenas um arquivo de audio.");
  }

  return {
    input: contentProjectInputSchema.parse({
      title: formData.get("title"),
      prompt: formData.get("prompt"),
      caption: formData.get("caption") || undefined,
      contentType: formData.get("contentType") || "REELS",
    }),
    files: {
      images: filesFromFormData(formData, "images"),
      audio: audioFiles[0],
    },
  };
}
