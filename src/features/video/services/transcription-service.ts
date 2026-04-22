import { spawn } from "node:child_process";
import path from "node:path";

export type TranscriptionSegment = {
  start: number;
  end: number;
  text: string;
  words?: TranscriptionWord[];
};

export type TranscriptionWord = {
  word: string;
  start: number;
  end: number;
  confidence?: number | null;
};

type TranscriptionResponse = {
  ok?: boolean;
  error?: string;
  segments?: TranscriptionSegment[];
};

type ProcessResult = {
  stdout: string;
  stderr: string;
};

function runProcess(command: string, args: string[], timeoutMs: number) {
  return new Promise<ProcessResult>((resolve, reject) => {
    const child = spawn(command, args, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        PYTHONIOENCODING: "utf-8",
      },
    });
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error("Transcricao local excedeu o tempo limite."));
    }, timeoutMs);
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    child.on("close", (code) => {
      clearTimeout(timeout);

      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(new Error(stderr || `Transcricao finalizou com codigo ${code}.`));
    });
  });
}

export class TranscriptionService {
  async transcribe(audioPath: string): Promise<TranscriptionSegment[] | null> {
    const pythonPath = process.env.WHISPER_PYTHON_PATH || "python";
    const scriptPath = path.join(process.cwd(), "scripts", "transcribe_audio.py");
    const model = process.env.WHISPER_MODEL || "base";
    const language = process.env.WHISPER_LANGUAGE || "pt";
    const device = process.env.WHISPER_DEVICE || "cpu";
    const computeType = process.env.WHISPER_COMPUTE_TYPE || "int8";
    const timeoutMs = Number(process.env.WHISPER_TIMEOUT_MS || 240000);

    try {
      const result = await runProcess(
        pythonPath,
        [
          scriptPath,
          "--audio",
          audioPath,
          "--model",
          model,
          "--language",
          language,
          "--device",
          device,
          "--compute-type",
          computeType,
        ],
        timeoutMs,
      );
      const payload = JSON.parse(result.stdout.trim()) as TranscriptionResponse;

      if (!payload.ok || !Array.isArray(payload.segments)) {
        return null;
      }

      return payload.segments
        .filter(
          (segment) =>
            Number.isFinite(segment.start) &&
            Number.isFinite(segment.end) &&
            segment.end > segment.start &&
            segment.text.trim(),
        )
        .map((segment) => ({
          start: segment.start,
          end: segment.end,
          text: segment.text.trim(),
          words: segment.words
            ?.filter(
              (word) =>
                word.word.trim() &&
                Number.isFinite(word.start) &&
                Number.isFinite(word.end) &&
                word.end > word.start,
            )
            .map((word) => ({
              word: word.word.trim(),
              start: word.start,
              end: word.end,
              confidence:
                typeof word.confidence === "number" && Number.isFinite(word.confidence)
                  ? word.confidence
                  : null,
            })),
        }));
    } catch {
      return null;
    }
  }
}

export const transcriptionService = new TranscriptionService();
