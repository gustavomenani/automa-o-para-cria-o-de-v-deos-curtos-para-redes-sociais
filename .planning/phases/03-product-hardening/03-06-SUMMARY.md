---
phase: 03-product-hardening
plan: 06
subsystem: ux-hardening
tags: [captions, schedule, errors, nextjs]
requires:
  - phase: 03-product-hardening
    provides: owner-scoped content actions and generation lock
provides:
  - caption review form and save action
  - server-side future schedule validation
  - shared safe error normalization
affects: [review, schedule, api]
tech-stack:
  added: []
  patterns: [safe error normalization, pure schedule validation helper]
key-files:
  created: [src/features/content/components/caption-review-form.tsx, src/features/schedule/validation.ts]
  modified: [src/app/contents/[id]/page.tsx, src/features/content/actions.ts, src/features/schedule/actions.ts, src/app/schedule/page.tsx, src/lib/api-response.ts]
key-decisions:
  - "Caption review edits only stored caption text; no timeline editor was introduced."
requirements-completed: [CAP-06, REV-04, SCH-04]
duration: 18min
completed: 2026-04-22
---

# Phase 03 Plan 06: Review and Error UX Hardening Summary

**Low-confidence captions can be revised, past schedules are rejected server-side, and user errors are normalized to safe Portuguese copy**

## Accomplishments

- Added `Revise a legenda` flow with owner-scoped caption save action.
- Extracted schedule validation and rejected `scheduledAt <= now` before persistence.
- Centralized API error redaction and server-side logging for sensitive diagnostics.

## Task Commits

1. **Task 1:** `2658e47` add caption review flow
2. **Task 2:** `2e97c90` reject past schedules
3. **Task 3:** `2cd751d` redact user-facing errors

## Verification

- `npm run lint` passed.
- `npm run build` passed with the known Turbopack tracing warning.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Extracted schedule validation helper**
- **Found during:** Task 2
- **Issue:** Future test plan needed deterministic validation without invoking a full Server Action.
- **Fix:** Added `src/features/schedule/validation.ts`.
- **Verification:** Build and later schedule validation tests passed.
- **Commit:** `2e97c90`

## Self-Check: PASSED

Created files exist and task commits are present in git history.
