# Roadmap: Automacao para Criacao e Postagem em Redes Sociais

**Created:** 2026-04-21
**Granularity:** Coarse
**Context:** Brownfield MVP already exists. The roadmap starts from current code, not from zero.

## Current Position

O projeto esta entre Phase 1 e Phase 2:

- Phase 1 esta majoritariamente implementada, mas a legenda ainda precisa estabilizacao final.
- Phase 2 esta parcialmente implementada com Gemini e Manus, mas Manus ainda nao esta consolidada como caminho principal de assets.
- Phase 3, Phase 4 e Phase 5 ainda sao os principais blocos para transformar o MVP local em produto entregavel/operacional.

## Phases

| # | Phase | Goal | Requirements | Status |
|---|-------|------|--------------|--------|
| 1 | Stabilize Core MVP | Garantir que criar, subir midias, gerar video com legenda, revisar, baixar e agendar funcione de forma confiavel | CONT, MED, VID, CAP, REV, SCH basicos | In Progress |
| 2 | AI Asset Pipeline | Consolidar prompt -> Manus/Gemini -> assets salvos -> video geravel | AI, CONT-02 | In Progress |
| 3 | Product Hardening | Adicionar auth, limites, validacoes, testes e UX de erro/revisao | SEC, MED-04, SCH-04, OPS-05 | Pending |
| 4 | Worker, Queue and Deploy | Migrar tarefas longas para fila/worker e preparar VPS Docker | OPS, SCH-05, MED-05 | Pending |
| 5 | Social Publishing and Assisted Export | Implementar adaptadores sociais e fallback de exportacao assistida | SOC, SCH publishing | Pending |

## Phase 1: Stabilize Core MVP

**Goal:** O fluxo principal do MVP deve funcionar sem surpresa: criar conteudo, enviar/gerar assets, gerar MP4 vertical com legenda sincronizada, revisar, baixar e agendar.

**UI hint:** yes

**Requirements:** CONT-01, CONT-03, CONT-04, CONT-05, MED-01, MED-02, MED-03, VID-01, VID-02, VID-03, VID-04, VID-05, CAP-01, CAP-02, CAP-03, CAP-04, CAP-05, REV-01, REV-02, REV-03, SCH-01, SCH-02, SCH-03, OPS-01

**Already present:**
- Next.js panel with `/dashboard`, `/contents`, `/contents/new`, `/contents/[id]`, `/schedule`, `/settings`.
- Upload manual and local storage.
- Prisma schema and migrations.
- FFmpeg generation.
- ASS subtitle style.
- Basic schedule and delete flows.

**What remains:**
1. Finish subtitle synchronization so Whisper timestamps and original text do not drift.
2. Add robust fallback/notice when Whisper confidence or alignment is poor.
3. Fix stale README notes that still describe Manus as mock-only.
4. Validate complete manual flow after latest subtitle changes.
5. Add minimal smoke checklist for local QA.

**Success criteria:**
1. A long Portuguese caption generates subtitles in blocks, without isolated words and without visible delay.
2. A manually uploaded project generates a playable 1080x1920 MP4.
3. A Gemini/Manus-assisted project can still be reviewed and regenerated.
4. The user can download and schedule the generated video.
5. Errors are visible to the user without leaking raw provider/FFmpeg details.

## Phase 2: AI Asset Pipeline

**Goal:** O prompt do usuario deve gerar materiais suficientes para o video sem depender do upload manual, mantendo upload manual como fallback.

**UI hint:** yes

**Requirements:** CONT-02, AI-01, AI-02, AI-03, AI-04, AI-05

**Already present:**
- Gemini service can create plan, captions, prompts, images/audio when model access allows.
- Manus service has real API structure/fallback behavior and settings support.
- Generated assets can be saved as `MediaFile`.

**What remains:**
1. Decide provider priority for MVP: Manus primary, Gemini fallback/test.
2. Normalize Manus task outputs into internal `MediaFile` and text plan consistently.
3. Show clear UI state when provider returns text but no images/audio.
4. Persist provider task IDs/status/log summaries.
5. Add failure handling for quota, invalid key, unavailable model, empty attachments and human-interaction-required.

**Success criteria:**
1. User enters prompt and receives roteiro, video caption, post caption, hashtags, scene ideas and image prompts.
2. When provider returns images/audio, files are saved under the project and visible in review.
3. When provider cannot generate all assets, the user sees what is missing and can complete manually.
4. API keys are never exposed to client code or committed files.

## Phase 3: Product Hardening

**Goal:** Tornar o MVP seguro e menos fragil antes de uso externo.

**UI hint:** yes

**Requirements:** MED-04, VID-06, CAP-06, REV-04, SCH-04, SEC-01, SEC-02, SEC-03, SEC-04, OPS-05

**What remains:**
1. Add simple authentication and require session on all mutation/read routes.
2. Scope content, files, schedules and settings by user.
3. Add upload limits: file size, total size, image count and audio duration.
4. Validate file signatures instead of trusting only MIME type.
5. Prevent concurrent generation for the same project.
6. Add tests for pure caption helpers, storage path guards, upload validation, schedule validation and deletion cleanup.
7. Add redacted user-facing errors and server-side detailed logs.

**Success criteria:**
1. Anonymous user cannot create, read, delete or download other users' files.
2. Oversized or invalid files are rejected before processing.
3. Double-clicking generate does not corrupt output or project status.
4. Lint, build and the new test suite pass locally.

## Phase 4: Worker, Queue and Deploy

**Goal:** Separar tarefas longas da request web e preparar ambiente real em VPS/Docker.

**UI hint:** no

**Requirements:** MED-05, SCH-05, OPS-02, OPS-03, OPS-04

**What remains:**
1. Add Redis/BullMQ or equivalent queue.
2. Move Gemini/Manus polling, downloads, Whisper, FFmpeg and scheduled publishing into worker jobs.
3. Persist job status, attempts, logs and retry metadata.
4. Update UI to enqueue jobs and poll status.
5. Prepare Docker setup for app, worker, Postgres, Redis, FFmpeg/Python dependencies and persistent volumes.
6. Decide migration path from local disk to R2/S3 object storage.

**Success criteria:**
1. Creating/generating content returns quickly and processing continues in background.
2. Failed jobs are visible and retryable.
3. App can be deployed on VPS with Docker and restart without losing media.
4. Scheduled jobs can wake up at due time without a browser open.

## Phase 5: Social Publishing and Assisted Export

**Goal:** Implementar publicacao onde as APIs permitirem e fallback honesto de exportacao assistida onde nao permitirem.

**UI hint:** yes

**Requirements:** SOC-01, SOC-02, SOC-03, SOC-04

**What remains:**
1. Define credential model for Instagram, TikTok and YouTube.
2. Implement social adapter interfaces without mixing platform rules into pages.
3. Add assisted export state for blocked/unapproved APIs.
4. Record post result, platform error, external link or manual-action-needed status.
5. Add docs for required accounts, app approvals and platform limitations.

**Success criteria:**
1. The system can attempt publication only when valid credentials and permissions exist.
2. If a platform blocks public posting, the user gets the final file and clear manual instructions.
3. No unofficial automation or scraping is used.
4. Schedule history records success, failure or manual fallback per platform.

## Recommended Immediate Next Work

1. Finish Phase 1 subtitle reliability. This is the visible quality blocker right now.
2. Validate the complete local flow after subtitle changes: manual upload, Gemini/Manus assisted generation, video render, download and schedule.
3. Update README to reflect current Manus implementation and Whisper caveats.
4. Start Phase 3 tests around caption helpers before touching the subtitle pipeline again.

---
*Roadmap created: 2026-04-21*
