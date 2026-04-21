# External Integrations

**Analysis Date:** 2026-04-21

## APIs & External Services

**AI Generation:**
- Google Gemini - Generates short-video plans, vertical scene images, and narration audio.
  - SDK/Client: `@google/genai` in `src/integrations/gemini/gemini-service.ts`.
  - Auth: `GEMINI_API_KEY`.
  - Models referenced: `gemini-2.5-flash`, `gemini-2.5-flash-lite`, `gemini-2.5-flash-image`, `gemini-3-pro-image-preview`, and `gemini-2.5-flash-preview-tts`.
  - Storage side effects: generated plans are written to `storage/uploads/<projectId>/gemini-plan.json` through `src/integrations/gemini/gemini-service.ts`; generated images/audio are saved with `src/lib/storage/local-storage.ts`.
- Manus API - Fallback image generation and task/message attachment retrieval.
  - SDK/Client: native `fetch` in `src/integrations/manus/manus-service.ts`.
  - Base URL: `https://api.manus.ai/v2/`.
  - Auth: `MANUS_API_KEY` or the saved `apiKey` field in `ManusSettings` from `prisma/schema.prisma`.
  - Endpoints used: `task.create` and `task.listMessages`.
  - Attachment downloads: image attachment URLs are fetched with the Manus API key in `src/integrations/manus/manus-service.ts`.

**Video Processing:**
- FFmpeg - Generates vertical MP4 files from images, audio, and ASS subtitles.
  - Client: child process execution in `src/features/video/services/video-service.ts`.
  - Binary path: `FFMPEG_PATH` or `ffmpeg`.
  - Output: `storage/generated/<contentProjectId>.mp4` through `src/lib/storage/local-storage.ts`.
- FFprobe - Reads audio duration before video generation.
  - Client: child process execution in `src/features/video/services/video-service.ts`.
  - Binary path: `FFPROBE_PATH`, inferred sibling of `FFMPEG_PATH`, or `ffprobe`.
- Local Whisper / faster-whisper - Produces caption timestamps for audio.
  - Client: Python subprocess spawned by `src/features/video/services/transcription-service.ts`.
  - Script: `scripts/transcribe_audio.py`.
  - Dependencies: `faster-whisper` and `requests` in `requirements-whisper.txt`.
  - Config: `WHISPER_PYTHON_PATH`, `WHISPER_MODEL`, `WHISPER_LANGUAGE`, `WHISPER_DEVICE`, `WHISPER_COMPUTE_TYPE`, and `WHISPER_TIMEOUT_MS`.

**Social Publishing:**
- Social publisher - Interface exists but publishing is intentionally not configured.
  - SDK/Client: none.
  - Implementation: `src/integrations/social/publisher.ts` throws `SocialPublishingNotConfiguredError` for `schedule` and `publishNow`.
  - Platforms represented: Instagram, TikTok, YouTube in `src/integrations/social/publisher.ts` and `SocialPlatform` enum in `prisma/schema.prisma`.

## Data Storage

**Databases:**
- PostgreSQL.
  - Connection: `DATABASE_URL` in `prisma/schema.prisma`.
  - Client: `@prisma/client` through singleton `prisma` exported by `src/lib/prisma.ts`.
  - Schema: `prisma/schema.prisma`.
  - Migrations: `prisma/migrations/20260421000000_init/migration.sql`, `prisma/migrations/20260421000100_add_scheduled_post_caption/migration.sql`, and `prisma/migrations/20260421000200_add_manus_settings/migration.sql`.
  - Local workflow: `README.md` documents Docker Compose PostgreSQL exposed on `localhost:5433`; do not quote any `docker-compose.yml` secrets.

**File Storage:**
- Local filesystem only.
  - Root: `LOCAL_STORAGE_ROOT` or `storage` in `src/lib/paths.ts`.
  - Uploads: `storage/uploads` through `uploadRoot` in `src/lib/paths.ts`.
  - Generated videos: `storage/generated` through `generatedRoot` in `src/lib/paths.ts`.
  - Write helpers: `saveUploadedFile`, `saveGeneratedAsset`, and `getGeneratedVideoPath` in `src/lib/storage/local-storage.ts`.
  - Delete helper: `deleteProjectStorage` in `src/lib/storage/local-storage.ts` validates paths before removal.
  - File serving: `GET /api/files/[...path]` in `src/app/api/files/[...path]/route.ts` reads from `storageRoot` and blocks path traversal.

**Caching:**
- Next.js route revalidation only.
  - `revalidatePath` is used in `src/features/content/actions.ts`, `src/features/schedule/actions.ts`, and `src/features/settings/actions.ts`.
  - No Redis, Memcached, CDN cache integration, or persistent job queue was detected.

## Authentication & Identity

**Auth Provider:**
- Not detected.
  - `User` and `SocialAccount` models exist in `prisma/schema.prisma`, but no session middleware, OAuth provider, password auth, or auth library is configured in `package.json`.
  - Manus API key persistence is handled through `ManusSettings` in `prisma/schema.prisma` and `/settings` server actions in `src/features/settings/actions.ts`; this is application configuration, not user authentication.

## Monitoring & Observability

**Error Tracking:**
- None detected.
  - No Sentry, OpenTelemetry exporter, hosted logging SDK, or monitoring package is declared in `package.json`.

**Logs:**
- Prisma logs `error` and `warn` in development and `error` in production via `src/lib/prisma.ts`.
- API errors are normalized into JSON by `src/lib/api-response.ts`.
- UI/server action errors are propagated through redirects and query strings in `src/features/content/actions.ts`, `src/features/settings/actions.ts`, and `src/features/schedule/actions.ts`.
- FFmpeg, FFprobe, and Whisper subprocess stderr is captured internally by `src/features/video/services/video-service.ts` and `src/features/video/services/transcription-service.ts`.

## CI/CD & Deployment

**Hosting:**
- Not configured in committed files.
  - `.gitignore` includes `.vercel`, but no committed Vercel config or deployment workflow was detected.
  - `README.md` describes local development with `npm run dev`.

**CI Pipeline:**
- None detected.
  - No GitHub Actions, Vercel project metadata, or other CI configuration was found during tech mapping.

## Environment Configuration

**Required env vars:**
- `DATABASE_URL` - Required by Prisma PostgreSQL datasource in `prisma/schema.prisma`.

**Optional env vars:**
- `GEMINI_API_KEY` - Enables Google Gemini generation in `src/integrations/gemini/gemini-service.ts`.
- `MANUS_API_KEY` - Enables Manus API calls in `src/integrations/manus/manus-service.ts` and fallback image generation in `src/integrations/gemini/gemini-service.ts`.
- `LOCAL_STORAGE_ROOT` - Overrides filesystem storage root in `src/lib/paths.ts`.
- `FFMPEG_PATH` - Overrides FFmpeg executable path in `src/features/video/services/video-service.ts`.
- `FFPROBE_PATH` - Overrides FFprobe executable path in `src/features/video/services/video-service.ts`.
- `WHISPER_PYTHON_PATH` - Overrides Python executable path in `src/features/video/services/transcription-service.ts`.
- `WHISPER_MODEL` - Selects faster-whisper model in `src/features/video/services/transcription-service.ts`.
- `WHISPER_LANGUAGE` - Selects transcription language in `src/features/video/services/transcription-service.ts`.
- `WHISPER_DEVICE` - Selects faster-whisper device in `src/features/video/services/transcription-service.ts`.
- `WHISPER_COMPUTE_TYPE` - Selects faster-whisper compute type in `src/features/video/services/transcription-service.ts`.
- `WHISPER_TIMEOUT_MS` - Controls transcription timeout in `src/features/video/services/transcription-service.ts`.
- `NODE_ENV` - Controls Prisma logging and Prisma client singleton behavior in `src/lib/prisma.ts`.

**Secrets location:**
- `.env` file present - contains local environment configuration and must not be read or committed.
- `.env.example` file present - template exists, but raw values are not included in this audit.
- Manus API keys can also be stored in the database in `ManusSettings.apiKey` from `prisma/schema.prisma` via `src/features/settings/actions.ts`; treat this column as secret-bearing application data.

## Webhooks & Callbacks

**Incoming:**
- None detected.
  - Existing API routes are direct app endpoints: `POST /api/content-projects` in `src/app/api/content-projects/route.ts`, `POST /api/content-projects/[id]/media` in `src/app/api/content-projects/[id]/media/route.ts`, `POST /api/content-projects/[id]/generate` in `src/app/api/content-projects/[id]/generate/route.ts`, and `GET /api/files/[...path]` in `src/app/api/files/[...path]/route.ts`.

**Outgoing:**
- Google Gemini requests are made through `@google/genai` in `src/integrations/gemini/gemini-service.ts`.
- Manus task and attachment requests are made through `fetch` in `src/integrations/manus/manus-service.ts`.
- No outgoing social platform publishing calls are active; `src/integrations/social/publisher.ts` is a stub.

---

*Integration audit: 2026-04-21*
