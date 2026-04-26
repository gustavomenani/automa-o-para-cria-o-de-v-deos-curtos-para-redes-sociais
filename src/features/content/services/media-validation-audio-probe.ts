import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { resolvedStorageRoot } from "@/lib/paths";

export async function defaultAudioDurationProbe(file: File) {
  const probeRoot = path.join(/*turbopackIgnore: true*/ resolvedStorageRoot, "tmp-probes");
  await fs.mkdir(probeRoot, { recursive: true });
  const tempDir = await fs.mkdtemp(path.join(probeRoot, "media-probe-"));
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
