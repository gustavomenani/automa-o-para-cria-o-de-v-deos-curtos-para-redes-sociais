---
phase: "01-stabilize-core-mvp"
plan: "01"
subsystem: "video"
tags: ["captions", "whisper", "ffmpeg", "vitest", "nextjs"]
requires: []
provides:
  - "Pure caption helper coverage for Portuguese subtitle normalization, segmentation, alignment, timing, and ASS escaping"
  - "VideoService integration that uses project caption text with Whisper timing when available"
affects: ["video-generation", "caption-rendering", "review-ui"]
tech-stack:
  added: ["vitest"]
  patterns: ["Pure caption helpers isolated from FFmpeg/Prisma orchestration", "Stable Portuguese user-facing video errors"]
key-files:
  created:
    - "src/features/video/services/caption-helpers.ts"
    - "src/features/video/services/caption-helpers.test.ts"
  modified:
    - "package.json"
    - "package-lock.json"
    - "src/features/video/services/video-service.ts"
    - "src/features/video/services/transcription-service.ts"
    - "scripts/transcribe_audio.py"
key-decisions:
  - "Use Whisper word or segment timing as the timing authority while keeping project caption/script text as the text authority."
  - "Persist only stable Portuguese generation errors and caption warnings to user-visible state."
requirements-completed: ["VID-01", "VID-02", "VID-03", "VID-04", "VID-05", "CAP-01", "CAP-02", "CAP-03", "CAP-04", "CAP-05"]
duration: "pre-existing implementation verified in current run"
completed: "2026-04-22"
---

# Phase 01 Plan 01: Caption Stabilization Summary

**Portuguese caption helpers with Whisper-timed alignment, fallback timing, ASS escaping, and safe video-generation error persistence**

## Performance

- **Duration:** Verified during this run; implementation already existed in prior commit.
- **Started:** 2026-04-22T20:49:35Z
- **Completed:** 2026-04-22T20:53:00Z
- **Tasks:** 3/3
- **Files modified:** 7 planned files plus existing Vitest config

## Accomplishments

- Added deterministic Vitest coverage for VOZ OFF extraction, Portuguese text cleanup, readable caption blocks, orphan-word merging, Whisper alignment, fallback timing, weak-alignment warnings, and ASS escaping.
- Extracted pure caption helpers from VideoService while keeping FFmpeg, ffprobe, temp files, Prisma persistence, and output rendering orchestration inside VideoService.
- Preserved the transcription JSON contract: Python emits JSON-only stdout on success, Node parses `segments[].words`, invalid timings are filtered, and Whisper failure falls back without aborting MP4 generation.
- Sanitized generation failure persistence to stable Portuguese copy while keeping raw diagnostics server-side only.

## Task Commits

The implementation was already present before this execution pass:

1. **Task 1-3: Caption helper tests, extraction, and transcription contract** - `93de2ac` (`feat(01): stabilize caption generation pipeline`)

No new source commit was created for this plan because the planned source files were already clean against HEAD when execution began.

## Files Created/Modified

- `src/features/video/services/caption-helpers.ts` - Pure caption normalization, segmentation, timing, alignment, quality scoring, and ASS escaping helpers.
- `src/features/video/services/caption-helpers.test.ts` - Focused caption behavior tests.
- `src/features/video/services/video-service.ts` - Uses helper functions while retaining video orchestration and safe status persistence.
- `src/features/video/services/transcription-service.ts` - Keeps JSON parsing and word timestamp filtering.
- `scripts/transcribe_audio.py` - Emits faster-whisper JSON with word timestamps.
- `package.json` / `package-lock.json` - Vitest test runner.

## Decisions Made

- Whisper timestamps are authoritative only for timing; final subtitle words come from the project script/caption.
- Proportional timing is reserved for unavailable or unusable transcription.
- Safe Portuguese error copy is persisted to `ContentProject.errorMessage`; raw subprocess/provider details are not user-facing.

## Deviations from Plan

### Auto-fixed Issues

None during this execution pass. Prior implementation already satisfied the planned source changes.

---

**Total deviations:** 0 auto-fixed.
**Impact on plan:** Plan behavior was verified without changing planned source files in this run.

## Issues Encountered

- Initial `npm run lint` was blocked by syntax errors in already-dirty files outside Plan 01. I removed only duplicate trailing JSX/function closures in `src/app/settings/page.tsx` and `src/features/content/components/create-content-form.tsx`; both files remain uncommitted dirty work owned by the broader workspace.

## Verification

- `npm test -- --run src/features/video/services/caption-helpers.test.ts`: PASS, 1 file and 8 tests passed.
- `npm run lint`: PASS after the blocking dirty-file syntax fix.
- `npm run build`: PASS after the Plan 02 page type fixes.

## Known Stubs

None in the planned caption/video files.

## Self-Check: PASSED

- Planned helper and test files exist.
- Existing implementation commit `93de2ac` exists.
- Verification commands listed above completed successfully.

## Next Phase Readiness

Caption generation is ready for review-page warnings and smoke validation. Browser-level validation still requires manual fixture media and a live local run.

---
*Phase: 01-stabilize-core-mvp*
*Completed: 2026-04-22*
