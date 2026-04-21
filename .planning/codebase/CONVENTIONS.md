# Coding Conventions

**Analysis Date:** 2026-04-21

## Naming Patterns

**Files:**
- Use kebab-case for TypeScript and TSX files: `src/components/app-shell.tsx`, `src/components/feedback-banner.tsx`, `src/features/content/components/create-content-form.tsx`, `src/features/video/services/video-service.ts`.
- Use Next.js App Router reserved filenames in route segments: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/error.tsx`, `src/app/loading.tsx`, `src/app/api/content-projects/route.ts`, `src/app/api/content-projects/[id]/generate/route.ts`.
- Use feature-local conventional filenames for data access and mutations: `src/features/content/actions.ts`, `src/features/content/queries.ts`, `src/features/content/schemas.ts`, `src/features/content/types.ts`, `src/features/schedule/actions.ts`, `src/features/settings/queries.ts`.
- Use service files under `services/` for side-effectful domain work: `src/features/content/services/upload-service.ts`, `src/features/video/services/transcription-service.ts`, `src/features/video/services/video-service.ts`.
- Use integration directories by provider/domain: `src/integrations/gemini/gemini-service.ts`, `src/integrations/manus/manus-service.ts`, `src/integrations/social/publisher.ts`.

**Functions:**
- Use camelCase verbs for functions and Server Actions: `createContentAction` in `src/features/content/actions.ts`, `generateContentVideoAction` in `src/features/content/actions.ts`, `schedulePostAction` in `src/features/schedule/actions.ts`, `formatFileSize` in `src/lib/formatters.ts`.
- Prefix read helpers with `get` or `read`: `getContents` in `src/features/content/queries.ts`, `getContentById` in `src/features/content/queries.ts`, `readStoredGeminiPlan` in `src/integrations/gemini/gemini-service.ts`.
- Keep private module helpers unexported and colocated near their callers: `friendlyErrorMessage`, `redirectWithNewContentError`, and `revalidateContentPages` in `src/features/content/actions.ts`; `runProcess` in `src/features/video/services/video-service.ts`; `sanitizeFileName` and `assertStoragePath` in `src/lib/storage/local-storage.ts`.
- Use PascalCase for React components: `AppShell` in `src/components/app-shell.tsx`, `SubmitButton` in `src/components/submit-button.tsx`, `CreateContentForm` in `src/features/content/components/create-content-form.tsx`.
- Use class names ending in `Service` for long-lived service abstractions: `VideoService` in `src/features/video/services/video-service.ts`, `TranscriptionService` in `src/features/video/services/transcription-service.ts`, `ManusService` in `src/integrations/manus/manus-service.ts`.

**Variables:**
- Use camelCase for local values and Prisma results: `formData`, `parsedForm`, `contentId`, `scheduledAt`, `generatedVideoId`.
- Use descriptive collection names: `imageMimeTypes` and `audioMimeTypes` in `src/features/content/services/upload-service.ts`, `navItems` in `src/components/app-shell.tsx`, `mediaRows` in `src/integrations/gemini/gemini-service.ts`.
- Use UPPER_SNAKE_CASE for immutable module constants that represent configuration or limits: `GEMINI_TEXT_MODELS`, `GEMINI_IMAGE_MODELS`, `GEMINI_TTS_MODEL`, and `MISSING_KEY_MESSAGE` in `src/integrations/gemini/gemini-service.ts`; `MAX_SUBTITLE_LINE_LENGTH` in `src/features/video/services/video-service.ts`.
- Use object maps for style and option variants: `styles` in `src/components/feedback-banner.tsx`, `variants` and `icons` in `src/components/submit-button.tsx`, `deleteRedirects` in `src/features/content/actions.ts`.

**Types:**
- Use PascalCase for exported object types: `ContentProjectInput` in `src/features/content/schemas.ts`, `ProjectFilesInput` in `src/features/content/services/upload-service.ts`, `TranscriptionSegment` in `src/features/video/services/transcription-service.ts`, `GeminiReelsPlan` in `src/integrations/gemini/gemini-service.ts`.
- Use `Props` suffix for component props: `SubmitButtonProps` in `src/components/submit-button.tsx`, `FeedbackBannerProps` in `src/components/feedback-banner.tsx`, `DeleteContentButtonProps` in `src/features/content/components/delete-content-button.tsx`.
- Use literal unions for local UI and integration states when the values are narrower than database enums: `DeleteContentRedirectTarget` in `src/features/content/actions.ts`, `ManusTaskStatus` in `src/integrations/manus/manus-service.ts`, `SocialPlatform` in `src/integrations/social/publisher.ts`.
- Derive TypeScript types from Zod schemas where possible: `ContentProjectInput` from `contentProjectInputSchema` in `src/features/content/schemas.ts`, `GeminiReelsPlan` from `reelsPlanSchema` in `src/integrations/gemini/gemini-service.ts`.

## Code Style

**Formatting:**
- Formatting is handled by the TypeScript/ESLint toolchain; no Prettier config is detected. Keep the existing style: two-space indentation, semicolons, double quotes, trailing commas in multiline calls and object literals.
- Keep imports at the top of modules and separate `"use server"` or `"use client"` directives from imports with one blank line, as in `src/features/content/actions.ts` and `src/components/submit-button.tsx`.
- Prefer readable multiline argument lists when calls include nested objects or long strings, as in Prisma calls in `src/features/content/actions.ts` and `src/integrations/gemini/gemini-service.ts`.
- Keep JSX class strings inline for simple components and use map objects for repeated variants, as in `src/components/submit-button.tsx` and `src/components/feedback-banner.tsx`.

**Linting:**
- ESLint 9 flat config is used in `eslint.config.mjs`.
- The config extends `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript` for Next.js 16 and TypeScript checks.
- Global ignores are defined in `eslint.config.mjs`: `.next/**`, `out/**`, `build/**`, and `next-env.d.ts`.
- The lint command is `npm run lint`, defined in `package.json`.

## Import Organization

**Order:**
1. React/Next/runtime imports first: `next/link`, `next/cache`, `next/navigation`, `node:fs/promises`, `node:path`.
2. Third-party package imports next: `lucide-react`, `@google/genai`, `zod`, `@prisma/client`.
3. Internal absolute imports using `@/`: `@/components/app-shell`, `@/features/content/actions`, `@/lib/prisma`.
4. Type-only imports are written with `import type` when only types are needed, as in `src/features/content/services/upload-service.ts` and `src/features/content/types.ts`.

**Path Aliases:**
- Use `@/*` for source imports. The alias is configured in `tsconfig.json` as `"@/*": ["./src/*"]`.
- Prefer absolute `@/` imports over deep relative imports inside `src/`. Examples: `src/app/contents/[id]/page.tsx`, `src/features/content/actions.ts`, `src/integrations/gemini/gemini-service.ts`.

## Error Handling

**Patterns:**
- Server Actions should throw or redirect with user-facing messages. `src/features/content/actions.ts` catches upload and generation errors, turns unknown errors into readable strings with `friendlyErrorMessage`, then redirects with encoded query parameters.
- API routes should wrap side effects in `try/catch` and return JSON via shared helpers. `src/app/api/content-projects/route.ts`, `src/app/api/content-projects/[id]/media/route.ts`, and `src/app/api/content-projects/[id]/generate/route.ts` use `apiCreated` and `apiError` from `src/lib/api-response.ts`.
- Validation errors should be created at boundaries with Zod. Use `.parse()` when throwing is acceptable, as in `src/features/content/services/upload-service.ts` and `src/features/settings/actions.ts`; use `.safeParse()` when the action needs to choose the message, as in `src/features/schedule/actions.ts`.
- File and process integrations should normalize low-level failures into domain messages. `src/features/video/services/video-service.ts` wraps FFmpeg/ffprobe failures in `runProcess`; `src/integrations/gemini/gemini-service.ts` maps provider status/quota/key failures in `normalizeGeminiError`.
- Fallback behavior should be explicit for optional subsystems. `src/features/video/services/transcription-service.ts` returns `null` when local Whisper transcription fails; `src/features/video/services/video-service.ts` falls back to proportional caption timing when transcription data is missing.
- Destructive filesystem operations must validate paths against `storageRoot`. `assertStoragePath` in `src/lib/storage/local-storage.ts` guards `deleteProjectStorage`.

## Logging

**Framework:** console/Prisma logging only

**Patterns:**
- Application modules do not use direct `console.log` logging in `src/`.
- Prisma logging is configured centrally in `src/lib/prisma.ts`: development logs `error` and `warn`; production logs `error`.
- Prefer returning warnings through domain results or persisted `errorMessage` fields. Examples: Gemini warnings in `src/integrations/gemini/gemini-service.ts`, caption warnings written to `ContentProject.errorMessage` in `src/features/video/services/video-service.ts`.
- For new diagnostics, keep logs at integration boundaries or central clients instead of adding scattered component-level logs.

## Comments

**When to Comment:**
- Comments are sparse. Add comments only when an implementation detail is non-obvious or when disabling a lint rule.
- The main local example is the `eslint-disable-next-line @next/next/no-img-element` comment in `src/app/contents/[id]/page.tsx`; use this pattern only when a specific Next rule is intentionally bypassed.
- Do not add narrative comments for straightforward JSX, Prisma queries, or simple helpers.

**JSDoc/TSDoc:**
- JSDoc/TSDoc is not used in current TypeScript modules.
- Prefer expressive type names and exported schema/type pairs over docblocks, as in `src/features/content/schemas.ts` and `src/features/video/services/transcription-service.ts`.

## Function Design

**Size:** Keep most functions focused on one boundary or transformation. Small components and utilities live in `src/components/feedback-banner.tsx`, `src/lib/formatters.ts`, and `src/lib/api-response.ts`. Larger workflow services such as `src/features/video/services/video-service.ts` should split parsing, process execution, caption timing, and persistence into private helpers.

**Parameters:** Prefer typed object parameters when a function has multiple related values, such as `GenerateVerticalMp4Input` in `src/features/video/services/video-service.ts` and `ProjectFilesInput` in `src/features/content/services/upload-service.ts`. Positional parameters are used for short helpers like `formatAssTime(seconds)` and `parseScheduledAt(date, time)`.

**Return Values:** Return domain objects or Prisma results directly from data functions. Examples: `getContents` in `src/features/content/queries.ts`, `attachMediaFilesToProject` in `src/features/content/services/upload-service.ts`, `generateProjectVideo` in `src/features/video/services/video-service.ts`. Use `null` to signal optional fallback data only when callers explicitly handle it, as in `readStoredGeminiPlan` and `TranscriptionService.transcribe`.

## Module Design

**Exports:** Prefer named exports for components, actions, queries, schemas, utilities, and services. Examples: `CreateContentForm`, `createContentAction`, `getContents`, `contentProjectInputSchema`, `apiError`, `videoService`.

**Barrel Files:** Barrel usage is minimal. `src/integrations/manus/client.ts` re-exports `ManusService` and related types from `src/integrations/manus/manus-service.ts`. Do not add new barrel files unless they simplify a real public integration boundary.

**Server/Client Boundaries:**
- Add `"use server"` at the top of Server Action modules: `src/features/content/actions.ts`, `src/features/schedule/actions.ts`, `src/features/settings/actions.ts`.
- Add `"use client"` only for components using browser APIs, React client hooks, or interactive handlers: `src/components/submit-button.tsx`, `src/features/content/components/delete-content-button.tsx`, `src/app/error.tsx`.
- Keep Prisma, filesystem, process spawning, and provider SDK calls out of client components. These belong in server actions, API routes, services, integrations, or `src/lib`.

**Python Script Style:**
- `scripts/transcribe_audio.py` uses standard-library `argparse`, JSON stdout, nonzero exit codes for setup failures, and `main() -> int`.
- Keep Python output machine-readable JSON and avoid printing raw secrets or paths beyond the requested audio path context.

---

*Convention analysis: 2026-04-21*
