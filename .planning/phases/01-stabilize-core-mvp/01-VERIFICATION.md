---
phase: "01-stabilize-core-mvp"
status: human_needed
updated: "2026-04-22T21:00:00Z"
source:
  - "01-01-SUMMARY.md"
  - "01-02-SUMMARY.md"
  - "01-03-SUMMARY.md"
---

# Phase 01 Verification

## Automated Checks

| Check | Status | Evidence |
|---|---|---|
| Caption helper tests | PASS | `npm test -- --run src/features/video/services/caption-helpers.test.ts` passed 1 file / 8 tests. |
| Lint | PASS | `npm run lint` completed with no ESLint errors. |
| Production build | PASS | `npm run build` completed on Next.js 16.2.4. |
| Docker Compose config | PASS | `docker compose config` returned valid PostgreSQL service config. |
| Smoke checklist structure | PASS | Required marker rows and required terms are present. |

## Human Verification Required

The following rows in `01-SMOKE-CHECKLIST.md` are intentionally not marked PASS because they require a live browser run with local media fixtures:

1. `CREATE` - create a real project at `/contents/new`.
2. `UPLOAD` - upload 2-4 images and one audio file, plus invalid media rejection.
3. `GENERATE` - generate/regenerate MP4 through FFmpeg.
4. `REVIEW` - inspect `/contents/[id]`, 1080x1920 preview, and readable captions.
5. `DOWNLOAD` - download the generated MP4 through `download=1`.
6. `SCHEDULE` - save schedule and observe `/schedule` including `Pronto para postar` when due.
7. `DELETE` - delete the project and confirm it disappears from content and schedule views.
8. `ASSISTED` - optional Gemini/Manus path; may stay SKIPPED if credentials are not configured.

## Status

`human_needed`

Automated quality gates passed, but Phase 1 is not fully human-verified until the browser smoke checklist has concrete PASS/FAIL evidence for the MVP flow.
