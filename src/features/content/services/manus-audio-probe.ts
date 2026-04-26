import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export async function probeAudioDurationFromBuffer(buffer: Buffer, fileName: string) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "manus-audio-probe-"));
  const tempFile = path.join(tempDir, fileName || "manus-audio.bin");

  try {
    await fs.writeFile(tempFile, buffer);

    const ffprobePath = process.env.FFPROBE_PATH || "ffprobe";
    const duration = await new Promise<number>((resolve, reject) => {
      const child = spawn(ffprobePath, [
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

      child.on("error", (error) => {
        reject(
          new Error(
            `FFPROBE_PATH nao encontrado ou nao conseguiu iniciar. Detalhe: ${error.message}`,
          ),
        );
      });

      child.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(stderr || `ffprobe finalizou com codigo ${code}.`));
          return;
        }

        const parsed = Number.parseFloat(stdout.trim());

        if (!Number.isFinite(parsed) || parsed <= 0) {
          reject(new Error("Nao foi possivel calcular a duracao do audio retornado pela Manus."));
          return;
        }

        resolve(parsed);
      });
    });

    return duration;
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}
