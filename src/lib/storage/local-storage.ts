import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { generatedRoot, resolvedStorageRoot, uploadRoot } from "@/lib/paths";

export type StoredFile = {
  fileName: string;
  mimeType: string;
  path: string;
  size: number;
};

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
}

export async function ensureStorageFolders() {
  await fs.mkdir(uploadRoot, { recursive: true });
  await fs.mkdir(generatedRoot, { recursive: true });
}

export async function saveUploadedFile(file: File, namespace: string): Promise<StoredFile> {
  await ensureStorageFolders();

  const folder = path.join(/*turbopackIgnore: true*/ uploadRoot, namespace);
  await fs.mkdir(folder, { recursive: true });

  const originalName = file.name || "upload.bin";
  const cleanName = sanitizeFileName(originalName);
  const fileName = `${randomUUID()}-${cleanName}`;
  const destination = path.join(/*turbopackIgnore: true*/ folder, fileName);
  const bytes = Buffer.from(await file.arrayBuffer());

  await fs.writeFile(destination, bytes);

  return {
    fileName: originalName,
    mimeType: file.type || "application/octet-stream",
    path: destination,
    size: bytes.length,
  };
}

export async function saveGeneratedAsset(
  bytes: Buffer,
  namespace: string,
  fileName: string,
  mimeType: string,
): Promise<StoredFile> {
  await ensureStorageFolders();

  const folder = path.join(/*turbopackIgnore: true*/ uploadRoot, namespace);
  await fs.mkdir(folder, { recursive: true });

  const cleanName = sanitizeFileName(fileName || "generated-asset.bin");
  const storedName = `${randomUUID()}-${cleanName}`;
  const destination = path.join(/*turbopackIgnore: true*/ folder, storedName);

  await fs.writeFile(destination, bytes);

  return {
    fileName: cleanName,
    mimeType,
    path: destination,
    size: bytes.length,
  };
}

export async function getGeneratedVideoPath(contentId: string, generatedVideoId?: string) {
  await ensureStorageFolders();

  if (generatedVideoId) {
    return path.join(/*turbopackIgnore: true*/ generatedRoot, contentId, `${generatedVideoId}.mp4`);
  }

  return path.join(/*turbopackIgnore: true*/ generatedRoot, `${contentId}.mp4`);
}

function assertStoragePath(filePath: string) {
  const resolvedPath = path.resolve(/*turbopackIgnore: true*/ filePath);
  const relativePath = path.relative(resolvedStorageRoot, resolvedPath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath) || relativePath === "") {
    throw new Error("Caminho de storage invalido para exclusao.");
  }

  return resolvedPath;
}

export async function deleteProjectStorage(projectId: string, generatedVideoPaths: string[] = []) {
  const uploadFolder = path.join(/*turbopackIgnore: true*/ uploadRoot, projectId);
  const generatedPaths = new Set([
    path.join(/*turbopackIgnore: true*/ generatedRoot, `${projectId}.mp4`),
    ...generatedVideoPaths.filter(Boolean),
  ]);

  await fs.rm(assertStoragePath(uploadFolder), { recursive: true, force: true });

  await Promise.all(
    [...generatedPaths].map((videoPath) =>
      fs.rm(assertStoragePath(videoPath), { recursive: true, force: true }),
    ),
  );
}
