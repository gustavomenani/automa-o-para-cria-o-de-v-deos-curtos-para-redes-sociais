import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  ASS_SUBTITLE_STYLE,
  CAPTION_SYNC_WARNING,
  SAFE_VIDEO_GENERATION_ERROR,
  createFallbackCaptionCues,
  createTranscribedCaptionCues,
  escapeAssText,
  formatAssTime,
  type CaptionQuality,
  type CaptionCue,
} from "@/features/video/services/caption-helpers";
import {
  transcriptionService,
  type TranscriptionSegment,
} from "@/features/video/services/transcription-service";
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

export const GENERATION_LOCKED_MESSAGE =
  "Ja existe uma geracao em andamento para este projeto. Aguarde a conclusao antes de tentar novamente.";

export class GenerationLockedError extends Error {
  constructor() {
    super(GENERATION_LOCKED_MESSAGE);
    this.name = "GenerationLockedError";
  }
}

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

function escapeFilterPath(filePath: string) {
  return filePath
    .replace(/\\/g, "/")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'")
    .replace(/,/g, "\\,")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]");
}

function toSafeGenerationError(error: unknown) {
  console.error("Video generation failed", error);
  return SAFE_VIDEO_GENERATION_ERROR;
}

export async function acquireGenerationLock(projectId: string) {
  const result = await prisma.contentProject.updateMany({
    where: {
      id: projectId,
      status: { not: "PROCESSING" },
    },
    data: {
      status: "PROCESSING",
      errorMessage: null,
    },
  });

  if (result.count === 0) {
    throw new GenerationLockedError();
  }
}

async function createAssSubtitleFile(cues: CaptionCue[], outputPath: string) {
  const events = cues
    .map((cue) => {
      if (cue.end <= cue.start) {
        return null;
      }

      return `Dialogue: 0,${formatAssTime(cue.start)},${formatAssTime(
        cue.end,
      )},Premium,,0,0,0,,${escapeAssText(cue.text)}`;
    })
    .filter(Boolean)
    .join("\n");

  const ass = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Premium,${ASS_SUBTITLE_STYLE.fontName},${ASS_SUBTITLE_STYLE.fontSize},&H00FFFFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,${ASS_SUBTITLE_STYLE.outline},${ASS_SUBTITLE_STYLE.shadow},2,${ASS_SUBTITLE_STYLE.marginL},${ASS_SUBTITLE_STYLE.marginR},${ASS_SUBTITLE_STYLE.marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${events}
`;

  await fs.writeFile(outputPath, ass, "utf8");
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

    let generatedVideoId: string | null = null;

    if (imagePaths.length === 0) {
      throw new Error("Projeto precisa de pelo menos uma imagem.");
    }

    if (!audioPath) {
      throw new Error("Projeto precisa de um arquivo de audio.");
    }

    await acquireGenerationLock(project.id);

    try {
      const audioDuration = await this.getAudioDuration(audioPath);
      const transcriptionSegments = await transcriptionService.transcribe(audioPath);
      const generatedVideo = await prisma.generatedVideo.create({
        data: {
          projectId: project.id,
          path: "",
          duration: Math.round(audioDuration),
          resolution: "1080x1920",
          status: "PROCESSING",
        },
      });
      generatedVideoId = generatedVideo.id;
      const output = await getGeneratedVideoPath(project.id, generatedVideo.id);

      const captionText =
        options?.captionText ??
        (await this.getProjectCaptionText(project.id)) ??
        project.caption ??
        project.prompt;

      const result = await this.generateVerticalMp4({
        images: imagePaths,
        audio: audioPath,
        captionText,
        output,
        audioDuration,
        transcriptionSegments,
      });
      const captionWarning = result.captionQuality.warning ?? null;

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
            errorMessage: captionWarning,
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
      const message = this.isUserRecoverableInputError(error)
        ? (error as Error).message
        : toSafeGenerationError(error);

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

  private isUserRecoverableInputError(error: unknown) {
    if (!(error instanceof Error)) {
      return false;
    }

    return [
      "Projeto nao encontrado.",
      "Projeto precisa de pelo menos uma imagem.",
      "Projeto precisa de um arquivo de audio.",
    ].includes(error.message);
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

  private async getProjectCaptionText(projectId: string) {
    const planPath = path.join(process.cwd(), "storage", "uploads", projectId, "manus-plan.json");

    try {
      const plan = JSON.parse(await fs.readFile(planPath, "utf8")) as {
        script?: unknown;
      };

      return typeof plan.script === "string" && plan.script.trim()
        ? plan.script
        : null;
    } catch {
      return null;
    }
  }

  private async generateVerticalMp4(
    input: GenerateVerticalMp4Input & { transcriptionSegments: TranscriptionSegment[] | null },
  ): Promise<{ captionQuality: CaptionQuality }> {
    await fs.mkdir(path.dirname(input.output), { recursive: true });

    const imageDuration = Math.max(input.audioDuration / input.images.length, 0.1);
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "short-video-"));

    try {
      const captionResult =
        input.transcriptionSegments && input.transcriptionSegments.length > 0
          ? createTranscribedCaptionCues(
              input.transcriptionSegments,
              input.captionText,
              input.audioDuration,
            )
          : {
              cues: createFallbackCaptionCues(input.captionText, input.audioDuration),
              quality: { score: 0.65, warning: CAPTION_SYNC_WARNING },
            };
      const cues = captionResult.cues;
      const captionFile = cues.length > 0 ? path.join(tempDir, "caption.ass") : null;

      if (captionFile) {
        await createAssSubtitleFile(cues, captionFile);
      }

      const imageInputArgs = input.images.flatMap((imagePath) => [
        "-loop",
        "1",
        "-t",
        imageDuration.toFixed(6),
        "-i",
        imagePath,
      ]);
      const imageFilters = input.images.map(
        (_, index) =>
          `[${index}:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,format=yuv420p[v${index}]`,
      );
      const concatInputs = input.images.map((_, index) => `[v${index}]`).join("");
      const baseFilter = `${concatInputs}concat=n=${input.images.length}:v=1:a=0,trim=duration=${input.audioDuration.toFixed(3)},setpts=PTS-STARTPTS[basev]`;
      const outputFilter = [
        captionFile
          ? `[basev]ass='${escapeFilterPath(captionFile)}',format=yuv420p[outv]`
          : "[basev]format=yuv420p[outv]",
      ];
      const filterComplex = [...imageFilters, baseFilter, ...outputFilter].join(";");

      await runProcess(getFfmpegPath(), [
        "-y",
        ...imageInputArgs,
        "-i",
        input.audio,
        "-filter_complex",
        filterComplex,
        "-map",
        "[outv]",
        "-map",
        `${input.images.length}:a:0`,
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

      return { captionQuality: captionResult.quality };
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }
}

export const videoService = new VideoService();
