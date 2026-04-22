---
phase: 02-ai-asset-pipeline
plan: 03
subsystem: ui
tags: [nextjs, prisma, manus, gemini, asset-generation, redaction]
requires:
  - phase: 02-ai-asset-pipeline
    provides: asset generation run persistence and Manus/Gemini orchestration
provides:
  - Latest provider run visibility on content detail pages
  - Manus-first create-flow copy with Gemini fallback expectations
  - Settings and README documentation aligned to real provider behavior
affects: [content-review, content-create, settings, ai-provider-docs]
tech-stack:
  added: []
  patterns:
    - Pure display helpers for redacted provider run UI
    - Latest-run Prisma selection scoped to UI fields
key-files:
  created:
    - src/features/content/asset-run-display.ts
    - src/features/content/asset-run-display.test.ts
  modified:
    - src/features/content/queries.ts
    - src/app/contents/[id]/page.tsx
    - src/features/content/components/create-content-form.tsx
    - src/app/settings/page.tsx
    - README.md
key-decisions:
  - "Centralized asset-run display formatting and redaction in a pure helper module so detail-page rendering does not duplicate safety logic."
  - "Kept the existing intent=gemini action contract while changing user-facing copy to Manus-first."
patterns-established:
  - "Provider summaries must pass through getDisplaySafeMessage before rendering."
  - "Provider task IDs are masked before display."
requirements-completed: [CONT-02, AI-01, AI-02, AI-03, AI-04, AI-05]
duration: 32min
completed: 2026-04-22
---

# Phase 02 Plan 03: UI Pipeline Visibility Summary

**Manus/Gemini asset run outcomes are visible in the review UI with redacted diagnostics, missing-media guidance, and provider-accurate copy.**

## Performance

- **Duration:** 32 min
- **Started:** 2026-04-22T17:35:00-03:00
- **Completed:** 2026-04-22T18:06:35-03:00
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- Content detail now loads the latest asset-generation run and shows provider, masked task id, normalized status, timestamps, safe summary text, and missing-media guidance.
- Create flow copy now sets Manus-first expectations while preserving the existing `intent=gemini` server action path and manual upload fallback.
- Settings and README no longer describe Manus as mock-only; README documents Manus primary, Gemini fallback, partial results, and troubleshooting.

## Task Commits

1. **Task 1 RED: Add failing asset run display tests** - `12bf4a2` (test)
2. **Task 1 GREEN: Expose latest asset-generation run in content detail query and page** - `8455c23` (feat)
3. **Task 2: Align create-flow copy with Manus-primary orchestration and fallback behavior** - `7bbe74c` (feat)
4. **Task 3: Remove stale Manus mock messaging in settings and README** - `0d02e5c` (docs)

## Files Created/Modified

- `src/features/content/asset-run-display.ts` - Formats provider/status labels, masks task ids, normalizes missing assets, and redacts unsafe provider messages.
- `src/features/content/asset-run-display.test.ts` - Covers display labels, missing-asset parsing, task-id masking, and unsafe message filtering.
- `src/features/content/queries.ts` - Selects latest asset-generation run metadata for the detail page.
- `src/app/contents/[id]/page.tsx` - Renders the asset generation section and safe partial/manual-action guidance.
- `src/features/content/components/create-content-form.tsx` - Updates prompt automation copy and CTAs for Manus-first flow.
- `src/app/settings/page.tsx` - Replaces mock-only Manus copy with real/fallback behavior and server-side key guidance.
- `README.md` - Documents provider priority, partial-result behavior, and troubleshooting.

## Decisions Made

- Centralized redaction/formatting in `asset-run-display.ts` because both tests and UI need deterministic safety behavior.
- Preserved `intent=gemini` to avoid changing the existing server action contract during a UI/docs plan.
- Added the literal README phrase "Manus primary, Gemini fallback" because the plan's verification command checked for those terms.

## Deviations from Plan

None - plan executed as written.

## Issues Encountered

- `node_modules/next/dist/docs/README.md` referenced by the plan does not exist in Next.js 16.2.4. I read the local `node_modules/next/dist/docs/index.md` plus App Router pages/server-components/forms/data-security guides instead.
- `rg` failed to start from the WindowsApps Codex bundle with access denied, so file discovery used `Get-ChildItem` as a fallback.

## Known Stubs

None blocking. Stub scan found existing input `placeholder` attributes in form/settings UI; these are normal form hints, not unimplemented data paths.

## Threat Flags

None. The plan already covered provider-derived text rendering and query-param banner safety; new helper code keeps provider summaries behind safe display guards.

## Verification

- `npm test -- --run src/features/content/asset-run-display.test.ts` - passed
- `npm run lint` - passed
- `npm run build` - passed
- Targeted `Select-String` scans confirmed latest-run wiring, masked task-id usage, preserved `value="gemini"`, Manus CTA copy, provider-priority docs, and no stale mock-only matches.

## User Setup Required

None - no new external service configuration required.

## Human Validation Required

Manual validation remains required for one prompt-based run where the provider returns partial/missing media, confirming the detail-page guidance and manual completion path in the browser.

## Next Phase Readiness

Phase 2 UI and docs are aligned with the Manus-first pipeline. Phase-level verification can now evaluate the full prompt-to-assets path; manual provider validation is still needed because live Manus/Gemini behavior depends on configured keys, quota, and model access.

## Self-Check: PASSED

- Summary file exists.
- Task commits exist: `12bf4a2`, `8455c23`, `7bbe74c`, `0d02e5c`.
- Verification commands passed.

---
*Phase: 02-ai-asset-pipeline*
*Completed: 2026-04-22*
