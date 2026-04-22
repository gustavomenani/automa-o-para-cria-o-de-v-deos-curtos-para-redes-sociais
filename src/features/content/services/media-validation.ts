import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { ProjectFilesInput } from "@/features/content/services/upload-service";

export const MEDIA_LIMITS = {
  maxImages: 10,
  maxAudioFiles: 1,
  maxFileBytes: 25 * 1024 * 1024,
  maxTotalBytes: 80 * 1024 * 1024,
  maxAudioSeconds: 180,
};

export type MediaValidationCategory =
  | "imagem"
  | "audio"
  | "tamanho"
  | "quantidade"
  | "duracao"
  | "formato";

export class MediaValidationError extends Error {
  constructor(
    message: string,
    readonly category: MediaValidationCategory,
  ) {
    super(message);
    this.name = "MediaValidationError";
  }
}

export type MediaSignature = {
  kind: "image" | "audio";
  mimeType: string;
  extension: string;
};

export type AudioDurationProbe = (file: File) => Promise<number>;

function hasPrefix(bytes: Uint8Array, prefix: number[]) {
  return prefix.every((value, index) => bytes[index] === value);
}

function ascii(bytes: Uint8Array, start: number, length: number) {
  return Buffer.from(bytes.subarray(start, start + length)).toString("ascii");
}

export function detectMediaSignature(bytes: Uint8Array): MediaSignature | null {
  if (hasPrefix(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { kind: "image", mimeType: "image/png", extension: "png" };
  }

  if (hasPrefix(bytes, [0xff, 0xd8, 0xff])) {
    return { kind: "image", mimeType: "image/jpeg", extension: "jpg" };
  }

  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") {
    return { kind: "image", mimeType: "image/webp", extension: "webp" };
  }

  if (ascii(bytes, 0, 3) === "ID3" || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)) {
    return { kind: "audio", mimeType: "audio/mpeg", extension: "mp3" };
  }

  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WAVE") {
    return { kind: "audio", mimeType: "audio/wav", extension: "wav" };
  }

  if (ascii(bytes, 4, 4) === "ftyp") {
    return { kind: "audio", mimeType: "audio/mp4", extension: "m4a" };
  }

  return null;
}

function reject(message: string, category: MediaValidationCategory): never {
  throw new MediaValidationError(message, category);
}

function validateCounts(files: ProjectFilesInput, requireAudio: boolean) {
  if (files.images.length === 0 && !files.audio) {
    reject("Envie pelo menos uma imagem ou um audio.", "quantidade");
  }

  if (files.images.length > MEDIA_LIMITS.maxImages) {
    reject("Arquivo recusado. Reduza a quantidade de imagens.", "quantidade");
  }

  if (requireAudio && !files.audio) {
    reject("Envie um arquivo de audio.", "audio");
  }
}

async function fileBytes(file: File) {
  return new Uint8Array(await file.arrayBuffer());
}

function checkSize(file: File, total: number) {
  if (file.size > MEDIA_LIMITS.maxFileBytes) {
    reject("Arquivo recusado. Verifique formato, tamanho e quantidade antes de tentar novamente.", "tamanho");
  }

  if (total > MEDIA_LIMITS.maxTotalBytes) {
    reject("Arquivo recusado. Verifique formato, tamanho e quantidade antes de tentar novamente.", "tamanho");
  }
}

async function defaultAudioDurationProbe(file: File) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "media-probe-"));
  const tempFile = path.join(tempDir, file.name || "audio.bin");

  try {
    await fs.writeFile(tempFile, Buffer.from(await file.arrayBuffer()));

    return await new Promise<number>((resolve, rejectPromise) => {
      const child = spawn(process.env.FFPROBE_PATH || "ffprobe", [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        tempFile,
      ]);
      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
      child.on("error", rejectPromise);
      child.on("close", (code) => {
        if (code !== 0) {
          rejectPromise(new Error(stderr || "ffprobe falhou."));
          return;
        }

        resolve(Number.parseFloat(stdout.trim()));
      });
    });
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

export async function validateMediaFiles(
  files: ProjectFilesInput,
  options: { requireAudio?: boolean; probeAudioDuration?: AudioDurationProbe } = {},
) {
  const requireAudio = options.requireAudio ?? true;
  const probeAudioDuration = options.probeAudioDuration ?? defaultAudioDurationProbe;
  const allFiles = [...files.images, ...(files.audio ? [files.audio] : [])];
  const total = allFiles.reduce((sum, file) => sum + file.size, 0);

  validateCounts(files, requireAudio);

  for (const file of allFiles) {
    checkSize(file, total);
  }

  for (const image of files.images) {
    const signature = detectMediaSignature(await fileBytes(image));

    if (!signature || signature.kind !== "image" || signature.mimeType !== image.type) {
      reject("Arquivo recusado. Verifique formato, tamanho e quantidade antes de tentar novamente.", "formato");
    }
  }

  if (files.audio) {
    const signature = detectMediaSignature(await fileBytes(files.audio));
    const acceptedAudioTypes = new Set(["audio/mpeg", "audio/wav", "audio/mp4", "audio/x-m4a"]);

    if (!signature || signature.kind !== "audio" || !acceptedAudioTypes.has(files.audio.type)) {
      reject("Arquivo recusado. Verifique formato, tamanho e quantidade antes de tentar novamente.", "formato");
    }

    const duration = await probeAudioDuration(files.audio);

    if (!Number.isFinite(duration) || duration <= 0 || duration > MEDIA_LIMITS.maxAudioSeconds) {
      reject("Arquivo recusado. O audio excede a duracao permitida.", "duracao");
    }
  }
}
