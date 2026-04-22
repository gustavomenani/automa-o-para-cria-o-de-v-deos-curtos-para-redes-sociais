---
status: partial
phase: 02-ai-asset-pipeline
source: [02-VERIFICATION.md]
started: 2026-04-22T21:08:35Z
updated: 2026-04-22T21:08:35Z
---

# Phase 02 Human UAT

## Current Test

Awaiting live browser/provider validation.

## Tests

### 1. Prompt-Based Provider Run
expected: Create a prompt-based project from `/contents/new` with valid provider configuration.
result: pending

### 2. Provider Run Status Visibility
expected: `/contents/[id]` shows latest provider, normalized status, masked task id, and timestamps.
result: pending

### 3. Partial Missing-Media Result
expected: When text is returned but images or audio are missing, the page shows missing-assets guidance.
result: pending

### 4. Manual Upload Recovery
expected: Manual upload remains available to complete missing assets before MP4 generation.
result: pending

### 5. Manual-Action Safe Messaging
expected: Manual-action-required provider states render safe, non-internal language.
result: pending

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
