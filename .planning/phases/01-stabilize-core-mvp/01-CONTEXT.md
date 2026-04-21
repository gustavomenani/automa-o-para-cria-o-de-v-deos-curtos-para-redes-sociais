# Phase 1: Stabilize Core MVP - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning
**Source:** Roadmap + current codebase map + user-reported subtitle issues

<domain>

## Phase Boundary

This phase stabilizes the existing MVP instead of expanding the product. The user must be able to run the current local app and complete:

1. Create content.
2. Upload or generate images/audio.
3. Generate vertical MP4 with caption burned in.
4. Review generated media.
5. Download video.
6. Schedule post.

The visible quality blocker is subtitle behavior in `src/features/video/services/video-service.ts`: timing drift, incorrect Whisper words, awkward text chunks, and fallback behavior. The phase should not introduce real social publishing, auth, queue workers, S3/R2, or a full video editor.

</domain>

<decisions>

## Implementation Decisions

### Preserve Existing MVP Flow

- Do not remove manual upload.
- Do not remove Gemini or Manus code paths.
- Do not alter the Prisma schema unless a task explicitly proves it is necessary.
- Do not implement Instagram, TikTok, or YouTube publication in this phase.
- Keep FFmpeg in `VideoService`; worker/queue migration is Phase 4.
- Existing local storage stays in place for Phase 1.

### Subtitle Stabilization

- Treat Whisper timestamps as the best timing source when transcription succeeds.
- Treat the project caption/script as the best text source when Whisper words are wrong.
- Avoid global proportional retiming when word/segment timestamps exist.
- Avoid making subtitles visually heavier; current desired style is white text, black outline, no background box, safe lower position.
- Split long captions into readable blocks without isolated one-word cues such as "vida", "terra", "amor" when they can be grouped naturally.
- Preserve fallback generation when Whisper is unavailable.

### UX and Safety

- Keep the UI simple and practical.
- Show user-facing warnings for uncertain caption sync, failed generation, or provider limitations.
- Avoid exposing raw FFmpeg, provider, local path, or secret details in UI messages.
- Update docs where current README text contradicts current implementation.

### the agent's Discretion

- Exact helper extraction boundaries for subtitle functions.
- Whether to add tests before or after helper extraction, as long as tests cover the risky caption behavior before substantial rewrites.
- Exact wording of smoke checklist and warning copy.

</decisions>

<canonical_refs>

## Canonical References

Downstream agents MUST read these before planning or implementing.

### Project Planning

- `.planning/PROJECT.md` - Product context, validated capabilities, constraints.
- `.planning/REQUIREMENTS.md` - Phase 1 requirement IDs and traceability.
- `.planning/ROADMAP.md` - Phase 1 scope and success criteria.
- `.planning/STATE.md` - Current project state and known in-progress files.

### Codebase Map

- `.planning/codebase/ARCHITECTURE.md` - Feature boundaries, data flow, services.
- `.planning/codebase/CONCERNS.md` - Known risks, fragile areas, gaps.
- `.planning/codebase/TESTING.md` - Current lack of test runner and recommended test targets.
- `.planning/codebase/INTEGRATIONS.md` - Gemini, Manus, FFmpeg, Whisper and storage integrations.

### Implementation Hotspots

- `src/features/video/services/video-service.ts` - FFmpeg rendering, ASS subtitle generation, caption timing/alignment.
- `src/features/video/services/transcription-service.ts` - Node wrapper for local Whisper subprocess.
- `scripts/transcribe_audio.py` - faster-whisper invocation and JSON output.
- `src/features/content/actions.ts` - Generate action, redirects, warning propagation.
- `src/app/contents/[id]/page.tsx` - Review page feedback and regenerate flow.
- `src/features/content/services/upload-service.ts` - Upload/storage/database flow.
- `README.md` - Local setup and docs that need correction.

### Project Instructions

- `AGENTS.md` - Next.js version warning; consult `node_modules/next/dist/docs/` before framework-level changes.

</canonical_refs>

<specifics>

## Specific Ideas

- Create pure helpers for caption normalization, segmentation, cue construction, ASS escaping, and quality scoring where practical.
- Add unit tests around caption helper behavior with Portuguese captions, punctuation, quotes, hashtags, and long phrases.
- Run at least `npm run lint` and `npm run build` for verification.
- For manual verification, use an existing project or create a small fixture project with multiple images, audio, and a long Portuguese caption.
- Update README to reflect that Manus is no longer purely mock-only if the current code performs real API calls/fallback.

</specifics>

<deferred>

## Deferred Ideas

- Queue/worker migration.
- Login and user ownership.
- Social publication adapters.
- S3/R2 object storage.
- Story-specific generation workflow.
- Advanced subtitle editor.

</deferred>

---

*Phase: 01-stabilize-core-mvp*
*Context gathered: 2026-04-21*
