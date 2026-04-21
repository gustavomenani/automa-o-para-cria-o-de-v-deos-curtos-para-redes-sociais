# Project State

**Updated:** 2026-04-21
**Project:** Automacao para Criacao e Postagem em Redes Sociais
**Reference:** `.planning/PROJECT.md`

## Current Focus

Phase 1: Stabilize Core MVP.

The project is not at zero. It already has a working local MVP shell and most of the prompt/upload/video/review/schedule flow. The current active blocker is subtitle quality: preserving Whisper timing while correcting transcription text against the original script/caption without introducing delay or awkward formatting.

## Planning Status

- **Phase 1**: Planned and verified.
- **Plan count**: 3 plans in 3 waves.
- **Plan directory**: `.planning/phases/01-stabilize-core-mvp/`
- **Verification**: Plan checker passed after one targeted revision.

## Current Codebase Map

See `.planning/codebase/`:

- `STACK.md`
- `INTEGRATIONS.md`
- `ARCHITECTURE.md`
- `STRUCTURE.md`
- `CONVENTIONS.md`
- `TESTING.md`
- `CONCERNS.md`

## What Exists

- Next.js App Router application with TypeScript and Tailwind.
- Prisma/PostgreSQL schema for users, content projects, media files, generated videos, scheduled posts, social accounts and Manus settings.
- Docker Compose for local PostgreSQL.
- Manual content creation with image/audio upload.
- Local storage under `storage/uploads` and `storage/generated`.
- FFmpeg video generation through `VideoService`.
- Whisper local transcription via Python/faster-whisper.
- ASS subtitle burn-in with premium visual style.
- Review page with media, generated video, download, scheduling and regenerate actions.
- Schedule page with due-time visual status.
- Delete content flow that removes related records and local files.
- Gemini integration for test asset generation.
- Manus integration structure and partial real API/fallback behavior.
- Social publishing interface stub.

## What Is In Progress

- Subtitle synchronization and correction pipeline in:
  - `src/features/video/services/video-service.ts`
  - `src/features/video/services/transcription-service.ts`
  - `scripts/transcribe_audio.py`

These files currently have uncommitted local changes and should be handled carefully.

## Main Gaps

1. Subtitle pipeline still needs robust, repeatable synchronization.
2. No auth/session enforcement despite `User` model.
3. No queue/worker; long IA/Whisper/FFmpeg jobs run inside request/action paths.
4. No Redis/BullMQ scheduler worker yet.
5. No real social publisher implementation.
6. No Story-specific generation/review path.
7. No automated tests.
8. Upload validation lacks size/signature/duration limits.
9. Local filesystem storage is not production-safe for multi-instance or ephemeral deploy.
10. README has at least one stale section saying Manus is mock-only.

## Working Tree Note

At initialization time, these files were already modified and were not included in planning commits:

- `scripts/transcribe_audio.py`
- `src/features/video/services/transcription-service.ts`
- `src/features/video/services/video-service.ts`

Do not revert them blindly; they are part of the ongoing subtitle work.

## Next Recommended Command

Use `$gsd-execute-phase 1` to execute the immediate stabilization phase.

---
*Last updated: 2026-04-21 after Phase 1 planning*
