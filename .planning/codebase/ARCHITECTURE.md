# Architecture

**Analysis Date:** 2026-04-21

## Pattern Overview

**Overall:** Next.js App Router feature-oriented monolith with server-side mutations, Prisma persistence, local filesystem media storage, and isolated external-service adapters.

**Key Characteristics:**
- Route segments in `src/app/` own navigation, page composition, API handlers, loading, and error boundaries.
- Domain code is grouped by feature under `src/features/`, with pages importing feature queries, actions, services, components, schemas, and types through the `@/*` alias from `tsconfig.json`.
- Infrastructure concerns live in `src/lib/`: Prisma client lifetime, filesystem storage, public file path conversion, response helpers, and formatting.
- External API boundaries live in `src/integrations/`, keeping Gemini, Manus, and social publishing concerns outside page and feature modules.
- Video generation is a server-only Node.js workflow. The API routes that need filesystem/process access declare `export const runtime = "nodejs"` in `src/app/api/content-projects/route.ts`, `src/app/api/content-projects/[id]/media/route.ts`, and `src/app/api/content-projects/[id]/generate/route.ts`.
- The data model is centered on `ContentProject`, `MediaFile`, `GeneratedVideo`, `ScheduledPost`, `SocialAccount`, and `ManusSettings` in `prisma/schema.prisma`.

## Layers

**Routing and Page Composition:**
- Purpose: Map URL routes to server-rendered pages and compose feature UI.
- Location: `src/app/`
- Contains: App Router `page.tsx` files, route groups by URL segment, `layout.tsx`, `loading.tsx`, `error.tsx`, and API `route.ts` handlers.
- Depends on: `src/components/`, `src/features/*/queries.ts`, `src/features/*/actions.ts`, `src/integrations/gemini/gemini-service.ts`, and `src/lib/*`.
- Used by: Browser navigation and Next.js App Router.
- Use this layer for route-level concerns only: URL params, search params, redirects, page layout, feedback banners, and calls into feature modules.

**Shared UI Components:**
- Purpose: Provide reusable application shell and generic UI primitives.
- Location: `src/components/`
- Contains: `src/components/app-shell.tsx`, `src/components/feedback-banner.tsx`, `src/components/page-loading.tsx`, `src/components/status-badge.tsx`, and `src/components/submit-button.tsx`.
- Depends on: `next/link`, `react-dom`, `lucide-react`, Prisma enum types, and shared utilities such as `src/lib/paths.ts`.
- Used by: `src/app/dashboard/page.tsx`, `src/app/contents/page.tsx`, `src/app/contents/[id]/page.tsx`, `src/app/schedule/page.tsx`, `src/app/settings/page.tsx`, and feature components.
- Use this layer for cross-feature presentation only. Keep feature-specific UI in `src/features/<feature>/components/`.

**Feature UI Components:**
- Purpose: Encapsulate reusable UI that belongs to one domain feature.
- Location: `src/features/content/components/`
- Contains: `src/features/content/components/content-list.tsx`, `src/features/content/components/create-content-form.tsx`, `src/features/content/components/delete-content-button.tsx`, and `src/features/content/components/generate-video-button.tsx`.
- Depends on: `src/features/content/actions.ts`, `src/features/content/types.ts`, `src/components/*`, `src/lib/paths.ts`, and client hooks where needed.
- Used by: Content, dashboard, schedule, and detail pages under `src/app/`.
- Add new feature-scoped components beside the feature they serve, not under `src/components/`, unless they are shared across multiple features.

**Server Actions:**
- Purpose: Handle form submissions, mutate data, revalidate routes, and redirect to a final UI state.
- Location: `src/features/content/actions.ts`, `src/features/schedule/actions.ts`, and `src/features/settings/actions.ts`.
- Contains: `"use server"` modules, Zod parsing, Prisma writes, service orchestration, `revalidatePath`, and `redirect`.
- Depends on: Feature services, `src/lib/prisma.ts`, `src/lib/storage/local-storage.ts`, `src/integrations/gemini/gemini-service.ts`, and `src/features/video/services/video-service.ts`.
- Used by: Server forms and client buttons in `src/features/content/components/create-content-form.tsx`, `src/features/content/components/delete-content-button.tsx`, `src/app/contents/[id]/page.tsx`, and `src/app/settings/page.tsx`.
- Use actions for user-facing form flows. Return by redirecting to a route with query flags when the page expects feedback banners.

**API Route Handlers:**
- Purpose: Provide JSON and binary endpoints for upload, media attachment, video generation, and local file serving.
- Location: `src/app/api/`
- Contains: `src/app/api/content-projects/route.ts`, `src/app/api/content-projects/[id]/media/route.ts`, `src/app/api/content-projects/[id]/generate/route.ts`, and `src/app/api/files/[...path]/route.ts`.
- Depends on: Upload services, `src/features/video/services/video-service.ts`, `src/lib/api-response.ts`, and `src/lib/paths.ts`.
- Used by: External callers or browser requests that need endpoint behavior instead of server-action form behavior.
- Use API handlers when the caller is not a native Next.js form action or when returning files/JSON is the primary contract.

**Feature Queries and Validation:**
- Purpose: Read domain data and validate input shapes.
- Location: `src/features/content/queries.ts`, `src/features/content/schemas.ts`, `src/features/content/types.ts`, `src/features/schedule/queries.ts`, and `src/features/settings/queries.ts`.
- Contains: Prisma read models, Zod schemas, and relation-enriched TypeScript types.
- Depends on: `src/lib/prisma.ts`, `zod`, and Prisma-generated types.
- Used by: Server pages, server actions, and feature services.
- Put reusable read logic in `queries.ts`. Put form/API input schemas in `schemas.ts` when shared by multiple entry points.

**Domain Services:**
- Purpose: Encapsulate multi-step workflows that combine validation, persistence, storage, subprocesses, or integrations.
- Location: `src/features/content/services/` and `src/features/video/services/`
- Contains: `src/features/content/services/upload-service.ts`, `src/features/video/services/video-service.ts`, and `src/features/video/services/transcription-service.ts`.
- Depends on: `src/lib/prisma.ts`, `src/lib/storage/local-storage.ts`, `scripts/transcribe_audio.py`, FFmpeg/FFprobe processes, and integration services.
- Used by: Server actions and API route handlers.
- Keep orchestration here when the logic has more than simple CRUD or UI feedback.

**External Integrations:**
- Purpose: Isolate third-party and future external-service contracts from core app flows.
- Location: `src/integrations/`
- Contains: `src/integrations/gemini/gemini-service.ts`, `src/integrations/manus/client.ts`, `src/integrations/manus/manus-service.ts`, and `src/integrations/social/publisher.ts`.
- Depends on: External SDKs or APIs, environment variables by name, local storage helpers, and Prisma settings.
- Used by: `src/features/content/actions.ts` and `src/integrations/gemini/gemini-service.ts`.
- Keep API normalization, retries, fallback behavior, and service-specific error messages inside these adapters.

**Persistence:**
- Purpose: Define and access application state.
- Location: `prisma/schema.prisma`, `prisma/migrations/`, and `src/lib/prisma.ts`.
- Contains: PostgreSQL datasource, Prisma models/enums, migrations, and a singleton Prisma client.
- Depends on: `DATABASE_URL` by name in `prisma/schema.prisma` and `@prisma/client`.
- Used by: Queries, actions, services, and integrations.
- Use Prisma models as the source of truth for content projects, media metadata, generated videos, schedules, users, social accounts, and Manus settings.

**Local Media Storage:**
- Purpose: Store uploads, generated assets, generated MP4s, and expose them through a safe public route.
- Location: `src/lib/storage/local-storage.ts`, `src/lib/paths.ts`, `storage/uploads/`, `storage/generated/`, and `src/app/api/files/[...path]/route.ts`.
- Contains: File sanitization, UUID filenames, storage root paths, path traversal checks, generated-video paths, and binary file responses.
- Depends on: Node `fs`, Node `path`, `crypto.randomUUID`, and `LOCAL_STORAGE_ROOT` by name.
- Used by: Upload service, Gemini service, video service, content/detail pages, schedule page, and file-serving API.
- Store database rows with absolute file paths, then convert them to public URLs with `toPublicFileUrl()` from `src/lib/paths.ts`.

## Data Flow

**Dashboard and Content Reads:**

1. `src/app/page.tsx` redirects `/` to `/dashboard`.
2. `src/app/dashboard/page.tsx` calls `getDashboardStats()` from `src/features/content/queries.ts`.
3. `getDashboardStats()` reads counts and recent projects through `prisma.contentProject`.
4. `src/features/content/components/content-list.tsx` renders project links, status badges, and download links generated by `toPublicFileUrl()`.

**Manual Content Creation and Upload:**

1. `src/features/content/components/create-content-form.tsx` posts a form to `createContentAction()` in `src/features/content/actions.ts`.
2. `createContentAction()` parses form data through `parseProjectFormData()` from `src/features/content/services/upload-service.ts`.
3. `contentProjectInputSchema` in `src/features/content/schemas.ts` validates title, prompt, caption, and content type.
4. `createProjectWithUploads()` creates a `ContentProject`, saves uploaded files through `saveUploadedFile()` in `src/lib/storage/local-storage.ts`, and creates `MediaFile` rows.
5. The action revalidates `/`, `/dashboard`, `/contents`, and the project detail route, then redirects to `src/app/contents/[id]/page.tsx`.

**Gemini-Assisted Content Creation:**

1. `createContentAction()` detects `intent === "gemini"` from `src/features/content/components/create-content-form.tsx`.
2. `geminiService.generateReelsPlan()` in `src/integrations/gemini/gemini-service.ts` creates and validates a plan with `reelsPlanSchema`.
3. `createContentProject()` creates the draft project in `src/features/content/services/upload-service.ts`.
4. `geminiService.generateTestAssetsForProject()` writes `gemini-plan.json` under `storage/uploads/<projectId>/`, generates images/audio through Gemini, optionally falls back to `ManusService`, saves assets with `saveGeneratedAsset()`, and inserts `MediaFile` rows.
5. If image and audio assets exist, `videoService.generateProjectVideo()` creates the MP4 and updates project/video statuses.
6. The action redirects back to the content detail page with query parameters used by `src/app/contents/[id]/page.tsx` for feedback.

**Video Generation:**

1. A page form calls `generateContentVideoAction()` in `src/features/content/actions.ts`, or an API caller posts to `src/app/api/content-projects/[id]/generate/route.ts`.
2. `videoService.generateProjectVideo()` in `src/features/video/services/video-service.ts` loads the project and `MediaFile` rows with Prisma.
3. The service validates that at least one image and one audio file exist, marks the project `PROCESSING`, and creates a `GeneratedVideo` row.
4. FFprobe calculates audio duration through `getFfprobePath()` and `runProcess()` in `src/features/video/services/video-service.ts`.
5. `transcriptionService.transcribe()` spawns Python to run `scripts/transcribe_audio.py`; failures return `null` so caption timing can fall back to proportional timing.
6. FFmpeg is spawned to compose a 1080x1920 MP4 with image scaling, concatenation, audio, and optional ASS subtitles.
7. Prisma updates the `GeneratedVideo` row to `READY` and the `ContentProject` status to `READY`; errors update project `ERROR` and generated video `ERROR`.

**Scheduling:**

1. `src/app/contents/[id]/page.tsx` renders a schedule form only useful after a generated video URL exists.
2. The form posts to `schedulePostAction()` in `src/features/schedule/actions.ts`.
3. Zod validates `projectId`, `platform`, date, time, and caption.
4. The action verifies the project has a `READY` generated video, creates a `ScheduledPost`, updates the project status to `SCHEDULED`, revalidates affected routes, and redirects to `/schedule?scheduled=1`.
5. `src/app/schedule/page.tsx` reads upcoming posts via `getScheduledPosts()` in `src/features/schedule/queries.ts`.

**Settings:**

1. `src/app/settings/page.tsx` calls `getManusSettings()` from `src/features/settings/queries.ts`.
2. The settings form posts to `saveManusSettingsAction()` in `src/features/settings/actions.ts`.
3. Zod validates inputs, Prisma creates or updates the latest `ManusSettings` row, and the action redirects to `/settings?saved=1`.
4. `src/integrations/gemini/gemini-service.ts` can read `ManusSettings` when Gemini image generation yields no assets and Manus fallback is available.

**File Serving:**

1. Pages call `toPublicFileUrl()` in `src/lib/paths.ts` with absolute storage paths from Prisma rows.
2. The helper returns `/api/files/<relative-storage-path>`.
3. `src/app/api/files/[...path]/route.ts` resolves the requested path against `storageRoot`, rejects traversal outside `storageRoot`, assigns a content type, and returns the file or a 404 JSON response.

**State Management:**
- Persistent server state is stored in PostgreSQL through Prisma models in `prisma/schema.prisma`.
- Media bytes are stored on local disk under `storage/uploads/` and `storage/generated/`; committed placeholders are `storage/uploads/.gitkeep` and `storage/generated/.gitkeep`.
- UI feedback state is carried in query params such as `created`, `generated`, `gemini`, `geminiError`, `error`, `videoWarning`, `scheduled`, and `saved`.
- Form pending state uses `useFormStatus()` in `src/components/submit-button.tsx` and `src/features/content/components/generate-video-button.tsx`.
- Delete button transition state uses `useTransition()` in `src/features/content/components/delete-content-button.tsx`.
- There is no app-wide client store. Prefer server components and server actions for new workflows unless an interaction requires client-only state.

## Key Abstractions

**Content Project Aggregate:**
- Purpose: Represents a short-video project and its lifecycle from draft to generated/scheduled/published/error.
- Examples: `prisma/schema.prisma`, `src/features/content/queries.ts`, `src/features/content/types.ts`, `src/app/contents/[id]/page.tsx`.
- Pattern: Prisma model with related `MediaFile`, `GeneratedVideo`, and `ScheduledPost` records. Use relation includes in feature queries for page data.

**Feature Action Module:**
- Purpose: Own user-facing mutations for one feature.
- Examples: `src/features/content/actions.ts`, `src/features/schedule/actions.ts`, `src/features/settings/actions.ts`.
- Pattern: `"use server"` at module top, validate with Zod or service parser, call Prisma/services, `revalidatePath()`, and `redirect()`.

**Feature Query Module:**
- Purpose: Own server-side read models for pages.
- Examples: `src/features/content/queries.ts`, `src/features/schedule/queries.ts`, `src/features/settings/queries.ts`.
- Pattern: Export async functions that return Prisma query results or UI-safe derived settings. Keep reads colocated with the feature.

**Upload Service:**
- Purpose: Parse multipart form data, validate media types, create content projects, attach files, and roll back storage on failure.
- Examples: `src/features/content/services/upload-service.ts`.
- Pattern: Service functions shared by server actions and API route handlers. Use `filesFromFormData()`, `validateProjectFiles()`, and local storage helpers.

**VideoService:**
- Purpose: Generate vertical MP4 files from project images, audio, and caption text.
- Examples: `src/features/video/services/video-service.ts`.
- Pattern: Class instance exported as `videoService`; coordinates Prisma updates, FFprobe, Whisper transcription, ASS subtitle generation, and FFmpeg rendering.

**TranscriptionService:**
- Purpose: Produce timed caption segments from an audio file when local Whisper dependencies are available.
- Examples: `src/features/video/services/transcription-service.ts`, `scripts/transcribe_audio.py`, `requirements-whisper.txt`.
- Pattern: Node service spawns Python, expects JSON on stdout, filters invalid segments, and returns `null` on failure so video generation can continue.

**GeminiService:**
- Purpose: Generate text plans, images, narration audio, and persisted generated media rows.
- Examples: `src/integrations/gemini/gemini-service.ts`.
- Pattern: Class-like singleton export `geminiService`; validates model responses with Zod, normalizes API errors, retries selected failures, writes `gemini-plan.json`, and falls back to Manus image generation when possible.

**ManusService:**
- Purpose: Encapsulate Manus task creation, polling, file discovery, and image download.
- Examples: `src/integrations/manus/manus-service.ts`, `src/integrations/manus/client.ts`.
- Pattern: Configurable class with mock behavior when no key exists and real HTTP requests when key/config is provided.

**Social Publisher Stub:**
- Purpose: Preserve a future publishing boundary without enabling external posting in the MVP.
- Examples: `src/integrations/social/publisher.ts`.
- Pattern: Interface plus implementation that throws `SocialPublishingNotConfiguredError`; scheduling currently only writes database rows in `src/features/schedule/actions.ts`.

**Local Storage Helpers:**
- Purpose: Keep filesystem writes/deletes/path generation centralized.
- Examples: `src/lib/storage/local-storage.ts`, `src/lib/paths.ts`.
- Pattern: Sanitize filenames, prefix stored files with UUIDs, ensure folders, assert delete targets stay inside `storageRoot`, and build generated MP4 paths.

**Prisma Client Singleton:**
- Purpose: Avoid excessive Prisma clients during development reloads.
- Examples: `src/lib/prisma.ts`.
- Pattern: Store `PrismaClient` on `globalThis` outside production and enable Prisma error/warn logs in development.

## Entry Points

**Root Layout:**
- Location: `src/app/layout.tsx`
- Triggers: Every App Router page render.
- Responsibilities: Load Geist fonts, set `pt-BR` language, global body classes, metadata, and `src/app/globals.css`.

**Home Redirect:**
- Location: `src/app/page.tsx`
- Triggers: Request to `/`.
- Responsibilities: Redirect users to `/dashboard`.

**Dashboard Page:**
- Location: `src/app/dashboard/page.tsx`
- Triggers: Request to `/dashboard`.
- Responsibilities: Show project counts and latest projects from `getDashboardStats()`.

**Content List Page:**
- Location: `src/app/contents/page.tsx`
- Triggers: Request to `/contents`.
- Responsibilities: Fetch all projects with `getContents()`, show deletion feedback, and render `ContentList`.

**New Content Page:**
- Location: `src/app/contents/new/page.tsx`
- Triggers: Request to `/contents/new`.
- Responsibilities: Render `CreateContentForm` and display creation errors from search params.

**Content Detail Page:**
- Location: `src/app/contents/[id]/page.tsx`
- Triggers: Request to `/contents/<id>`.
- Responsibilities: Fetch one project with `getContentById()`, render uploaded/generated media, display Gemini plan data through `readStoredGeminiPlan()`, run video generation form, delete action, and schedule form.

**Schedule Page:**
- Location: `src/app/schedule/page.tsx`
- Triggers: Request to `/schedule`.
- Responsibilities: Fetch scheduled posts with `getScheduledPosts()`, mark due scheduled posts visually as ready to post, and expose download/open/delete actions.

**Settings Page:**
- Location: `src/app/settings/page.tsx`
- Triggers: Request to `/settings`.
- Responsibilities: Read Manus settings, show environment summary, and render settings form.

**Global Loading and Error UI:**
- Location: `src/app/loading.tsx`, `src/app/error.tsx`, and `src/components/page-loading.tsx`.
- Triggers: App Router loading and error states.
- Responsibilities: Render loading skeletons and recoverable error UI.

**Create Content API:**
- Location: `src/app/api/content-projects/route.ts`
- Triggers: `POST /api/content-projects`.
- Responsibilities: Parse multipart upload form data, create project/uploads, and return JSON through `apiCreated()` or `apiError()`.

**Attach Media API:**
- Location: `src/app/api/content-projects/[id]/media/route.ts`
- Triggers: `POST /api/content-projects/<id>/media`.
- Responsibilities: Attach uploaded images and optional one audio file to an existing project.

**Generate Video API:**
- Location: `src/app/api/content-projects/[id]/generate/route.ts`
- Triggers: `POST /api/content-projects/<id>/generate`.
- Responsibilities: Generate MP4 for a project and optionally accept a JSON caption override.

**File API:**
- Location: `src/app/api/files/[...path]/route.ts`
- Triggers: `GET /api/files/<path>`.
- Responsibilities: Serve storage files safely, set MIME type, and optionally force download.

**Python Transcription Script:**
- Location: `scripts/transcribe_audio.py`
- Triggers: Spawned by `src/features/video/services/transcription-service.ts`.
- Responsibilities: Run faster-whisper, output segment/word timing JSON, and report dependency errors as JSON.

## Error Handling

**Strategy:** Throw typed or friendly errors in services, normalize errors at integration boundaries, update persistent project status for long-running workflows, and convert entry-point failures into redirects or JSON responses.

**Patterns:**
- API handlers wrap route logic in `try`/`catch` and call `apiError(error, fallback)` from `src/lib/api-response.ts`.
- Server actions use `redirect()` with URL-encoded query params for user-visible failures in `src/features/content/actions.ts`, `src/features/schedule/actions.ts`, and `src/features/settings/actions.ts`.
- Video generation catches failures in `VideoService.generateProjectVideo()`, updates `ContentProject.status` to `ERROR`, stores `errorMessage`, updates any created `GeneratedVideo` to `ERROR`, then throws a friendly message.
- Upload creation catches storage/database failures in `createProjectWithUploads()`, deletes project storage with `deleteProjectStorage()`, marks the project `ERROR`, and rethrows.
- Gemini errors are normalized by `normalizeGeminiError()` in `src/integrations/gemini/gemini-service.ts` for missing key, quota, rate limit, service availability, and permission cases.
- File serving in `src/app/api/files/[...path]/route.ts` returns `400` for path traversal and `404` for missing files.
- `TranscriptionService.transcribe()` in `src/features/video/services/transcription-service.ts` returns `null` on Python/Whisper errors so MP4 generation can use fallback caption timing.

## Cross-Cutting Concerns

**Logging:** Prisma logs `error` and `warn` in development and `error` in production through `src/lib/prisma.ts`. Subprocess stderr is captured inside `runProcess()` in `src/features/video/services/video-service.ts` and converted to thrown errors. No app-wide logger abstraction is present.

**Validation:** Use Zod for structured user input in `src/features/content/schemas.ts`, `src/features/schedule/actions.ts`, `src/features/settings/actions.ts`, and Gemini response validation in `src/integrations/gemini/gemini-service.ts`. Use service-level file type validation in `src/features/content/services/upload-service.ts`.

**Authentication:** Not detected. `User` and `SocialAccount` models exist in `prisma/schema.prisma`, but current pages/actions/API handlers do not enforce authentication or session ownership.

**Authorization:** Not detected. Project lookup and mutations currently operate by project ID without user scoping in `src/features/content/queries.ts`, `src/features/content/actions.ts`, and API handlers under `src/app/api/content-projects/`.

**Configuration:** Environment variables are read by name in code, including `DATABASE_URL` in `prisma/schema.prisma`, `LOCAL_STORAGE_ROOT` in `src/lib/paths.ts`, `FFMPEG_PATH` and `FFPROBE_PATH` in `src/features/video/services/video-service.ts`, Whisper variables in `src/features/video/services/transcription-service.ts`, and Gemini/Manus variables in `src/integrations/gemini/gemini-service.ts` and `src/integrations/manus/manus-service.ts`. Do not read or commit raw `.env` values.

**Path Aliases:** Use `@/*` imports for source modules as configured in `tsconfig.json`; avoid deep relative imports inside `src/`.

**Runtime Boundaries:** Keep filesystem, Prisma, FFmpeg, Python, Gemini, and Manus code in server-only modules. Client components are explicitly marked with `"use client"` in `src/components/submit-button.tsx`, `src/features/content/components/delete-content-button.tsx`, and `src/features/content/components/generate-video-button.tsx`.

---

*Architecture analysis: 2026-04-21*
