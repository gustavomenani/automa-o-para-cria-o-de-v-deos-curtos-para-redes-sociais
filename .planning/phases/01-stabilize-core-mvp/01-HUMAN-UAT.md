---
status: partial
phase: "01-stabilize-core-mvp"
source: ["01-VERIFICATION.md", "01-SMOKE-CHECKLIST.md"]
started: "2026-04-22T21:00:00Z"
updated: "2026-04-22T21:00:00Z"
---

# Phase 01 Human UAT

## Current Test

Awaiting local browser smoke execution with media fixtures.

## Tests

### 1. Create
expected: Create content at `/contents/new` with title, prompt, type, caption, images, and audio.
result: pending

### 2. Upload
expected: Valid media lands under `storage/uploads/<projectId>/`; invalid media is rejected.
result: pending

### 3. Generate
expected: FFmpeg creates vertical MP4 under `storage/generated/`.
result: pending

### 4. Review
expected: `/contents/[id]` shows playable 1080x1920 MP4 and readable captions without visible delay.
result: pending

### 5. Download
expected: `download=1` downloads the generated MP4.
result: pending

### 6. Schedule
expected: Schedule saves and `/schedule` shows due item as `Pronto para postar`.
result: pending

### 7. Delete
expected: Delete removes project from content and schedule views and cleans local storage.
result: pending

### 8. Assisted
expected: Gemini/Manus assisted path works when credentials are configured, or is explicitly skipped with reason.
result: pending

## Summary

total: 8
passed: 0
issues: 0
pending: 8
skipped: 0
blocked: 0

## Gaps

None recorded yet. Browser UAT has not been executed.
