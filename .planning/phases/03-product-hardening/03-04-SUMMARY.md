---
phase: 03-product-hardening
plan: 04
subsystem: media-validation
tags: [uploads, vitest, ffprobe, security]
requires:
  - phase: 03-product-hardening
    provides: owner-scoped upload entry points
provides:
  - shared signature/count/size/duration media validation
  - upload validation tests
  - persistent upload helper copy
affects: [uploads, content-api, media-processing]
tech-stack:
  added: []
  patterns: [validate before storage writes, mockable audio duration probe]
key-files:
  created: [src/features/content/services/media-validation.ts, src/features/content/services/media-validation.test.ts]
  modified: [src/features/content/services/upload-service.ts, src/features/content/components/create-content-form.tsx]
key-decisions:
  - "Validation uses file signatures and a mockable ffprobe duration probe before storage writes."
requirements-completed: [MED-04, SEC-03]
duration: 18min
completed: 2026-04-22
---

# Phase 03 Plan 04: Upload Validation Summary

**Shared media validator rejects spoofed, oversized, excessive, or too-long uploads before local storage and processing**

## Accomplishments

- Added PNG/JPEG/WebP and MP3/WAV/M4A signature detection.
- Enforced image count, one audio file, per-file size, total size, and audio duration limits.
- Added persistent Portuguese upload guidance in the create form.

## Task Commits

1. **Task 1:** `5626a8e` add media validation coverage
2. **Task 2:** `d3a08e3` enforce media validation before storage
3. **Task 3:** `d57f6a3` show upload limit guidance

## Verification

- `npm test -- --run src/features/content/services/media-validation.test.ts` passed.
- `npm run build` passed with one advisory Turbopack tracing warning.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `next build` reports an advisory Turbopack NFT tracing warning for `media-validation.ts` imported by upload route handlers. Build exits 0; tracked as verification warning.

## Self-Check: PASSED

Created files exist and task commits are present in git history.
