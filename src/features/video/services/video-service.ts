import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { getGeneratedVideoPath } from "@/lib/storage/local-storage";

type GenerateVerticalMp4Input = {
  images: string[];
  audio: string;
  captionText: string;
  output: string;
  audioDuration: number;
};

type ProcessResult = {
  stdout: string;
  stderr: string;
};

function getFfmpegPath() {
  return process.env.FFMPEG_PATH || "ffmpeg";
}

function getFfprobePath() {
  if (process.env.FFPROBE_PATH) {
    return process.env.FFPROBE_PATH;
  }

  const ffmpegPath = process.env.FFMPEG_PATH;

  if (
    ffmpegPath &&
    (ffmpegPath.includes("/") || ffmpegPath.includes("\\")) &&
    path.basename(ffmpegPath).toLowerCase().startsWith("ffmpeg")
  ) {
    return path.join(path.dirname(ffmpegPath), "ffprobe.exe");
  }

  return "ffprobe";
}

function runProcess(command: string, args: string[]) {
  return new Promise<ProcessResult>((resolve, reject) => {
    const child = spawn(command, args, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

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
          `${command} nao foi encontrado ou nao conseguiu iniciar. Configure FFMPEG_PATH/FFPROBE_PATH. Detalhe: ${error.message}`,
        ),
      );
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(new Error(stderr || `${command} finalizou com codigo ${code}.`));
    });
  });
}

function escapeConcatPath(filePath: string) {
  return filePath.replace(/\\/g, "/").replace(/'/g, "'\\''");
}

function escapeFilterPath(filePath: string) {
  return filePath
    .replace(/\\/g, "/")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'")
    .replace(/,/g, "\\,")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]");
}

function splitLongWord(word: string, maxLength: number) {
  const chunks: string[] = [];

  for (let index = 0; index < word.length; index += maxLength) {
    chunks.push(word.slice(index, index + maxLength));
  }

  return chunks;
}

function wrapCaptionText(text: string, maxLineLength = 30, maxLines = 4) {
  const words = text
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .flatMap((word) =>
      word.length > maxLineLength ? splitLongWord(word, maxLineLength) : word,
    )
    .filter(Boolean);

  const lines: string[] = [];

  for (const word of words) {
    const currentLine = lines.at(-1);

    if (!currentLine) {
      lines.push(word);
      continue;
    }

    if (`${currentLine} ${word}`.length <= maxLineLength) {
      lines[lines.length - 1] = `${currentLine} ${word}`;
      continue;
    }

    lines.push(word);
  }

  if (lines.length <= maxLines) {
    return lines.join("\n");
  }

  const visibleLines = lines.slice(0, maxLines);
  visibleLines[maxLines - 1] = `${visibleLines[maxLines - 1].replace(/\.+$/, "")}...`;

  return visibleLines.join("\n");
}

export class VideoService {
  async generateProjectVideo(projectId: string, options?: { captionText?: string }) {
    const project = await prisma.contentProject.findUnique({
      where: { id: projectId },
      include: { mediaFiles: true },
    });

    if (!project) {
      throw new Error("Projeto nao encontrado.");
    }

    const imagePaths = project.mediaFiles
      .filter((file) => file.type === "IMAGE")
      .map((file) => file.path);
    const audioPath = project.mediaFiles.find((file) => file.type === "AUDIO")?.path;

    const output = await getGeneratedVideoPath(project.id);
    let generatedVideoId: string | null = null;

    try {
      if (imagePaths.length === 0) {
        throw new Error("Projeto precisa de pelo menos uma imagem.");
      }

      if (!audioPath) {
        throw new Error("Projeto precisa de um arquivo de audio.");
      }

      await prisma.contentProject.update({
        where: { id: project.id },
        data: { status: "PROCESSING", errorMessage: null },
      });

      const audioDuration = await this.getAudioDuration(audioPath);
      const generatedVideo = await prisma.generatedVideo.create({
        data: {
          projectId: project.id,
          path: output,
          duration: Math.round(audioDuration),
          resolution: "1080x1920",
          status: "PROCESSING",
        },
      });
      generatedVideoId = generatedVideo.id;

      await this.generateVerticalMp4({
        images: imagePaths,
        audio: audioPath,
        captionText: options?.captionText ?? project.caption ?? project.prompt,
        output,
        audioDuration,
      });

      await prisma.$transaction([
        prisma.generatedVideo.update({
          where: { id: generatedVideo.id },
          data: {
            duration: Math.round(audioDuration),
            resolution: "1080x1920",
            status: "READY",
            path: output,
          },
        }),
        prisma.contentProject.update({
          where: { id: project.id },
          data: {
            status: "READY",
            errorMessage: null,
          },
        }),
      ]);

      return {
        projectId: project.id,
        generatedVideoId: generatedVideo.id,
        path: output,
        duration: Math.round(audioDuration),
        resolution: "1080x1920",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao gerar video.";

      await prisma.contentProject.update({
        where: { id: project.id },
        data: {
          status: "ERROR",
          errorMessage: message,
        },
      });

      if (generatedVideoId) {
        await prisma.generatedVideo.update({
          where: { id: generatedVideoId },
          data: { status: "ERROR" },
        });
      }

      throw new Error(message);
    }
  }

  private async getAudioDuration(audioPath: string) {
    const result = await runProcess(getFfprobePath(), [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      audioPath,
    ]);

    const duration = Number.parseFloat(result.stdout.trim());

    if (!Number.isFinite(duration) || duration <= 0) {
      throw new Error("Nao foi possivel calcular a duracao do audio.");
    }

    return duration;
  }

  private async generateVerticalMp4(input: GenerateVerticalMp4Input) {
    await fs.mkdir(path.dirname(input.output), { recursive: true });

    const imageDuration = Math.max(input.audioDuration / input.images.length, 0.1);
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "short-video-"));
    const concatFile = path.join(tempDir, "images.txt");

    try {
      const concatBody = input.images
        .flatMap((imagePath) => [
          `file '${escapeConcatPath(imagePath)}'`,
          `duration ${imageDuration.toFixed(6)}`,
        ])
        .concat(`file '${escapeConcatPath(input.images.at(-1) ?? input.images[0])}'`)
        .join("\n");

      await fs.writeFile(concatFile, concatBody);

      const caption = wrapCaptionText(input.captionText);
      const captionFile = caption ? path.join(tempDir, "caption.txt") : null;

      if (captionFile) {
        await fs.writeFile(captionFile, caption, "utf8");
      }

      const videoFilter = [
        "scale=1080:1920:force_original_aspect_ratio=increase",
        "crop=1080:1920",
        "setsar=1",
        captionFile
          ? `drawtext=textfile='${escapeFilterPath(captionFile)}':x=(w-text_w)/2:y=h-text_h-260:fontsize=58:fontcolor=white:line_spacing=12:box=1:boxcolor=black@0.55:boxborderw=30`
          : null,
        "format=yuv420p",
      ]
        .filter(Boolean)
        .join(",");

      await runProcess(getFfmpegPath(), [
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
        "-t",
        input.audioDuration.toFixed(3),
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
        "-movflags",
        "+faststart",
        input.output,
      ]);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }
}

export const videoService = new VideoService();
