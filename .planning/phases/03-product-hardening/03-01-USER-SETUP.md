---
status: incomplete
phase: 03-product-hardening
plan: 01
updated: 2026-04-22
---

# Phase 03 Plan 01 User Setup

## Environment Variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `SESSION_SECRET` | yes | Signs httpOnly session cookies. Generate at least 32 characters, for example with `openssl rand -base64 32`. |
| `INITIAL_USER_EMAIL` | yes for first login | Email allowed to bootstrap the first local user when the users table is empty. |
| `INITIAL_USER_PASSWORD` | yes for first login | Password for the first local user. Do not commit this value. |

## Verification

1. Start the app.
2. Visit `/login`.
3. Submit the initial email/password.
4. Confirm the app redirects to `/dashboard` and private routes no longer render anonymously.
