# Codebase Structure

**Analysis Date:** 2026-04-21

## Directory Layout

```text
short-video-automation/
├── .planning/                  # GSD planning and generated codebase maps
├── prisma/                     # Prisma schema and migrations
│   ├── schema.prisma           # PostgreSQL models, enums, relations, indexes
│   └── migrations/             # SQL migrations applied by Prisma
├── public/                     # Static assets from the Next scaffold
├── scripts/                    # Non-TypeScript helper scripts
│   └── transcribe_audio.py     # faster-whisper transcription helper
├── src/                        # Application source
│   ├── app/                    # Next.js App Router pages, layouts, API routes
│   ├── components/             # Shared UI components
│   ├── features/               # Feature-scoped UI, actions, queries, schemas, services
│   ├── integrations/           # External service adapters and stubs
│   └── lib/                    # Shared infrastructure/utilities
├── storage/                    # Local media storage root
│   ├── generated/              # Generated MP4 output files
│   └── uploads/                # Uploaded and generated source assets by project
├── AGENTS.md                   # Agent instructions for this repository
├── CLAUDE.md                   # Minimal local Claude marker file
├── eslint.config.mjs           # ESLint configuration
├── next.config.ts              # Next.js config
├── package.json                # npm scripts and dependencies
├── package-lock.json           # npm lockfile
├── postcss.config.mjs          # Tailwind/PostCSS config
├── requirements-whisper.txt    # Python dependency pointer for transcription
└── tsconfig.json               # TypeScript config and @/* path alias
```

## Directory Purposes

**`src/app/`:**
- Purpose: Next.js App Router route tree.
- Contains: Server components for pages, root layout, app-level loading/error UI, API route handlers, and URL segment folders.
- Key files: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/dashboard/page.tsx`, `src/app/contents/page.tsx`, `src/app/contents/new/page.tsx`, `src/app/contents/[id]/page.tsx`, `src/app/schedule/page.tsx`, `src/app/settings/page.tsx`, `src/app/error.tsx`, and `src/app/loading.tsx`.
- Add page-level route code here. Keep domain logic in `src/features/`, `src/integrations/`, or `src/lib/`.

**`src/app/api/`:**
- Purpose: HTTP endpoints implemented with App Router route handlers.
- Contains: JSON APIs for project upload, media attachment, generation, and binary file serving.
- Key files: `src/app/api/content-projects/route.ts`, `src/app/api/content-projects/[id]/media/route.ts`, `src/app/api/content-projects/[id]/generate/route.ts`, and `src/app/api/files/[...path]/route.ts`.
- Add new endpoints as `route.ts` files under the route segment that matches the public URL.

**`src/components/`:**
- Purpose: Shared UI components used across features and pages.
- Contains: App shell/navigation, feedback banners, status badges, loading UI, and generic submit button.
- Key files: `src/components/app-shell.tsx`, `src/components/feedback-banner.tsx`, `src/components/page-loading.tsx`, `src/components/status-badge.tsx`, and `src/components/submit-button.tsx`.
- Put components here only when they are reusable across multiple feature areas.

**`src/features/`:**
- Purpose: Feature modules that own domain-specific UI, server actions, queries, schemas, types, and services.
- Contains: `src/features/content/`, `src/features/schedule/`, `src/features/settings/`, and `src/features/video/`.
- Key files: `src/features/content/actions.ts`, `src/features/content/queries.ts`, `src/features/content/schemas.ts`, `src/features/content/types.ts`, `src/features/schedule/actions.ts`, `src/features/schedule/queries.ts`, `src/features/settings/actions.ts`, `src/features/settings/queries.ts`, and services under feature folders.
- Add new domain behavior under `src/features/<feature>/` with the same file roles when possible.

**`src/features/content/`:**
- Purpose: Content project creation, listing, deletion, upload handling, and content-specific UI.
- Contains: `components/`, `services/`, `actions.ts`, `queries.ts`, `schemas.ts`, and `types.ts`.
- Key files: `src/features/content/components/create-content-form.tsx`, `src/features/content/components/content-list.tsx`, `src/features/content/services/upload-service.ts`, `src/features/content/actions.ts`, and `src/features/content/queries.ts`.
- Put content project form actions, upload parsing, and content-specific UI here.

**`src/features/schedule/`:**
- Purpose: Scheduled post creation and scheduled post reads.
- Contains: `src/features/schedule/actions.ts` and `src/features/schedule/queries.ts`.
- Key files: `src/features/schedule/actions.ts`, `src/features/schedule/queries.ts`.
- Put scheduling-specific validation and Prisma reads/writes here.

**`src/features/settings/`:**
- Purpose: Manus/system settings form handling and settings read model.
- Contains: `src/features/settings/actions.ts` and `src/features/settings/queries.ts`.
- Key files: `src/features/settings/actions.ts`, `src/features/settings/queries.ts`.
- Put application settings mutations and derived UI settings values here.

**`src/features/video/`:**
- Purpose: Video rendering and transcription services.
- Contains: `src/features/video/services/video-service.ts` and `src/features/video/services/transcription-service.ts`.
- Key files: `src/features/video/services/video-service.ts`, `src/features/video/services/transcription-service.ts`.
- Put server-only media processing services here. Keep page/API handlers thin.

**`src/integrations/`:**
- Purpose: External service adapters and future external publishing boundaries.
- Contains: `src/integrations/gemini/`, `src/integrations/manus/`, and `src/integrations/social/`.
- Key files: `src/integrations/gemini/gemini-service.ts`, `src/integrations/manus/manus-service.ts`, `src/integrations/manus/client.ts`, and `src/integrations/social/publisher.ts`.
- Add third-party SDK/client code here, with local service wrappers that normalize errors and responses for features.

**`src/lib/`:**
- Purpose: Shared infrastructure and small utilities.
- Contains: Prisma client, path helpers, API response helpers, formatters, storage utilities, and an empty `src/lib/ffmpeg/` directory.
- Key files: `src/lib/prisma.ts`, `src/lib/paths.ts`, `src/lib/api-response.ts`, `src/lib/formatters.ts`, and `src/lib/storage/local-storage.ts`.
- Put cross-feature infrastructure here. Avoid placing domain-specific orchestration in `src/lib/`.

**`src/lib/storage/`:**
- Purpose: Filesystem storage operations for uploads, generated assets, generated videos, and deletes.
- Contains: `src/lib/storage/local-storage.ts`.
- Key files: `src/lib/storage/local-storage.ts`.
- Use this module for storage writes and deletes instead of calling `fs` directly from pages/actions.

**`prisma/`:**
- Purpose: Database schema, migrations, and generated-client input.
- Contains: `prisma/schema.prisma` and migration directories under `prisma/migrations/`.
- Key files: `prisma/schema.prisma`, `prisma/migrations/20260421000000_init/migration.sql`, `prisma/migrations/20260421000100_add_scheduled_post_caption/migration.sql`, and `prisma/migrations/20260421000200_add_manus_settings/migration.sql`.
- Add schema changes to `prisma/schema.prisma` and create migrations through Prisma commands.

**`scripts/`:**
- Purpose: Runtime helper scripts outside the TypeScript app.
- Contains: `scripts/transcribe_audio.py`.
- Key files: `scripts/transcribe_audio.py`.
- Keep Python helper scripts here and invoke them from server-only TypeScript services.

**`storage/`:**
- Purpose: Local development/runtime media storage.
- Contains: `storage/uploads/`, `storage/generated/`, and committed `.gitkeep` placeholders.
- Key files: `storage/uploads/.gitkeep`, `storage/generated/.gitkeep`.
- Generated files under `storage/uploads/*` and `storage/generated/*` are ignored by `.gitignore`; do not commit media outputs.

**`public/`:**
- Purpose: Static public assets served by Next.js.
- Contains: Scaffolded SVG assets.
- Key files: `public/file.svg`, `public/globe.svg`, `public/next.svg`, `public/vercel.svg`, and `public/window.svg`.
- Put static, versioned public assets here when they are not user uploads or generated media.

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx`: Root HTML layout, metadata, fonts, and global CSS import.
- `src/app/page.tsx`: Redirects root traffic to `/dashboard`.
- `src/app/dashboard/page.tsx`: Dashboard route and project metrics.
- `src/app/contents/page.tsx`: Content history route.
- `src/app/contents/new/page.tsx`: New content form route.
- `src/app/contents/[id]/page.tsx`: Content review, video generation, media preview, and scheduling route.
- `src/app/schedule/page.tsx`: Scheduled post list route.
- `src/app/settings/page.tsx`: Manus/system settings route.
- `src/app/api/content-projects/route.ts`: Multipart project creation API.
- `src/app/api/content-projects/[id]/media/route.ts`: Existing project media attachment API.
- `src/app/api/content-projects/[id]/generate/route.ts`: JSON video generation API.
- `src/app/api/files/[...path]/route.ts`: Local storage file-serving API.
- `scripts/transcribe_audio.py`: Python transcription entry point spawned by Node.

**Configuration:**
- `package.json`: npm scripts and dependency manifest.
- `package-lock.json`: npm dependency lockfile.
- `tsconfig.json`: TypeScript strict mode, Next plugin, and `@/*` path alias.
- `next.config.ts`: Next.js configuration placeholder.
- `eslint.config.mjs`: ESLint configuration with Next rules.
- `postcss.config.mjs`: PostCSS/Tailwind plugin configuration.
- `requirements-whisper.txt`: Python dependency requirement for faster-whisper.
- `.gitignore`: Ignores `.env*`, `.next/`, `node_modules/`, logs, generated storage files, and `next-env.d.ts`.
- `.env.example`: Environment variable example file. Do not copy raw values from `.env`.

**Core Logic:**
- `src/features/content/actions.ts`: Content creation, Gemini generation, video generation trigger, and delete mutations.
- `src/features/content/services/upload-service.ts`: Project input parsing, file validation, project creation, media attachment, and storage rollback.
- `src/features/content/queries.ts`: Dashboard, content list, and content detail read models.
- `src/features/video/services/video-service.ts`: FFmpeg/FFprobe orchestration, caption cue generation, status transitions, and MP4 output.
- `src/features/video/services/transcription-service.ts`: Python subprocess wrapper for Whisper transcription.
- `src/features/schedule/actions.ts`: Scheduled post creation and project status update.
- `src/features/schedule/queries.ts`: Scheduled post read model with latest generated video relation.
- `src/features/settings/actions.ts`: Manus settings create/update mutation.
- `src/features/settings/queries.ts`: Manus settings read model and default values.
- `src/integrations/gemini/gemini-service.ts`: Gemini plan/image/audio generation, Manus fallback, generated media persistence, and stored plan reads.
- `src/integrations/manus/manus-service.ts`: Manus task API wrapper and mock fallback.
- `src/integrations/social/publisher.ts`: Stubbed social publishing boundary.
- `src/lib/storage/local-storage.ts`: Upload/generated asset writes, generated video path construction, and safe project storage deletion.
- `src/lib/paths.ts`: Storage roots and public file URL conversion.
- `src/lib/prisma.ts`: Prisma client singleton.

**Testing:**
- Not detected. No `*.test.*`, `*.spec.*`, Jest config, Vitest config, or Playwright config is present in the scanned tree.

## Naming Conventions

**Files:**
- App Router pages use Next names: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, and `route.ts` under `src/app/`.
- Feature modules use role names: `actions.ts`, `queries.ts`, `schemas.ts`, and `types.ts` as seen in `src/features/content/`.
- Feature components use kebab-case filenames: `src/features/content/components/content-list.tsx`, `src/features/content/components/create-content-form.tsx`, `src/features/content/components/delete-content-button.tsx`, and `src/features/content/components/generate-video-button.tsx`.
- Shared components use kebab-case filenames: `src/components/app-shell.tsx`, `src/components/feedback-banner.tsx`, `src/components/page-loading.tsx`, `src/components/status-badge.tsx`, and `src/components/submit-button.tsx`.
- Services use `*-service.ts`: `src/features/video/services/video-service.ts`, `src/features/video/services/transcription-service.ts`, `src/features/content/services/upload-service.ts`, `src/integrations/gemini/gemini-service.ts`, and `src/integrations/manus/manus-service.ts`.
- Helper modules use concise kebab-case or noun names: `src/lib/api-response.ts`, `src/lib/formatters.ts`, `src/lib/paths.ts`, and `src/lib/prisma.ts`.

**Directories:**
- URL route directories mirror public paths under `src/app/`: `dashboard`, `contents`, `contents/new`, `contents/[id]`, `schedule`, and `settings`.
- Dynamic route segments use bracket names: `src/app/contents/[id]/`, `src/app/api/content-projects/[id]/`, and `src/app/api/files/[...path]/`.
- Feature directories use singular domain names: `src/features/content/`, `src/features/schedule/`, `src/features/settings/`, and `src/features/video/`.
- External integration directories use provider/domain names: `src/integrations/gemini/`, `src/integrations/manus/`, and `src/integrations/social/`.
- Storage directories separate source assets and outputs: `storage/uploads/` and `storage/generated/`.

## Where to Add New Code

**New Page or Route:**
- Primary code: `src/app/<route>/page.tsx`.
- Shared layout: use `src/components/app-shell.tsx`.
- Data reads: add or reuse `src/features/<feature>/queries.ts`.
- Mutations: add or reuse `src/features/<feature>/actions.ts`.

**New API Endpoint:**
- Implementation: `src/app/api/<resource>/route.ts` or nested `src/app/api/<resource>/<segment>/route.ts`.
- Shared response helpers: `src/lib/api-response.ts`.
- Domain logic: call feature services from `src/features/<feature>/services/` instead of implementing workflows directly in the route handler.
- Node-only endpoints: add `export const runtime = "nodejs"` when using Prisma, filesystem, child processes, or local media processing.

**New Feature:**
- Primary code: `src/features/<feature>/`.
- Server actions: `src/features/<feature>/actions.ts`.
- Queries: `src/features/<feature>/queries.ts`.
- Schemas: `src/features/<feature>/schemas.ts`.
- Types: `src/features/<feature>/types.ts`.
- Components: `src/features/<feature>/components/`.
- Services: `src/features/<feature>/services/`.
- Pages: `src/app/<route>/page.tsx` should import the feature module rather than contain business logic.

**New Content Workflow:**
- Form/page entry: `src/app/contents/` or `src/features/content/components/`.
- Mutation: `src/features/content/actions.ts`.
- Upload or media persistence logic: `src/features/content/services/upload-service.ts`.
- Content read model: `src/features/content/queries.ts`.
- Database changes: `prisma/schema.prisma` and a new migration under `prisma/migrations/`.

**New Video Processing Capability:**
- Implementation: `src/features/video/services/video-service.ts` for FFmpeg/rendering changes.
- Transcription changes: `src/features/video/services/transcription-service.ts` and `scripts/transcribe_audio.py`.
- Storage paths: `src/lib/storage/local-storage.ts` and `src/lib/paths.ts`.
- API trigger: `src/app/api/content-projects/[id]/generate/route.ts` if the capability is exposed over HTTP.

**New Integration:**
- Implementation: `src/integrations/<provider>/`.
- Provider service: `src/integrations/<provider>/<provider>-service.ts`.
- Feature orchestration: call the integration from `src/features/<feature>/actions.ts` or a feature service.
- Environment configuration: refer only to environment variable names in code/docs; do not read or expose `.env` values.

**New Shared Component:**
- Cross-feature component: `src/components/<component-name>.tsx`.
- Feature-specific component: `src/features/<feature>/components/<component-name>.tsx`.
- Client-only component: add `"use client"` at the top only when using browser APIs, `useTransition()`, `useFormStatus()`, event handlers that need client state, or other client hooks.

**Utilities:**
- Shared infrastructure helpers: `src/lib/`.
- Storage helpers: `src/lib/storage/local-storage.ts`.
- Formatting helpers: `src/lib/formatters.ts`.
- Public path helpers: `src/lib/paths.ts`.
- Avoid adding domain-specific business workflows to `src/lib/`; place them in `src/features/<feature>/services/`.

**Database Model Changes:**
- Schema: `prisma/schema.prisma`.
- Migrations: `prisma/migrations/<timestamp>_<name>/migration.sql`.
- Prisma access: add or update feature queries/actions/services that use `src/lib/prisma.ts`.

## Special Directories

**`.planning/`:**
- Purpose: Planning artifacts consumed by GSD commands.
- Generated: Yes.
- Committed: Intended to be committed when planning docs are part of the workflow.
- Key files: `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/STRUCTURE.md`.

**`.next/`:**
- Purpose: Next.js build/dev cache and generated runtime files.
- Generated: Yes.
- Committed: No. Ignored by `.gitignore`.

**`node_modules/`:**
- Purpose: Installed npm dependencies.
- Generated: Yes.
- Committed: No. Ignored by `.gitignore`.

**`prisma/migrations/`:**
- Purpose: Versioned database migration SQL.
- Generated: Yes, by Prisma migration commands.
- Committed: Yes.

**`storage/uploads/`:**
- Purpose: Uploaded images/audio and Gemini-generated source assets by project.
- Generated: Yes.
- Committed: Only `storage/uploads/.gitkeep`; generated contents are ignored by `.gitignore`.

**`storage/generated/`:**
- Purpose: Generated MP4 output files.
- Generated: Yes.
- Committed: Only `storage/generated/.gitkeep`; generated contents are ignored by `.gitignore`.

**`src/lib/ffmpeg/`:**
- Purpose: Reserved/empty directory in current tree.
- Generated: No.
- Committed: Directory presence depends on tracked contents; no files detected.

---

*Structure analysis: 2026-04-21*
