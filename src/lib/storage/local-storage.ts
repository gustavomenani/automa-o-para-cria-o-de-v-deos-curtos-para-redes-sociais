import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { generatedRoot, uploadRoot } from "@/lib/paths";

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

  const folder = path.join(uploadRoot, namespace);
  await fs.mkdir(folder, { recursive: true });

  const originalName = file.name || "upload.bin";
  const cleanName = sanitizeFileName(originalName);
  const fileName = `${randomUUID()}-${cleanName}`;
  const destination = path.join(folder, fileName);
  const bytes = Buffer.from(await file.arrayBuffer());

  await fs.writeFile(destination, bytes);

  return {
    fileName: originalName,
    mimeType: file.type || "application/octet-stream",
    path: destination,
    size: bytes.length,
  };
}

export async function getGeneratedVideoPath(contentId: string) {
  await ensureStorageFolders();
  return path.join(generatedRoot, `${contentId}.mp4`);
}
