import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
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

type CaptionTiming = {
  start: number;
  end: number;
};

type CaptionCue = CaptionTiming & {
  text: string;
};

const ASS_SUBTITLE_STYLE = {
  fontName: "Arial",
  fontSize: 62,
  marginL: 70,
  marginR: 70,
  marginV: 260,
  outline: 3,
  shadow: 1,
};
const MAX_SUBTITLE_LINE_LENGTH = 22;
const MAX_SUBTITLE_SEGMENT_LENGTH = 46;

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

function normalizeCaptionText(text: string) {
  return text
    .normalize("NFKC")
    .replace(/[\u{1F000}-\u{1FAFF}]/gu, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[“”„‟"']/g, "")
    .replace(/[‘’‚‛]/g, "")
    .replace(/\(\s*\)/g, "")
    .replace(/\(\s*([,.;:!?-]+)\s*\)/g, "$1")
    .replace(/\\(?!N)/g, "")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function extractSpokenCaptionText(text: string) {
  const spokenLines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .map((line) => line.replace(/^\([^)]*\)\s*/, ""))
    .filter((line) => /^VOZ\s*OFF\s*:/i.test(line))
    .map((line) => line.replace(/^VOZ\s*OFF\s*:\s*/i, "").trim())
    .filter(Boolean);

  if (spokenLines.length > 0) {
    return spokenLines.join(" ");
  }

  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => !/^CENA\s*\d+\s*:/i.test(line))
    .filter((line) => !/^TEXTO\s+NA\s+TELA\s*:/i.test(line))
    .filter((line) => !/^\([^)]*\)$/.test(line))
    .join(" ");
}

function splitCaptionIntoSegments(text: string) {
  const normalized = normalizeCaptionText(extractSpokenCaptionText(text));

  if (!normalized) {
    return [];
  }

  const source = normalized
    .split(/(?<=[.!?;:])\s+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
  const segments: string[] = [];

  for (const sentence of source.length > 0 ? source : [normalized]) {
    const words = sentence.split(" ").filter(Boolean);
    let currentLine = "";
    let currentLines: string[] = [];

    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;

      if (candidate.length <= MAX_SUBTITLE_LINE_LENGTH) {
        currentLine = candidate;
        continue;
      }

      if (currentLine) {
        currentLines.push(currentLine);
      }

      if (currentLines.length === 2) {
        segments.push(currentLines.join("\\N"));
        currentLines = [];
      }

      currentLine = word;
    }

    if (currentLine) {
      currentLines.push(currentLine);
    }

    if (currentLines.length > 0) {
      segments.push(currentLines.join("\\N"));
    }
  }

  return segments;
}

function rebalanceSegmentLines(segment: string) {
  const words = segment.replace(/\\N/g, " ").split(" ").filter(Boolean);

  if (words.length <= 4 && words.join(" ").length <= MAX_SUBTITLE_LINE_LENGTH) {
    return words.join(" ");
  }

  const firstLine: string[] = [];
  const secondLine: string[] = [];

  for (const word of words) {
    const candidate = [...firstLine, word].join(" ");

    if (
      candidate.length <= MAX_SUBTITLE_LINE_LENGTH &&
      firstLine.length < Math.ceil(words.length / 2)
    ) {
      firstLine.push(word);
      continue;
    }

    secondLine.push(word);
  }

  if (secondLine.length < 2 && firstLine.length > 2) {
    secondLine.unshift(firstLine.pop() as string);
  }

  return secondLine.length > 0 ? `${firstLine.join(" ")}\\N${secondLine.join(" ")}` : firstLine.join(" ");
}

function mergeOrphanSegments(segments: string[]) {
  const merged: string[] = [];

  for (const segment of segments) {
    const plainSegment = segment.replace(/\\N/g, " ").trim();
    const wordCount = plainSegment.split(" ").filter(Boolean).length;
    const previous = merged.at(-1);

    if (wordCount < 3 && previous) {
      const previousPlain = previous.replace(/\\N/g, " ").trim();
      const previousWords = previousPlain.split(" ").filter(Boolean);

      if (
        previousWords.length <= 8 &&
        `${previousPlain} ${plainSegment}`.length <= MAX_SUBTITLE_SEGMENT_LENGTH
      ) {
        merged[merged.length - 1] = `${previousPlain} ${plainSegment}`;
        continue;
      }
    }

    merged.push(plainSegment);
  }

  for (let index = 0; index < merged.length - 1; index += 1) {
    const currentWords = merged[index].split(" ").filter(Boolean);
    const nextWords = merged[index + 1].split(" ").filter(Boolean);

    if (
      nextWords.length < 3 &&
      `${merged[index]} ${merged[index + 1]}`.length <= MAX_SUBTITLE_SEGMENT_LENGTH
    ) {
      merged[index] = `${merged[index]} ${merged[index + 1]}`;
      merged.splice(index + 1, 1);
      index -= 1;
    } else if (
      currentWords.length < 3 &&
      `${merged[index]} ${merged[index + 1]}`.length <= MAX_SUBTITLE_SEGMENT_LENGTH
    ) {
      merged[index + 1] = `${merged[index]} ${merged[index + 1]}`;
      merged.splice(index, 1);
      index -= 1;
    }
  }

  return merged.map(rebalanceSegmentLines);
}

function formatAssTime(seconds: number) {
  const safeSeconds = Math.max(seconds, 0);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const wholeSeconds = Math.floor(safeSeconds % 60);
  const centiseconds = Math.floor((safeSeconds - Math.floor(safeSeconds)) * 100);

  return `${hours}:${String(minutes).padStart(2, "0")}:${String(wholeSeconds).padStart(
    2,
    "0",
  )}.${String(centiseconds).padStart(2, "0")}`;
}

function calculateCaptionTimings(segments: string[], audioDuration: number): CaptionTiming[] {
  if (segments.length === 0) {
    return [];
  }

  const cleanLengths = segments.map((segment) => segment.replace(/\\N/g, " ").length);
  const totalWeight = cleanLengths.reduce((sum, length) => sum + Math.max(length, 18), 0);
  const minimumDuration = Math.min(1.35, audioDuration / segments.length);
  const gap = segments.length > 1 ? 0.08 : 0;
  const usableDuration = Math.max(audioDuration - gap * (segments.length - 1), 0.1);
  let cursor = 0;

  return segments.map((segment, index) => {
    const isLast = index === segments.length - 1;
    const proportionalDuration =
      (usableDuration * Math.max(segment.replace(/\\N/g, " ").length, 18)) / totalWeight;
    const remainingSegments = segments.length - index - 1;
    const maxEndForCurrent = audioDuration - remainingSegments * (minimumDuration + gap);
    const start = Math.min(cursor, audioDuration);
    const end = isLast
      ? audioDuration
      : Math.min(
          Math.max(start + Math.max(proportionalDuration, minimumDuration), start + 0.75),
          maxEndForCurrent,
        );

    cursor = end + gap;

    return {
      start,
      end: Math.min(end, audioDuration),
    };
  });
}

function createFallbackCaptionCues(text: string, audioDuration: number): CaptionCue[] {
  const segments = mergeOrphanSegments(splitCaptionIntoSegments(text));
  const timings = calculateCaptionTimings(segments, audioDuration);

  return segments.flatMap((segment, index) => {
    const timing = timings[index];

    if (!timing) {
      return [];
    }

    return {
      text: segment,
      start: timing.start,
      end: timing.end,
    };
  });
}

function createTranscribedCaptionCues(
  transcriptionSegments: TranscriptionSegment[],
  audioDuration: number,
): CaptionCue[] {
  return transcriptionSegments.flatMap((transcriptionSegment) => {
    const segmentDuration = Math.max(transcriptionSegment.end - transcriptionSegment.start, 0.1);
    const subtitleSegments = mergeOrphanSegments(splitCaptionIntoSegments(transcriptionSegment.text));
    const timings = calculateCaptionTimings(subtitleSegments, segmentDuration);

    return subtitleSegments.flatMap((subtitleSegment, index) => {
      const timing = timings[index];

      if (!timing) {
        return [];
      }

      return {
        text: subtitleSegment,
        start: Math.min(transcriptionSegment.start + timing.start, audioDuration),
        end: Math.min(transcriptionSegment.start + timing.end, audioDuration),
      };
    });
  });
}

function escapeAssText(text: string) {
  return text
    .replace(/\\(?!N)/g, "")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/\r?\n/g, "\\N");
}

async function createAssSubtitleFile(
  cues: CaptionCue[],
  outputPath: string,
) {
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
      const transcriptionSegments = await transcriptionService.transcribe(audioPath);
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

      const captionText = options?.captionText ?? (await this.getProjectCaptionText(project.id)) ?? project.caption ?? project.prompt;

      await this.generateVerticalMp4({
        images: imagePaths,
        audio: audioPath,
        captionText,
        output,
        audioDuration,
        transcriptionSegments,
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

  private async getProjectCaptionText(projectId: string) {
    const planPath = path.join(process.cwd(), "storage", "uploads", projectId, "gemini-plan.json");

    try {
      const plan = JSON.parse(await fs.readFile(planPath, "utf8")) as {
        reelsScript?: unknown;
      };

      return typeof plan.reelsScript === "string" && plan.reelsScript.trim()
        ? plan.reelsScript
        : null;
    } catch {
      return null;
    }
  }

  private async generateVerticalMp4(
    input: GenerateVerticalMp4Input & { transcriptionSegments: TranscriptionSegment[] | null },
  ) {
    await fs.mkdir(path.dirname(input.output), { recursive: true });

    const imageDuration = Math.max(input.audioDuration / input.images.length, 0.1);
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "short-video-"));

    try {
      const cues =
        input.transcriptionSegments && input.transcriptionSegments.length > 0
          ? createTranscribedCaptionCues(input.transcriptionSegments, input.audioDuration)
          : createFallbackCaptionCues(input.captionText, input.audioDuration);
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
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }
}

export const videoService = new VideoService();
