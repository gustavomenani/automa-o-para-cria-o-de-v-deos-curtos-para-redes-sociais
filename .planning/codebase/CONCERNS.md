# Codebase Concerns

**Analysis Date:** 2026-04-21

## Tech Debt

**Authentication and tenancy are modeled but not enforced:**
- Issue: The Prisma schema has `User`, `SocialAccount`, and nullable `ContentProject.userId`, but create/read/update/delete flows do not authenticate a user or scope records by owner.
- Files: `prisma/schema.prisma`, `src/features/content/actions.ts`, `src/features/content/queries.ts`, `src/features/schedule/actions.ts`, `src/app/api/content-projects/route.ts`, `src/app/api/content-projects/[id]/media/route.ts`, `src/app/api/content-projects/[id]/generate/route.ts`
- Impact: Any caller that can reach the app can create projects, upload media, generate videos, delete content, read project data, and schedule posts across all records.
- Fix approach: Add an auth provider and require a session in server actions and API routes. Make `ContentProject.userId` required for user-owned content, pass `userId` through creates, and add `where: { id, userId }` constraints to reads, writes, deletes, and scheduling.

**Long media jobs run inside request/server-action handlers:**
- Issue: Gemini calls, Manus polling, Whisper transcription, ffprobe, and FFmpeg execution all run synchronously from route handlers or server actions.
- Files: `src/features/content/actions.ts`, `src/app/api/content-projects/[id]/generate/route.ts`, `src/features/video/services/video-service.ts`, `src/integrations/gemini/gemini-service.ts`, `src/integrations/manus/manus-service.ts`, `src/features/video/services/transcription-service.ts`
- Impact: Requests can remain open for minutes, fail on platform timeouts, duplicate work on retries, and consume server resources while the browser waits.
- Fix approach: Move generation to a job queue with persisted job state. Keep API/server actions limited to enqueueing work and returning job IDs, then poll or stream status from dedicated read endpoints.

**Local filesystem storage is the persistence layer for media:**
- Issue: Uploaded media, generated assets, Gemini plans, and MP4 outputs are stored under local `storage/` paths and absolute paths are persisted in the database.
- Files: `src/lib/paths.ts`, `src/lib/storage/local-storage.ts`, `src/integrations/gemini/gemini-service.ts`, `src/features/video/services/video-service.ts`, `prisma/schema.prisma`
- Impact: Production deployments with ephemeral disks or multiple instances can lose files, serve stale database paths, and fail when a job runs on a different machine than the upload.
- Fix approach: Replace `storage/` with object storage such as S3/R2/Supabase Storage. Store object keys instead of absolute filesystem paths and generate signed URLs for review/download.

**Generated video history points at one mutable output path:**
- Issue: Every generation for a project writes to `storage/generated/<projectId>.mp4`, while each run creates a new `GeneratedVideo` row with the same path.
- Files: `src/lib/storage/local-storage.ts`, `src/features/video/services/video-service.ts`, `src/features/content/queries.ts`, `src/app/contents/[id]/page.tsx`
- Impact: Regenerating overwrites the file for all previous `GeneratedVideo` records, so historical rows do not represent immutable outputs and concurrent generations race on the same file.
- Fix approach: Include the `GeneratedVideo.id` or a generation timestamp in the output key. Create the `GeneratedVideo` row before computing the output path, and display/delete each version independently.

**Settings are global singleton-by-convention only:**
- Issue: `ManusSettings` allows multiple rows and callers select the newest row with `findFirst({ orderBy: { updatedAt: "desc" } })`.
- Files: `prisma/schema.prisma`, `src/features/settings/actions.ts`, `src/features/settings/queries.ts`, `src/integrations/gemini/gemini-service.ts`
- Impact: Concurrent saves can create ambiguous active settings, and there is no tenant boundary for per-user or per-workspace configuration.
- Fix approach: Add a fixed singleton key or owner key with a unique constraint. Use `upsert` against that key instead of `findFirst` plus conditional create/update.

**External integration errors are returned directly to clients:**
- Issue: API helpers and actions often forward `error.message` to JSON responses, redirect query strings, or persisted `errorMessage` fields.
- Files: `src/lib/api-response.ts`, `src/features/content/actions.ts`, `src/features/video/services/video-service.ts`, `src/integrations/manus/manus-service.ts`, `src/integrations/gemini/gemini-service.ts`, `src/app/contents/[id]/page.tsx`
- Impact: FFmpeg stderr, upstream API response bodies, local paths, model names, and operational details can appear in UI, API responses, or database records.
- Fix approach: Log detailed errors server-side with request/job IDs. Return stable user-facing error codes/messages and redact upstream payloads before persistence or redirects.

## Known Bugs

**Scheduled posts are never published:**
- Symptoms: A scheduled post remains a database row with status `SCHEDULED`; the UI changes it to "Pronto para postar" when time passes, but no network publishing occurs.
- Files: `src/features/schedule/actions.ts`, `src/features/schedule/queries.ts`, `src/app/schedule/page.tsx`, `src/integrations/social/publisher.ts`
- Trigger: Create a post for a time that has passed or wait until `scheduledAt` is due.
- Workaround: Download the generated video from `/schedule` and publish manually.

**Past schedules can be saved by bypassing the browser date input:**
- Symptoms: `schedulePostAction` accepts any valid `date`/`time`; only the UI date input sets `min={today}`.
- Files: `src/features/schedule/actions.ts`, `src/app/contents/[id]/page.tsx`
- Trigger: Submit a crafted form request with a past date/time.
- Workaround: Validate `scheduledAt > new Date()` in `schedulePostAction` before writing `ScheduledPost`.

**Concurrent generation for the same project can corrupt state:**
- Symptoms: Two requests can both set a project to `PROCESSING`, both write the same MP4 output path, and then whichever finishes last determines the project status and file contents.
- Files: `src/features/video/services/video-service.ts`, `src/lib/storage/local-storage.ts`, `src/app/api/content-projects/[id]/generate/route.ts`, `src/features/content/actions.ts`
- Trigger: Click generate repeatedly, submit the API route concurrently, or retry a slow request.
- Workaround: Add a project-level generation lock, queue deduplication key, or transactional status transition from non-processing states only.

**Failed upload cleanup leaves errored project records:**
- Symptoms: `createProjectWithUploads` creates a `ContentProject`, then on media save failure deletes storage and marks the project `ERROR` instead of rolling back the project creation.
- Files: `src/features/content/services/upload-service.ts`
- Trigger: A file passes initial validation but storage or database media insertion fails after project creation.
- Workaround: Wrap project creation and media row creation in a transaction where possible, or delete the project on upload failure after cleaning filesystem artifacts.

## Security Considerations

**Mutation APIs have no authentication, authorization, CSRF, or rate limits:**
- Risk: Public callers can upload arbitrary volumes of allowed media, start expensive Gemini/FFmpeg/Whisper work, and mutate or delete records.
- Files: `src/app/api/content-projects/route.ts`, `src/app/api/content-projects/[id]/media/route.ts`, `src/app/api/content-projects/[id]/generate/route.ts`, `src/features/content/actions.ts`, `src/features/schedule/actions.ts`, `src/features/settings/actions.ts`
- Current mitigation: Input schemas and MIME allowlists reject some malformed payloads.
- Recommendations: Require authenticated sessions on all server mutations, add origin/CSRF protection for server actions where applicable, and apply per-user/IP rate limits to upload and generation endpoints.

**File download route exposes storage objects by path knowledge:**
- Risk: `/api/files/[...path]` serves any file under `storageRoot` without checking project ownership or authorization.
- Files: `src/app/api/files/[...path]/route.ts`, `src/lib/paths.ts`, `src/app/contents/[id]/page.tsx`, `src/app/schedule/page.tsx`
- Current mitigation: Path traversal outside `storageRoot` is blocked.
- Recommendations: Resolve the requested object to a `MediaFile` or `GeneratedVideo`, verify the current user can access the owning `ContentProject`, and prefer short-lived signed URLs for object storage.

**Manus API keys are stored in plaintext application data:**
- Risk: A database read or backup exposes the `ManusSettings.apiKey` value.
- Files: `prisma/schema.prisma`, `prisma/migrations/20260421000200_add_manus_settings/migration.sql`, `src/features/settings/actions.ts`, `src/features/settings/queries.ts`, `src/app/settings/page.tsx`, `src/integrations/gemini/gemini-service.ts`
- Current mitigation: The settings page does not render the saved key value back into the form.
- Recommendations: Store secret material in a secret manager or encrypted-at-rest field using a server-side KMS key. Persist only a reference, key ID, or masked metadata in `manus_settings`.

**Upload validation trusts client-provided MIME type:**
- Risk: A caller can label arbitrary bytes as an allowed image/audio MIME type and store them under `storage/uploads`.
- Files: `src/features/content/services/upload-service.ts`, `src/lib/storage/local-storage.ts`, `src/app/api/files/[...path]/route.ts`
- Current mitigation: Allowed MIME strings are checked before saving.
- Recommendations: Detect file signatures with a server-side parser, reject mismatched extensions/content, normalize images/audio before use, and scan uploads if the app accepts untrusted users.

**Uploads have no size, count, or duration limits:**
- Risk: Large files can exhaust memory, disk, CPU, and FFmpeg/Whisper processing time.
- Files: `src/features/content/services/upload-service.ts`, `src/lib/storage/local-storage.ts`, `src/app/api/content-projects/route.ts`, `src/app/api/content-projects/[id]/media/route.ts`
- Current mitigation: File type allowlists restrict formats only.
- Recommendations: Enforce max upload size per file, max total request size, max image count, max audio duration, and quota per user/project before reading files into memory.

## Performance Bottlenecks

**Uploaded and generated files are buffered fully in memory:**
- Problem: `file.arrayBuffer()` and upstream image/audio responses are converted to `Buffer` before writing to disk.
- Files: `src/lib/storage/local-storage.ts`, `src/features/content/services/upload-service.ts`, `src/integrations/gemini/gemini-service.ts`, `src/integrations/manus/manus-service.ts`
- Cause: The storage API writes whole buffers instead of streaming from request/upstream response to disk/object storage.
- Improvement path: Stream multipart uploads and upstream downloads to storage, enforce size limits during streaming, and store only metadata in memory.

**FFmpeg and ffprobe have no process timeout:**
- Problem: `runProcess` in the video service waits until child process close with no timeout or kill path.
- Files: `src/features/video/services/video-service.ts`
- Cause: The helper captures stdout/stderr but does not accept a timeout or abort signal.
- Improvement path: Add configurable timeouts for ffprobe and FFmpeg, kill process trees on timeout, and mark the generation job failed with a redacted reason.

**Whisper model startup happens per transcription:**
- Problem: `scripts/transcribe_audio.py` creates a new `WhisperModel` for every transcription request.
- Files: `scripts/transcribe_audio.py`, `src/features/video/services/transcription-service.ts`
- Cause: Transcription is implemented as a short-lived Python process per audio file.
- Improvement path: Run transcription in a worker process/service that keeps the model warm, or cache the model in a long-lived worker queue.

**List pages have no pagination:**
- Problem: Content and schedule queries load all matching rows and nested generated videos.
- Files: `src/features/content/queries.ts`, `src/features/schedule/queries.ts`, `src/app/contents/page.tsx`, `src/app/schedule/page.tsx`
- Cause: `findMany` calls omit `take`/cursor pagination except for dashboard.
- Improvement path: Add cursor pagination and narrow `select` fields for list pages. Keep detailed media/video includes only on detail pages.

**Gemini and Manus generation is sequential and retry-light:**
- Problem: Gemini image generation loops through prompts and models sequentially; Manus polling checks every five seconds for up to ninety seconds inside the request path.
- Files: `src/integrations/gemini/gemini-service.ts`, `src/integrations/manus/manus-service.ts`
- Cause: The integration layer is optimized for MVP simplicity, not throughput.
- Improvement path: Use queued steps with bounded parallelism, provider-level rate limiting, exponential backoff with jitter, and resumable job state.

## Fragile Areas

**Caption alignment and ASS subtitle generation are dense and untested:**
- Files: `src/features/video/services/video-service.ts`, `src/features/video/services/transcription-service.ts`, `scripts/transcribe_audio.py`
- Why fragile: Normalization, fuzzy matching, segment splitting, timestamp rebalance, ASS escaping, and FFmpeg filter escaping live in one large service with many edge cases.
- Safe modification: Extract pure caption functions into a separate module and add unit tests with Portuguese punctuation, emoji, hashtags, `VOZ OFF`, long words, failed transcription, and empty captions before changing behavior.
- Test coverage: No test files or test runner configuration are present in `src/`, `prisma/`, or `scripts/`.

**Filesystem cleanup depends on database paths and post-delete behavior:**
- Files: `src/features/content/actions.ts`, `src/lib/storage/local-storage.ts`, `src/features/content/services/upload-service.ts`, `src/integrations/gemini/gemini-service.ts`
- Why fragile: Content deletion removes the database row before deleting files. Cleanup relies on absolute paths previously stored in `GeneratedVideo.path` and `MediaFile.path`.
- Safe modification: Capture object keys before delete, run storage cleanup with idempotent retries, and record failed cleanup tasks for later repair.
- Test coverage: No tests cover delete failure, invalid paths, generated asset cleanup, or partial storage/database failure.

**Path handling has mixed root assumptions:**
- Files: `src/lib/paths.ts`, `src/lib/storage/local-storage.ts`, `src/features/video/services/video-service.ts`, `src/integrations/gemini/gemini-service.ts`, `src/app/api/files/[...path]/route.ts`
- Why fragile: Most storage paths use `storageRoot`, but `VideoService.getProjectCaptionText` builds `process.cwd()/storage/uploads/<id>/gemini-plan.json` directly instead of using `uploadRoot`.
- Safe modification: Centralize all storage key/path construction in `src/lib/paths.ts` and prohibit direct `process.cwd()/storage` joins outside that module.
- Test coverage: No tests cover custom `LOCAL_STORAGE_ROOT`, Windows path separators, public URL conversion, or traversal rejection.

**Manus integration contains live-client and mock behavior in one class:**
- Files: `src/integrations/manus/manus-service.ts`, `src/integrations/manus/client.ts`, `src/integrations/gemini/gemini-service.ts`
- Why fragile: Methods return mock task/message/file data when no API key exists, but other callers also use the same class for real HTTP calls and fallback image generation.
- Safe modification: Split mock and real implementations behind the `SocialPublisher`/integration-style interface. Keep provider response parsing isolated from fallback behavior.
- Test coverage: No tests cover Manus response shapes, failed downloads, attachment filtering, or mock-vs-real behavior.

## Scaling Limits

**Single-server local media storage:**
- Current capacity: Limited by local disk, Node process memory, and one server instance's filesystem.
- Limit: Horizontal scaling, serverless deployments, container restarts, and disk cleanup all break the assumption that paths under `storage/` are durable and locally readable.
- Scaling path: Move media to object storage, store object keys, and run media jobs in workers that read/write the same shared storage backend.

**CPU-bound video/transcription work shares the web process:**
- Current capacity: One Node process spawns FFmpeg, ffprobe, and Python processes directly from web requests.
- Limit: A small number of concurrent generations can saturate CPU, memory, and process slots, degrading all pages and API routes.
- Scaling path: Use a worker queue with concurrency controls, per-job resource limits, and separate worker hosts for FFmpeg/Whisper workloads.

**Database queries are global and unpartitioned:**
- Current capacity: Lists query all projects/posts without tenant filters or pagination.
- Limit: As content grows, list pages and dashboard counts become slower and expose cross-user data if auth is added without query scoping.
- Scaling path: Add user/workspace scoping, pagination, covering indexes for common list filters, and select-only fields for summary views.

## Dependencies at Risk

**Preview AI model identifiers are hard-coded:**
- Risk: Gemini image/TTS model names include preview variants and can change availability or behavior.
- Impact: Asset generation and narration can fail even when the API key is valid.
- Migration plan: Move model names to validated configuration, add provider capability checks, and keep fallback providers behind an interface.
- Files: `src/integrations/gemini/gemini-service.ts`

**External CLIs and Python packages are runtime prerequisites:**
- Risk: FFmpeg, ffprobe, Python, and `faster-whisper` are required for full generation quality but are outside `package.json`.
- Impact: Deployments can pass `npm install` and still fail video duration detection, MP4 generation, or timestamped transcription.
- Migration plan: Add a startup health check for FFmpeg/ffprobe/Python/Whisper, document production images, and make the worker container own these dependencies.
- Files: `src/features/video/services/video-service.ts`, `src/features/video/services/transcription-service.ts`, `scripts/transcribe_audio.py`, `requirements-whisper.txt`, `README.md`

**Next.js version has project-specific caution instructions:**
- Risk: `AGENTS.md` states this Next.js version has breaking API/convention changes and requires reading `node_modules/next/dist/docs/` before writing code.
- Impact: Framework changes can break route handler, server action, or App Router assumptions if future edits rely on older Next.js knowledge.
- Migration plan: Treat `node_modules/next/dist/docs/` as the source of truth for Next.js changes in this repo and verify route/server-action patterns against those docs before framework-level edits.
- Files: `AGENTS.md`, `package.json`, `next.config.ts`, `src/app/api/content-projects/route.ts`, `src/features/content/actions.ts`

## Missing Critical Features

**No automated publisher or scheduler worker:**
- Problem: Scheduled posts are stored but no process invokes social network APIs or transitions due posts from `SCHEDULED` to `PUBLISHED`/`FAILED`.
- Blocks: Real social media automation, retry policies, delivery auditing, and failure notifications.
- Files: `src/features/schedule/actions.ts`, `src/app/schedule/page.tsx`, `src/integrations/social/publisher.ts`, `prisma/schema.prisma`

**No provider credential management beyond local env/plain database fields:**
- Problem: Gemini uses process environment configuration, and Manus settings can be saved in the database as plaintext.
- Blocks: Secure multi-user/provider configuration, key rotation, audit logging, and production secret handling.
- Files: `src/integrations/gemini/gemini-service.ts`, `src/features/settings/actions.ts`, `src/features/settings/queries.ts`, `prisma/schema.prisma`

**No operational observability:**
- Problem: There is no structured logging, tracing, metrics, job status history, or error tracking integration.
- Blocks: Diagnosing failed generations, provider outages, slow media processing, storage cleanup failures, and user-impacting incidents.
- Files: `src/lib/prisma.ts`, `src/lib/api-response.ts`, `src/features/video/services/video-service.ts`, `src/integrations/gemini/gemini-service.ts`, `src/integrations/manus/manus-service.ts`

**No media lifecycle management:**
- Problem: Generated assets and uploads are retained until a project is deleted; there is no quota, expiration, orphan cleanup, or storage usage report.
- Blocks: Predictable disk cost, abuse prevention, and recovery from partial failures.
- Files: `src/lib/storage/local-storage.ts`, `src/features/content/actions.ts`, `src/features/content/services/upload-service.ts`, `src/integrations/gemini/gemini-service.ts`

## Test Coverage Gaps

**No automated test suite is configured:**
- What's not tested: Routes, server actions, Prisma queries, storage helpers, FFmpeg command construction, caption alignment, Gemini/Manus parsing, settings, scheduling, and deletion flows.
- Files: `package.json`, `src/`, `prisma/`, `scripts/`
- Risk: Behavioral regressions can ship with only TypeScript/ESLint coverage.
- Priority: High

**Upload and storage edge cases are untested:**
- What's not tested: MIME spoofing, oversized files, multiple audio files, storage write failure, database write failure after file save, deletion path guards, and public URL generation.
- Files: `src/features/content/services/upload-service.ts`, `src/lib/storage/local-storage.ts`, `src/lib/paths.ts`, `src/app/api/files/[...path]/route.ts`
- Risk: Security and data-consistency issues can break production content or expose files.
- Priority: High

**Generation state transitions are untested:**
- What's not tested: `DRAFT` to `PROCESSING` to `READY`, error transitions, failed generated video row updates, repeated generation, concurrent generation, and caption warning persistence.
- Files: `src/features/video/services/video-service.ts`, `src/features/content/actions.ts`, `src/app/api/content-projects/[id]/generate/route.ts`, `prisma/schema.prisma`
- Risk: Projects can get stuck in incorrect states or show/download the wrong MP4.
- Priority: High

**External integration fallback paths are untested:**
- What's not tested: Gemini quota/errors, invalid JSON response extraction, no inline data, Manus fallback image generation, Manus timeout, and attachment download failures.
- Files: `src/integrations/gemini/gemini-service.ts`, `src/integrations/manus/manus-service.ts`
- Risk: Provider changes and transient failures can silently degrade generation or surface unsafe/internal errors.
- Priority: Medium

**Scheduling behavior is untested:**
- What's not tested: Past dates, timezone interpretation, projects without ready videos, duplicate schedules, status display after due time, and future publisher integration.
- Files: `src/features/schedule/actions.ts`, `src/features/schedule/queries.ts`, `src/app/schedule/page.tsx`, `src/integrations/social/publisher.ts`
- Risk: Scheduling can mislead users because saved rows are not actual publications.
- Priority: Medium

---

*Concerns audit: 2026-04-21*
