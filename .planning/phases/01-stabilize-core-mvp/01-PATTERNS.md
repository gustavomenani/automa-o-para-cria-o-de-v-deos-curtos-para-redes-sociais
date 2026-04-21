# Phase 1: Stabilize Core MVP - Pattern Map

**Mapped:** 2026-04-21
**Files analyzed:** 15
**Analogs found:** 14 / 15

## Scope Inputs

- Required docs read: `.planning/phases/01-stabilize-core-mvp/01-CONTEXT.md`, `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`, `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/CONCERNS.md`, `.planning/codebase/TESTING.md`, `README.md`.
- Required implementation files read: `src/features/video/services/video-service.ts`, `src/features/video/services/transcription-service.ts`, `scripts/transcribe_audio.py`, `src/features/content/actions.ts`, `src/app/contents/[id]/page.tsx`.
- Extra analogs read: `src/features/content/services/upload-service.ts`, `src/features/schedule/actions.ts`, `src/features/schedule/queries.ts`, `src/app/schedule/page.tsx`, `src/lib/storage/local-storage.ts`, `src/lib/paths.ts`, API routes, feedback/button components, `package.json`, `.planning/codebase/CONVENTIONS.md`, `.planning/codebase/INTEGRATIONS.md`.
- Project instructions: `CLAUDE.md` contains `@AGENTS.md`; `AGENTS.md` requires reading relevant `node_modules/next/dist/docs/` before writing Next.js framework code. This pattern pass writes docs only, but implementation agents changing App Router/server-action/API code must follow that instruction.
- Project skills: no `.claude/skills/` or `.agents/skills/` directory found in this repo.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/features/video/services/video-service.ts` | service | file-I/O + subprocess + transform + CRUD status | `src/features/video/services/video-service.ts` | exact-existing |
| `src/features/video/services/caption-helpers.ts` | utility | transform | private caption helpers in `src/features/video/services/video-service.ts` | exact-extract |
| `src/features/video/services/caption-helpers.test.ts` | test | transform | no in-repo tests; use `.planning/codebase/TESTING.md` recommended shape | no-analog |
| `src/features/video/services/transcription-service.ts` | service | subprocess request-response | `src/features/video/services/transcription-service.ts` | exact-existing |
| `scripts/transcribe_audio.py` | utility | subprocess JSON transform | `scripts/transcribe_audio.py` | exact-existing |
| `src/features/content/actions.ts` | server action | request-response + redirects + CRUD orchestration | `src/features/content/actions.ts` | exact-existing |
| `src/app/contents/[id]/page.tsx` | page/component | request-response UI review | `src/app/contents/[id]/page.tsx` | exact-existing |
| `src/components/feedback-banner.tsx` | component | request-response UI feedback | `src/components/feedback-banner.tsx` | exact-existing |
| `src/features/content/services/upload-service.ts` | service | file-I/O + CRUD | `src/features/content/services/upload-service.ts` | exact-existing |
| `src/lib/storage/local-storage.ts` | utility | file-I/O | `src/lib/storage/local-storage.ts` | exact-existing |
| `src/lib/paths.ts` | utility | path transform | `src/lib/paths.ts` | exact-existing |
| `src/app/api/files/[...path]/route.ts` | route | file-I/O request-response | `src/app/api/files/[...path]/route.ts` | exact-existing |
| `src/features/schedule/actions.ts` | server action | CRUD + request-response | `src/features/schedule/actions.ts` | exact-existing |
| `src/app/schedule/page.tsx` | page/component | request-response UI list | `src/app/schedule/page.tsx` | exact-existing |
| `README.md` | docs | batch documentation | `README.md` plus roadmap/context docs | exact-existing |

## Pattern Assignments

### `src/features/video/services/video-service.ts` (service, file-I/O + subprocess + transform + CRUD)

**Analog:** `src/features/video/services/video-service.ts`

**Imports pattern** (lines 1-11):
```typescript
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  transcriptionService,
  type TranscriptionSegment,
  type TranscriptionWord,
} from "@/features/video/services/transcription-service";
import { prisma } from "@/lib/prisma";
import { getGeneratedVideoPath } from "@/lib/storage/local-storage";
```

**Config and subprocess pattern** (lines 72-129):
```typescript
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
```

Implementation constraint: `runProcess()` currently has no timeout in this file. Keep Phase 1 scoped to stabilization; if adding a timeout, keep it local and redacted. Do not move FFmpeg to a worker in this phase.

**Caption style constants** (lines 45-55):
```typescript
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
```

Implementation constraint: preserve the current visual style required by Phase 1: white text, black outline, no background box, safe lower position. Do not make subtitles heavier.

**Generation state pattern** (lines 664-748):
```typescript
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
```

**Success persistence pattern** (lines 722-739):
```typescript
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
```

**Error persistence pattern** (lines 748-767):
```typescript
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
```

Implementation constraint: Phase 1 asks for user-facing warnings without leaking raw FFmpeg/provider/local path details. The current pattern stores `message` directly; planners should include redaction if touching failure messages.

**FFmpeg vertical MP4 pattern** (lines 833-882):
```typescript
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
```

### `src/features/video/services/caption-helpers.ts` (utility, transform)

**Analog:** private caption helpers in `src/features/video/services/video-service.ts`

**Normalization pattern** (lines 141-154, 156-176, 178-189):
```typescript
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
```

**Spoken-script extraction pattern** (lines 156-176):
```typescript
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
```

**Segmentation/orphan-merge pattern** (lines 297-345, 378-424):
```typescript
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
```

```typescript
function mergeOrphanSegments(segments: string[]) {
  const merged: string[] = [];

  for (const segment of segments) {
    const plainSegment = segment.replace(/\\N/g, " ").trim();
    const wordCount = plainSegment.split(" ").filter(Boolean).length;
    const previous = merged.at(-1);

    if (wordCount < 3 && previous) {
```

Implementation constraint: extracted helpers should remain pure. Do not import Prisma, `fs`, FFmpeg, or `transcriptionService` into the helper module. Export only what tests and `VideoService` need.

### `src/features/video/services/caption-helpers.test.ts` (test, transform)

**Analog:** no in-repo test suite.

**Recommended shape source:** `.planning/codebase/TESTING.md` lines 39-44:
```typescript
describe("parseProjectFormData", () => {
  it("validates title, prompt, content type, images, and audio", () => {
    // Arrange FormData and File objects.
    // Act through parseProjectFormData from src/features/content/services/upload-service.ts.
    // Assert parsed input and file filtering behavior.
  });
});
```

Implementation constraint: `package.json` lines 5-13 has no `test` script. If adding tests in Phase 1, planner must add a runner deliberately. Highest-value tests should cover Portuguese captions, punctuation, quotes, hashtags, `VOZ OFF`, long phrases, failed transcription fallback, and no isolated one-word cues.

### `src/features/video/services/transcription-service.ts` (service, subprocess request-response)

**Analog:** `src/features/video/services/transcription-service.ts`

**Types pattern** (lines 4-22):
```typescript
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
```

**Timeout subprocess pattern** (lines 29-42):
```typescript
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
```

**Optional subsystem fallback pattern** (lines 72-129):
```typescript
export class TranscriptionService {
  async transcribe(audioPath: string): Promise<TranscriptionSegment[] | null> {
    const pythonPath = process.env.WHISPER_PYTHON_PATH || "python";
    const scriptPath = path.join(process.cwd(), "scripts", "transcribe_audio.py");
    const model = process.env.WHISPER_MODEL || "base";
    const language = process.env.WHISPER_LANGUAGE || "pt";
    const device = process.env.WHISPER_DEVICE || "cpu";
    const computeType = process.env.WHISPER_COMPUTE_TYPE || "int8";
    const timeoutMs = Number(process.env.WHISPER_TIMEOUT_MS || 240000);
```

```typescript
    } catch {
      return null;
    }
  }
}

export const transcriptionService = new TranscriptionService();
```

Implementation constraint: preserve `null` on Whisper/Python failure so MP4 generation continues with fallback caption timing.

### `scripts/transcribe_audio.py` (utility, subprocess JSON transform)

**Analog:** `scripts/transcribe_audio.py`

**CLI + encoding pattern** (lines 1-18):
```python
import argparse
import json
import sys


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8")

    parser = argparse.ArgumentParser(description="Transcribe audio with faster-whisper.")
    parser.add_argument("--audio", required=True)
```

**Dependency failure pattern** (lines 20-33):
```python
try:
    from faster_whisper import WhisperModel
except ImportError as error:
    print(
        json.dumps(
            {
                "ok": False,
                "error": f"Dependencia do faster-whisper ausente: {error}. Rode: pip install -r requirements-whisper.txt",
            },
            ensure_ascii=False,
        ),
        file=sys.stderr,
    )
    return 2
```

**Whisper word timestamp output pattern** (lines 35-77):
```python
model = WhisperModel(args.model, device=args.device, compute_type=args.compute_type)
segments, info = model.transcribe(
    args.audio,
    language=args.language,
    vad_filter=True,
    beam_size=5,
    word_timestamps=True,
)
```

Implementation constraint: keep stdout as machine-readable JSON. Do not print progress logs to stdout because `TranscriptionService` parses `result.stdout.trim()` as JSON.

### `src/features/content/actions.ts` (server action, request-response + orchestration)

**Analog:** `src/features/content/actions.ts`

**Server action imports pattern** (lines 1-13):
```typescript
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createContentProject,
  createProjectWithUploads,
  parseProjectFormData,
} from "@/features/content/services/upload-service";
import { videoService } from "@/features/video/services/video-service";
import { geminiService } from "@/integrations/gemini/gemini-service";
import { prisma } from "@/lib/prisma";
import { deleteProjectStorage } from "@/lib/storage/local-storage";
```

**Redirect feedback pattern** (lines 15-40):
```typescript
function friendlyErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function redirectWithNewContentError(error: unknown): never {
  const message = friendlyErrorMessage(error, "Falha ao criar conteudo.");
  redirect(`/contents/new?error=${encodeURIComponent(message)}`);
}

async function revalidateContentPages(contentId?: string) {
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/contents");
```

**Warning query-param pattern** (lines 68-86):
```typescript
if (canGenerateVideo) {
  try {
    await videoService.generateProjectVideo(content.id);
    params.set("generated", "1");
  } catch (error) {
    params.set(
      "videoWarning",
      friendlyErrorMessage(error, "Assets gerados, mas o video nao foi criado."),
    );
  }
} else {
  params.set(
    "videoWarning",
    "A Gemini retornou o plano textual, mas nao gerou imagens e audio suficientes para montar o MP4 automaticamente.",
  );
}
```

Implementation constraint: keep user feedback in redirects/search params for server-action flows. Sanitize new messages before adding them to URLs.

### `src/app/contents/[id]/page.tsx` (page/component, request-response review UI)

**Analog:** `src/app/contents/[id]/page.tsx`

**Imports and dynamic page pattern** (lines 1-24):
```typescript
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  Download,
  FileVideo,
  ImageIcon,
  Music2,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { FeedbackBanner } from "@/components/feedback-banner";
```

```typescript
export const dynamic = "force-dynamic";
```

**Next 16 params/searchParams Promise pattern** (lines 34-50):
```typescript
export default async function ContentDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    created?: string;
    generated?: string;
    gemini?: string;
    geminiError?: string;
    error?: string;
    videoWarning?: string;
  }>;
}) {
  const { id } = await params;
  const feedback = await searchParams;
  const content = await getContentById(id);
```

Implementation constraint: this repo's App Router uses Promise-typed `params` and `searchParams`. Before changing framework-level behavior, read `node_modules/next/dist/docs/` per `AGENTS.md`.

**Review/download/regenerate pattern** (lines 141-166):
```typescript
<div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
  {videoUrl ? (
    <a
      href={`${videoUrl}?download=1`}
      className="inline-flex items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
    >
      <Download size={16} />
      Baixar video
    </a>
  ) : null}
```

**Generated video preview pattern** (lines 196-208):
```typescript
<div className="mt-6 flex justify-center rounded-lg bg-zinc-950 p-4">
  {videoUrl ? (
    <video
      controls
      src={videoUrl}
      className="aspect-[9/16] max-h-[720px] w-full max-w-[405px] rounded-md bg-black"
    />
  ) : (
    <div className="flex aspect-[9/16] max-h-[720px] w-full max-w-[405px] items-center justify-center rounded-md border border-dashed border-white/25 px-8 text-center text-sm leading-6 text-white/70">
      Gere o MP4 para visualizar e baixar o video vertical.
    </div>
  )}
</div>
```

### `src/components/feedback-banner.tsx` (component, UI feedback)

**Analog:** `src/components/feedback-banner.tsx`

**Variant map pattern** (lines 1-20):
```typescript
type FeedbackBannerProps = {
  type: "success" | "error" | "info";
  title: string;
  message?: string;
};

const styles = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  error: "border-red-200 bg-red-50 text-red-900",
  info: "border-sky-200 bg-sky-50 text-sky-900",
};

export function FeedbackBanner({ type, title, message }: FeedbackBannerProps) {
  return (
    <div className={`rounded-lg border p-4 text-sm ${styles[type]}`}>
```

Implementation constraint: use the existing `success | error | info` types for Phase 1 warnings. Avoid creating a parallel alert component unless the UX really needs new behavior.

### `src/features/content/services/upload-service.ts` (service, file-I/O + CRUD)

**Analog:** `src/features/content/services/upload-service.ts`

**MIME validation pattern** (lines 13-25, 51-61):
```typescript
const imageMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const audioMimeTypes = new Set([
  "audio/aac",
  "audio/m4a",
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
  "audio/x-m4a",
  "audio/x-wav",
]);
```

```typescript
function validateFileType(file: File, expected: "image" | "audio") {
  const allowed = expected === "image" ? imageMimeTypes : audioMimeTypes;

  if (!allowed.has(file.type)) {
    throw new Error(
```

**Upload persistence pattern** (lines 93-125):
```typescript
export async function attachMediaFilesToProject(projectId: string, files: ProjectFilesInput) {
  validateProjectFiles(files, { requireAudio: false });

  const project = await prisma.contentProject.findUnique({
    where: { id: projectId },
    select: { id: true },
  });

  if (!project) {
    throw new Error("Projeto nao encontrado.");
  }

  const storedImages = await Promise.all(
    files.images.map((image) => saveUploadedFile(image, projectId)),
  );
  const storedAudio = files.audio ? await saveUploadedFile(files.audio, projectId) : null;
```

**Create-with-cleanup pattern** (lines 141-170):
```typescript
export async function createProjectWithUploads(input: ContentProjectInput, files: ProjectFilesInput) {
  const parsed = contentProjectInputSchema.parse(input);
  validateProjectFiles(files);

  const project = await createContentProject(parsed);

  try {
    await attachMediaFilesToProject(project.id, files);

    return prisma.contentProject.findUniqueOrThrow({
      where: { id: project.id },
      include: {
        mediaFiles: { orderBy: { createdAt: "desc" } },
        generatedVideos: { orderBy: { createdAt: "desc" } },
      },
    });
  } catch (error) {
    await deleteProjectStorage(project.id);
```

Implementation constraint: Phase 1 preserves local storage and manual upload. Do not add S3/R2 or remove upload flows.

### `src/lib/storage/local-storage.ts` and `src/lib/paths.ts` (utilities, file-I/O/path transform)

**Analog:** `src/lib/storage/local-storage.ts`, `src/lib/paths.ts`

**Root and public URL pattern** (`src/lib/paths.ts` lines 3-14):
```typescript
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
```

**Save upload pattern** (`src/lib/storage/local-storage.ts` lines 22-42):
```typescript
export async function saveUploadedFile(file: File, namespace: string): Promise<StoredFile> {
  await ensureStorageFolders();

  const folder = path.join(uploadRoot, namespace);
  await fs.mkdir(folder, { recursive: true });

  const originalName = file.name || "upload.bin";
  const cleanName = sanitizeFileName(originalName);
  const fileName = `${randomUUID()}-${cleanName}`;
  const destination = path.join(folder, fileName);
  const bytes = Buffer.from(await file.arrayBuffer());
```

**Generated video path pattern** (`src/lib/storage/local-storage.ts` lines 69-72):
```typescript
export async function getGeneratedVideoPath(contentId: string) {
  await ensureStorageFolders();
  return path.join(generatedRoot, `${contentId}.mp4`);
}
```

**Delete guard pattern** (`src/lib/storage/local-storage.ts` lines 74-99):
```typescript
function assertStoragePath(filePath: string) {
  const resolvedPath = path.resolve(filePath);
  const relativePath = path.relative(storageRoot, resolvedPath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath) || relativePath === "") {
    throw new Error("Caminho de storage invalido para exclusao.");
  }

  return resolvedPath;
}
```

Implementation constraint: use `uploadRoot`/`generatedRoot`/`storageRoot`; avoid new direct `process.cwd()/storage` joins. `VideoService.getProjectCaptionText()` currently violates this at lines 790-804 and is a Phase 1 cleanup candidate.

### `src/app/api/files/[...path]/route.ts` (route, file-I/O request-response)

**Analog:** `src/app/api/files/[...path]/route.ts`

**Traversal guard and download pattern** (lines 17-47):
```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: pathSegments } = await params;
  const filePath = path.resolve(storageRoot, ...pathSegments);
  const relative = path.relative(storageRoot, filePath);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return NextResponse.json({ error: "Invalid path." }, { status: 400 });
  }

  try {
    const file = await fs.readFile(filePath);
```

```typescript
if (request.nextUrl.searchParams.get("download") === "1") {
  headers.set(
    "content-disposition",
    `attachment; filename="${path.basename(filePath).replace(/"/g, "")}"`,
  );
}
```

Implementation constraint: Phase 1 should not add auth/object storage. If touching downloads, preserve the `?download=1` contract used by review and schedule pages.

### `src/features/schedule/actions.ts` (server action, CRUD + request-response)

**Analog:** `src/features/schedule/actions.ts`

**Zod boundary pattern** (lines 1-14):
```typescript
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schedulePostSchema = z.object({
  projectId: z.string().min(1),
  platform: z.enum(["INSTAGRAM", "TIKTOK", "YOUTUBE"]),
  date: z.string().min(1, "Informe a data."),
  time: z.string().min(1, "Informe o horario."),
  caption: z.string().trim().min(1, "Informe a legenda da postagem."),
});
```

**Ready-video prerequisite pattern** (lines 39-55):
```typescript
const project = await prisma.contentProject.findUnique({
  where: { id: parsed.data.projectId },
  include: {
    generatedVideos: {
      where: { status: "READY" },
      take: 1,
    },
  },
});

if (!project) {
  throw new Error("Projeto nao encontrado.");
}

if (project.generatedVideos.length === 0) {
  throw new Error("Gere um video antes de agendar a postagem.");
}
```

**Transaction + redirect pattern** (lines 57-79):
```typescript
const scheduledAt = parseScheduledAt(parsed.data.date, parsed.data.time);

await prisma.$transaction([
  prisma.scheduledPost.create({
    data: {
      projectId: project.id,
      platform: parsed.data.platform,
      scheduledAt,
      caption: parsed.data.caption,
      status: "SCHEDULED",
    },
  }),
  prisma.contentProject.update({
    where: { id: project.id },
    data: { status: "SCHEDULED" },
  }),
]);
```

Implementation constraint: current code does not reject past dates server-side. Phase 1 context says scheduling basics are in scope; if adding validation, do it here, with a friendly message and no publisher integration.

### `src/app/schedule/page.tsx` (page/component, request-response UI list)

**Analog:** `src/app/schedule/page.tsx`

**Feedback + dynamic page pattern** (lines 34-70):
```typescript
export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string; scheduled?: string }>;
}) {
  const feedback = await searchParams;
  const scheduledPosts = await getScheduledPosts();
```

```typescript
{feedback.scheduled ? (
  <FeedbackBanner
    type="success"
    title="Postagem agendada"
    message="O agendamento foi salvo no banco. Nenhuma rede social foi acionada."
  />
) : null}
```

**Ready-to-post visual status pattern** (lines 93-105):
```typescript
const videoPath = post.project.generatedVideos[0]?.path;
const scheduled = formatDateTime(post.scheduledAt);
const isReadyToPost = new Date(post.scheduledAt) <= new Date();
const visualStatus =
  post.status === "SCHEDULED" && isReadyToPost
    ? "READY_TO_POST"
    : post.status;
const statusLabel =
  visualStatus === "READY_TO_POST"
    ? "Pronto para postar"
    : statusLabels[visualStatus];
```

Implementation constraint: schedule remains database-only in Phase 1. Do not implement social publishing or background workers.

### `README.md` (docs, batch documentation)

**Analog:** `README.md`

**Local setup pattern** (lines 15-73):
```text
## Rodando localmente
1. Copie as variaveis de ambiente se necessario:
cp .env.example .env
```

**Whisper docs pattern** (lines 50-68):
```text
6. Para legendas com timestamps reais, instale o Whisper local:
python -m pip install -r requirements-whisper.txt
Variaveis opcionais:
```

**Video generation docs pattern** (lines 200-218):
```text
## Geracao de video

A geracao fica isolada em `src/features/video/services/video-service.ts`, na classe `VideoService`.

Fluxo:

1. Busca o `ContentProject` e seus `MediaFile`.
2. Valida se ha pelo menos uma imagem e um audio.
3. Usa `ffprobe` para calcular a duracao total do audio.
```

**Stale Manus docs to correct** (lines 260-287):
```text
## Manus

A integracao futura com Manus fica preparada em `src/integrations/manus/manus-service.ts`.
...
Por enquanto todos os metodos retornam dados mockados. Quando a API real estiver disponivel, a troca deve ficar concentrada dentro de `ManusService`.
```

Implementation constraint: README currently contradicts code and planning docs. Roadmap line 44 and context line 105 require updating mock-only Manus language because current code has real API/fallback structure.

## Shared Patterns

### Server-only Boundaries

**Sources:** `.planning/codebase/ARCHITECTURE.md` lines 13-14, `.planning/codebase/CONVENTIONS.md` lines 104-107, API route files.

Apply to: video generation, upload/media routes, file serving, server actions, Gemini/Manus, storage.

Rules:
- Keep Prisma, filesystem, child processes, provider SDKs, and local media processing out of client components.
- API routes using filesystem/process work declare `export const runtime = "nodejs"` as in `src/app/api/content-projects/route.ts` line 8, `src/app/api/content-projects/[id]/media/route.ts` line 8, and `src/app/api/content-projects/[id]/generate/route.ts` line 4.
- Framework-level Next.js changes must consult `node_modules/next/dist/docs/` because `AGENTS.md` says this Next.js version has breaking changes.

### User Feedback

**Sources:** `src/features/content/actions.ts`, `src/app/contents/[id]/page.tsx`, `src/components/feedback-banner.tsx`, `src/app/schedule/page.tsx`.

Apply to: generation warnings, failed generation, provider limitations, scheduling, README smoke checklist.

Pattern:
```typescript
redirect(`/contents/${content.id}?error=${encodeURIComponent(
  friendlyErrorMessage(error, "Projeto salvo, mas o video nao foi gerado."),
)}`);
```
Source: `src/features/content/actions.ts` lines 120-124.

Pattern:
```typescript
{feedback.videoWarning ? (
  <FeedbackBanner
    type="info"
    title="Assets salvos, video pendente"
    message={decodeURIComponent(feedback.videoWarning)}
  />
) : null}
```
Source: `src/app/contents/[id]/page.tsx` lines 115-121.

Constraint: do not expose raw FFmpeg stderr, provider payloads, local paths, or secrets in UI strings.

### Caption Timing and Text Authority

**Sources:** Phase 1 context, `src/features/video/services/video-service.ts`, `src/features/video/services/transcription-service.ts`.

Apply to: subtitle generation and helper extraction.

Rules:
- Whisper timestamps are best timing source when transcription succeeds.
- Project caption/script is best text source when Whisper words are wrong.
- Avoid global proportional retiming when word/segment timestamps exist.
- Preserve fallback when Whisper returns `null`.
- Avoid isolated one-word cues when natural grouping is possible.

Current code anchors:
- Whisper flattening/fallback word timestamps: `src/features/video/services/video-service.ts` lines 205-224.
- Fuzzy alignment and original-text selection: lines 493-593.
- Fallback proportional cues: lines 474-491.
- Quality warning threshold: lines 595-618.
- Transcription null fallback: `src/features/video/services/transcription-service.ts` lines 126-128.

### Persistence and Status

**Sources:** `src/features/video/services/video-service.ts`, `src/features/schedule/actions.ts`, `src/features/content/services/upload-service.ts`.

Apply to: generation, upload, scheduling.

Rules:
- Long-running workflow updates `ContentProject.status`.
- Generated videos have their own `GeneratedVideo.status`.
- Schedule writes `ScheduledPost` and updates project status in one transaction.
- Upload create failure cleans storage then marks project `ERROR`.

Constraints:
- Current generated MP4 path is mutable: `storage/generated/<projectId>.mp4` from `src/lib/storage/local-storage.ts` lines 69-72. Do not accidentally imply immutable video history in UI/docs.
- Concurrent generation is known fragile and out of Phase 1 unless a planner explicitly scopes a lock.

### Local Storage

**Sources:** `src/lib/paths.ts`, `src/lib/storage/local-storage.ts`, `src/app/api/files/[...path]/route.ts`.

Apply to: upload/storage, generated video, review/download, README.

Rules:
- Use `storageRoot`, `uploadRoot`, and `generatedRoot`.
- Save uploads/generated assets under `storage/uploads/<projectId>/`.
- Save generated MP4 under `storage/generated/<projectId>.mp4`.
- Convert absolute paths to public URLs with `toPublicFileUrl()`.
- Guard deletes and file serving against traversal.

Constraints:
- S3/R2/object storage migration is deferred.
- `.env` exists and must not be read or quoted.

### API Response Pattern

**Sources:** `src/lib/api-response.ts`, API route files.

Pattern (`src/lib/api-response.ts` lines 3-13):
```typescript
export function apiError(error: unknown, fallback: string, status = 400) {
  return NextResponse.json(
    {
      error: error instanceof Error ? error.message : fallback,
    },
    { status },
  );
}

export function apiCreated<T>(payload: T) {
  return NextResponse.json(payload, { status: 201 });
}
```

Constraint: this currently forwards `error.message`. If Phase 1 touches API errors, planner should add user-safe redaction without changing the helper contract unnecessarily.

### Verification

**Sources:** `.planning/codebase/TESTING.md`, `package.json`, README.

Commands:
```bash
npm run lint
npm run build
```

Manual smoke checklist should cover:
- Create content manually.
- Upload images and one audio file.
- Generate 1080x1920 MP4.
- Confirm captions use readable blocks and do not visibly lag.
- Review and download the video from `/contents/[id]`.
- Schedule it and confirm it appears in `/schedule`.
- Verify Gemini/Manus-assisted project can still be reviewed/regenerated when assets exist.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `src/features/video/services/caption-helpers.test.ts` | test | transform | No test runner, test config, or existing `*.test.*` files in `src/`, `prisma/`, or `scripts/`. Use `.planning/codebase/TESTING.md` recommendations and add runner deliberately if tests are included. |

## Implementation Constraints

- Preserve manual upload, Gemini paths, Manus paths, FFmpeg in `VideoService`, local storage, and current Prisma schema unless a task proves a schema change is necessary.
- Do not implement real Instagram/TikTok/YouTube publishing, auth, queues/workers, S3/R2, or a full video editor in Phase 1.
- Keep UI simple and practical. Use existing `FeedbackBanner`, `GenerateVideoButton`, `SubmitButton`, and App Router server components unless client state is needed.
- Do not expose raw FFmpeg, provider, local path, or secret details in UI/API messages.
- Do not read or commit raw `.env` values.
- Use `@/*` imports for source modules.
- Keep helper extraction scoped: pure caption functions may move out of `video-service.ts`, but orchestration should remain in `VideoService`.
- README must be corrected where it says Manus is mock-only; current docs already mention real Manus fallback around README lines 239-245 but the later Manus section lines 260-287 is stale.

## Metadata

**Analog search scope:** `.planning/`, `src/app/`, `src/components/`, `src/features/`, `src/integrations/`, `src/lib/`, `scripts/`, `README.md`, `package.json`, `AGENTS.md`, `CLAUDE.md`.
**Files scanned:** 80+ non-`node_modules` files listed via PowerShell after `rg` was unavailable due Windows access denial.
**Pattern extraction date:** 2026-04-21
