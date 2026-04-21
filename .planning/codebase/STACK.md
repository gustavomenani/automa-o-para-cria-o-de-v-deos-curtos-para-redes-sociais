# Technology Stack

**Analysis Date:** 2026-04-21

## Languages

**Primary:**
- TypeScript 5.x - Application code in `src/app`, `src/features`, `src/integrations`, `src/lib`; configured by `tsconfig.json`.
- TSX / React 19.2.4 - App Router pages and UI components in `src/app/**/*.tsx`, `src/components/*.tsx`, and `src/features/**/components/*.tsx`.

**Secondary:**
- Python 3.x - Local transcription helper in `scripts/transcribe_audio.py`; dependencies listed in `requirements-whisper.txt`.
- SQL - Prisma-generated PostgreSQL migrations in `prisma/migrations/*/migration.sql`.
- CSS - Global Tailwind CSS entry in `src/app/globals.css`; PostCSS configured by `postcss.config.mjs`.

## Runtime

**Environment:**
- Node.js - Current local runtime detected as `v24.14.0`; Next.js server routes explicitly use Node runtime via `export const runtime = "nodejs"` in `src/app/api/content-projects/route.ts`, `src/app/api/content-projects/[id]/generate/route.ts`, and `src/app/api/content-projects/[id]/media/route.ts`.
- Python - Current local runtime detected as `Python 3.14.3`; invoked by `src/features/video/services/transcription-service.ts` through `WHISPER_PYTHON_PATH` or `python`.
- FFmpeg / FFprobe - Required local executables invoked by `src/features/video/services/video-service.ts`; paths come from `FFMPEG_PATH` and `FFPROBE_PATH` or PATH defaults.

**Package Manager:**
- npm 11.11.1 - Scripts and dependency install use `package.json`.
- Lockfile: present as `package-lock.json` with lockfile version 3.

## Frameworks

**Core:**
- Next.js 16.2.4 - App Router framework for pages, layouts, API routes, server actions, caching, and navigation; configured by `next.config.ts`.
- React 19.2.4 / React DOM 19.2.4 - UI rendering and client components in `src/app` and `src/components`.
- Prisma 6.19.3 - PostgreSQL schema, migrations, and generated client; configured by `prisma/schema.prisma` and used through `src/lib/prisma.ts`.
- Tailwind CSS 4.x - Styling pipeline through `tailwindcss`, `@tailwindcss/postcss`, `postcss.config.mjs`, and `src/app/globals.css`.

**Testing:**
- Not detected - `package.json` does not define a `test` script, and no Jest/Vitest/Playwright config was found during stack mapping.

**Build/Dev:**
- Next CLI - `npm run dev`, `npm run build`, and `npm run start` in `package.json`.
- ESLint 9.x with `eslint-config-next` 16.2.4 - `npm run lint` runs `eslint`; rules are defined in `eslint.config.mjs`.
- TypeScript compiler - Type checking settings are in `tsconfig.json` with `strict: true`, `moduleResolution: "bundler"`, and `@/*` mapped to `./src/*`.
- Prisma CLI - `npm run prisma:generate`, `npm run prisma:migrate`, `npm run prisma:deploy`, and `npm run db:studio` are defined in `package.json`.

## Key Dependencies

**Critical:**
- `next` 16.2.4 - Application framework and API/server action runtime in `src/app`.
- `react` 19.2.4 and `react-dom` 19.2.4 - UI component runtime for `src/app/**/*.tsx` and `src/components/*.tsx`.
- `@prisma/client` 6.19.3 - Database client imported by `src/lib/prisma.ts` and used across `src/features/**`.
- `prisma` 6.19.3 - Schema and migration tooling for `prisma/schema.prisma`.
- `@google/genai` 1.50.1 - Google Gemini SDK used by `src/integrations/gemini/gemini-service.ts`.
- `zod` 4.3.6 - Runtime validation for content forms, settings forms, schedules, and Gemini responses in `src/features/content/schemas.ts`, `src/features/settings/actions.ts`, `src/features/schedule/actions.ts`, and `src/integrations/gemini/gemini-service.ts`.

**Infrastructure:**
- `lucide-react` 1.8.0 - Icon components used by the UI, including `src/components/app-shell.tsx`.
- `faster-whisper` 1.1.1 - Python transcription dependency in `requirements-whisper.txt`, imported dynamically by `scripts/transcribe_audio.py`.
- `requests` >= 2.32.0 - Python HTTP dependency listed in `requirements-whisper.txt`.
- Native Node modules `node:fs/promises`, `node:path`, `node:child_process`, `node:os`, and `node:crypto` - Local storage, process execution, file serving, and file naming in `src/lib/storage/local-storage.ts`, `src/features/video/services/video-service.ts`, and `src/features/video/services/transcription-service.ts`.

## Configuration

**Environment:**
- Environment files are present as `.env` and `.env.example`; do not read or commit raw values from these files.
- Database connection is configured by `DATABASE_URL` in `prisma/schema.prisma`.
- Gemini is configured by `GEMINI_API_KEY` in `src/integrations/gemini/gemini-service.ts`.
- Manus is configured by `MANUS_API_KEY` in `src/integrations/manus/manus-service.ts` and can also be stored through `/settings` into the `ManusSettings` model in `prisma/schema.prisma`.
- Local storage root defaults to `storage` and can be overridden with `LOCAL_STORAGE_ROOT` in `src/lib/paths.ts`.
- Video tooling is configured by `FFMPEG_PATH` and `FFPROBE_PATH` in `src/features/video/services/video-service.ts`.
- Whisper transcription is configured by `WHISPER_PYTHON_PATH`, `WHISPER_MODEL`, `WHISPER_LANGUAGE`, `WHISPER_DEVICE`, `WHISPER_COMPUTE_TYPE`, and `WHISPER_TIMEOUT_MS` in `src/features/video/services/transcription-service.ts`.
- Prisma logging changes by `NODE_ENV` in `src/lib/prisma.ts`.

**Build:**
- `package.json` - npm scripts and dependency declarations.
- `package-lock.json` - locked npm dependency graph.
- `next.config.ts` - Next.js configuration placeholder with no custom options currently enabled.
- `tsconfig.json` - TypeScript compiler options, JSX mode, strict mode, incremental builds, and `@/*` path alias.
- `eslint.config.mjs` - Next core web vitals and TypeScript lint presets.
- `postcss.config.mjs` - Tailwind CSS PostCSS plugin.
- `prisma/schema.prisma` - PostgreSQL schema, Prisma client generator, enums, indexes, and model mappings.
- `requirements-whisper.txt` - Python dependencies for optional local Whisper transcription.
- `docker-compose.yml` - Local container orchestration file exists; do not quote sensitive sections from it.

## Platform Requirements

**Development:**
- Install Node/npm dependencies with `npm install` from `package.json`.
- Generate Prisma client with `npm run prisma:generate` and apply migrations with `npm run prisma:deploy` or `npm run prisma:migrate`.
- Provide a PostgreSQL database reachable through `DATABASE_URL`; `README.md` describes a local Docker PostgreSQL workflow exposed on port `5433`.
- Install FFmpeg and FFprobe or configure `FFMPEG_PATH` / `FFPROBE_PATH`.
- Install optional Python transcription dependencies with `python -m pip install -r requirements-whisper.txt`.
- Project-specific skills were not detected under `.claude/skills` or `.agents/skills`.

**Production:**
- Deployment target is not explicitly configured in repository files; `.gitignore` includes `.vercel`, but no committed Vercel project configuration was detected.
- Production runtime needs Node.js support for Next.js API routes, local process execution if FFmpeg/Whisper remain in-process, persistent PostgreSQL, and persistent file storage or a replacement for `src/lib/storage/local-storage.ts`.
- Local media paths under `storage/uploads` and `storage/generated` are gitignored by `.gitignore` except `.gitkeep` placeholders.

---

*Stack analysis: 2026-04-21*
