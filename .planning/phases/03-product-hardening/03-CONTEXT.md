# Phase 3: Product Hardening - Context

**Gathered:** 2026-04-22
**Status:** Ready for planning
**Mode:** Auto-generated during autonomous continuation

<domain>
## Phase Boundary

This phase turns the local MVP into a safer product surface before external use. It should add simple authentication and ownership boundaries, reject unsafe uploads before processing, prevent concurrent generation corruption, improve user-safe error handling, validate scheduling rules, expose a manual caption review path for uncertain captions, and add tests around the riskiest pure/domain logic.

</domain>

<decisions>
## Implementation Decisions

### Security and Ownership
- Prefer a simple session/auth model that fits the existing Prisma `User` model and Next.js App Router server-action architecture.
- All content, media, generated videos, schedules, and settings reads/mutations should be scoped to the authenticated owner.
- Anonymous users must not create, read, mutate, download, or delete private project data.
- Sensitive keys and provider diagnostics must remain server-side and should not be rendered into pages or committed files.

### Media and Processing Guards
- Add upload limits for file size, total upload size, image count, and audio duration before expensive processing.
- Validate file signatures instead of trusting only browser-provided MIME type.
- Prevent concurrent generation for the same project from corrupting project/video state.
- Keep current local storage behavior, but isolate validation logic so future S3/R2 migration is not blocked.

### UX and Error Handling
- Keep errors clear and actionable for the user while preserving detailed diagnostics server-side.
- Add manual caption review/edit affordance only where it reduces risk for low-confidence caption output; do not build a full timeline editor.
- Validate new schedules so past dates are rejected before persistence.
- Preserve the existing dashboard/content/review/schedule flow and manual upload fallback.

### Testing
- Prioritize automated tests for pure caption helpers, storage path guards, upload validation, schedule validation, deletion cleanup, and concurrency guard behavior.
- Keep tests focused on high-risk logic and compatible with the existing Vitest setup.

### the agent's Discretion
The planner may split this phase into multiple plans by ownership boundary: auth/ownership, validation/concurrency, caption/error UX, and tests. Use existing codebase conventions and avoid broad redesigns outside the roadmap scope.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `prisma/schema.prisma` already has `User`, `ContentProject`, `MediaFile`, `GeneratedVideo`, `ScheduledPost`, `SocialAccount`, and `ManusSettings` models.
- `src/features/content/actions.ts`, `src/features/schedule/actions.ts`, and `src/features/settings/actions.ts` are the main mutation boundaries.
- `src/features/content/queries.ts`, `src/features/schedule/queries.ts`, and `src/features/settings/queries.ts` are the main read boundaries.
- `src/features/content/services/upload-service.ts` owns multipart parsing, file validation, local storage writes, and project creation.
- `src/features/video/services/video-service.ts` owns generation state transitions and FFmpeg/Whisper orchestration.
- `src/lib/storage/local-storage.ts` already centralizes storage path handling and delete guards.

### Established Patterns
- Server actions validate and redirect with query-string feedback.
- API routes return JSON through shared response helpers.
- Prisma access is centralized through `src/lib/prisma.ts`.
- User-facing text should be redacted and friendly; provider/internal details should stay out of rendered UI.
- Tests run through Vitest and currently cover pure helper logic.

### Integration Points
- Auth must connect to route rendering, server actions, API routes, and file serving.
- Ownership scoping must be applied consistently to content, media, videos, schedules, and settings.
- Upload validation must run before storage writes and before FFmpeg/Whisper paths.
- Generation locking must wrap both server action and API generation entry points.
- Schedule validation must protect both page form actions and future worker-oriented code.

</code_context>

<specifics>
## Specific Ideas

Use the existing design language and avoid large new UI surfaces. For caption review, add a practical review/edit control or warning flow tied to uncertain caption quality rather than a timeline editor. For auth, choose the simplest durable route that can be implemented and tested within this phase.

</specifics>

<deferred>
## Deferred Ideas

- Queue/worker execution and persistent job logs belong to Phase 4.
- Object storage migration implementation belongs to Phase 4.
- Social publishing credentials and platform adapters belong to Phase 5.
- Advanced teams, roles, and multi-client account management are out of scope for v1.

</deferred>
