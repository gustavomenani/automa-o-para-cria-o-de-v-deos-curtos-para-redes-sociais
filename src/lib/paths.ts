import path from "node:path";

const configuredStorageRoot = process.env.LOCAL_STORAGE_ROOT?.trim();
export const storageRoot = configuredStorageRoot || "storage";
export const resolvedStorageRoot = path.resolve(/*turbopackIgnore: true*/ storageRoot);

export const uploadRoot = path.join(/*turbopackIgnore: true*/ storageRoot, "uploads");
export const generatedRoot = path.join(/*turbopackIgnore: true*/ storageRoot, "generated");

export function toPublicFileUrl(filePath: string) {
  const resolvedPath = path.resolve(filePath);
  const relativePath = path
    .relative(resolvedStorageRoot, resolvedPath)
    .split(path.sep)
    .join("/");

  if (
    !relativePath ||
    relativePath.startsWith("..") ||
    path.isAbsolute(relativePath) ||
    relativePath.includes("../")
  ) {
    throw new Error("Arquivo fora do storage publico configurado.");
  }

  return `/api/files/${relativePath}`;
}
