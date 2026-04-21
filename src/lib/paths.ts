import path from "node:path";

export const storageRoot = path.resolve(
  /* turbopackIgnore: true */ process.cwd(),
  process.env.LOCAL_STORAGE_ROOT ?? "storage",
);

export const uploadRoot = path.join(storageRoot, "uploads");
export const generatedRoot = path.join(storageRoot, "generated");

export function toPublicFileUrl(filePath: string) {
  const relativePath = path.relative(storageRoot, filePath).split(path.sep).join("/");
  return `/api/files/${relativePath}`;
}
