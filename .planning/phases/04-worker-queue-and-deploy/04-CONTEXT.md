# Phase 4: Worker, Queue and Deploy - Context

**Gathered:** 2026-04-22
**Status:** Ready for planning
**Mode:** Auto-generated during autonomous continuation

<domain>
## Phase Boundary

This phase moves expensive and time-sensitive work out of web request paths and prepares the app for VPS/Docker operation. It should introduce a queue/worker contract, persist job state and retry metadata, enqueue AI/video/schedule work from the app, run due scheduled jobs without a browser session, prepare Docker services for app, worker, Postgres, Redis, FFmpeg/Python, and document a storage abstraction path for future S3/R2 migration.

</domain>

<decisions>
## Implementation Decisions

### Queue and Worker
- Prefer Redis plus BullMQ or an equivalent Node-friendly queue that fits the existing Next.js/Prisma stack.
- Long-running Gemini/Manus polling, provider downloads, Whisper transcription, FFmpeg rendering, and scheduled publishing wakeups should become worker jobs or be wrapped behind job-ready services.
- Web actions/routes should return quickly after enqueueing where practical, while preserving a synchronous-safe fallback only if needed for local development.
- Persist job status, attempts, error summaries, timestamps, and retry metadata in the database so failed jobs are visible and retryable.

### Deployment
- Docker setup should run the web app, worker, Postgres, Redis, and persistent media volumes.
- FFmpeg, Python, and Whisper dependencies must be documented or installed in the runtime image expected to execute media jobs.
- Deployment docs should target a VPS/Docker Compose path and avoid platform-specific assumptions not present in the roadmap.

### Storage Contract
- Do not migrate to S3/R2 in this phase unless the plan determines it is a small abstraction-only step.
- Introduce or document a storage contract so future object storage migration does not require rewriting business rules.
- Preserve local filesystem storage as the MVP implementation.

### Observability and Safety
- Worker logs should be structured enough to diagnose failures without leaking secrets, provider raw payloads, local paths, or API keys.
- Failed jobs should surface safe user-facing status and retain server-side diagnostic detail.
- Scheduled publishing should respect the Phase 5 social adapter boundary and avoid unofficial scraping or automation.

### the agent's Discretion
The planner may split implementation into queue infrastructure, enqueue/poll UI integration, worker job handlers, deployment files/docs, and storage contract work. Keep changes compatible with Phase 3 auth/ownership and generation-lock behavior.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/features/content/actions.ts` and content API routes currently trigger prompt and generation workflows.
- `src/features/video/services/video-service.ts` owns Whisper/FFmpeg generation and now includes generation locking.
- `src/integrations/gemini/gemini-service.ts` and `src/integrations/manus/manus-service.ts` own AI provider integration.
- `src/features/schedule/actions.ts` and queries own schedule persistence and validation.
- `src/integrations/social/publisher.ts` is the future social publishing boundary.
- `src/lib/storage/local-storage.ts` and `src/lib/paths.ts` own local media path behavior.
- `docker-compose.yml`, `package.json`, Prisma migrations, and README are the current deployment/documentation surface.

### Established Patterns
- Prisma is the persistence boundary for durable app state.
- Server actions and API routes normalize errors and redirect/return user-safe messages.
- Tests use Vitest; worker/storage/job logic should expose pure or service-level seams for tests.
- Phase 3 introduced auth/ownership and must remain enforced around queued work.

### Integration Points
- Content creation should enqueue provider asset jobs or persist a pending job when prompt automation is requested.
- Video generation should enqueue render jobs and expose status on the content detail page.
- Scheduled posts should be discoverable by worker code at due time.
- Docker Compose must provide Redis and persistent storage volumes alongside Postgres.
- Storage contract should sit under `src/lib/storage/` or an equivalent local infrastructure boundary.

</code_context>

<specifics>
## Specific Ideas

Keep the first queue implementation conservative: one worker entrypoint, explicit job names, typed payloads, Prisma-backed job/run status, and safe retry behavior. UI changes should show job state clearly without building a full operations dashboard.

</specifics>

<deferred>
## Deferred Ideas

- Real social publishing implementation belongs to Phase 5.
- Full S3/R2 migration can be deferred after a storage interface/contract exists.
- Advanced distributed tracing, metrics dashboards, and multi-worker autoscaling are out of scope for this milestone.

</deferred>
