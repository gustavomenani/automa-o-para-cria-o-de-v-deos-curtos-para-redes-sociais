import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export type GenerateVerticalVideoInput = {
  images: string[];
  audio: string;
  caption: string;
  output: string;
};

function runFfmpeg(args: string[]) {
  const ffmpegPath = process.env.FFMPEG_PATH ?? "ffmpeg";

  return new Promise<void>((resolve, reject) => {
    const child = spawn(ffmpegPath, args, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(stderr || `FFmpeg exited with code ${code}`));
    });
  });
}

function escapeDrawText(text: string) {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .replace(/\n/g, " ");
}

export async function generateVerticalVideo(input: GenerateVerticalVideoInput) {
  if (input.images.length === 0) {
    throw new Error("At least one image is required to generate a video.");
  }

  await fs.mkdir(path.dirname(input.output), { recursive: true });

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "short-video-"));
  const concatFile = path.join(tempDir, "images.txt");
  const secondsPerImage = 4;

  try {
    const concatBody = input.images
      .flatMap((imagePath) => [
        `file '${imagePath.replace(/'/g, "'\\''")}'`,
        `duration ${secondsPerImage}`,
      ])
      .concat(`file '${input.images.at(-1)?.replace(/'/g, "'\\''")}'`)
      .join("\n");

    await fs.writeFile(concatFile, concatBody);

    const caption = escapeDrawText(input.caption.trim());
    const videoFilter = [
      "scale=1080:1920:force_original_aspect_ratio=increase",
      "crop=1080:1920",
      "setsar=1",
      caption
        ? `drawtext=text='${caption}':x=(w-text_w)/2:y=h-360:fontsize=64:fontcolor=white:borderw=4:bordercolor=black@0.65:box=1:boxcolor=black@0.28:boxborderw=28`
        : null,
      "format=yuv420p",
    ]
      .filter(Boolean)
      .join(",");

    await runFfmpeg([
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      concatFile,
      "-i",
      input.audio,
      "-vf",
      videoFilter,
      "-map",
      "0:v:0",
      "-map",
      "1:a:0",
      "-r",
      "30",
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "23",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-shortest",
      "-movflags",
      "+faststart",
      input.output,
    ]);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}
