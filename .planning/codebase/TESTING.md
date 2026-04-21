# Testing Patterns

**Analysis Date:** 2026-04-21

## Test Framework

**Runner:**
- Not detected. `package.json` has no `test` script and no Jest, Vitest, Playwright, Cypress, or Testing Library dependencies.
- No test config files are detected: no `jest.config.*`, `vitest.config.*`, `playwright.config.*`, or `cypress.config.*`.
- No test files are detected under `src/`, `prisma/`, or `scripts/`: no `*.test.*` or `*.spec.*` files.

**Assertion Library:**
- Not detected.

**Run Commands:**
```bash
npm run lint          # Run ESLint; currently passes
npm run build         # Run Next.js production build and type/build checks
npm run dev           # Manual local verification in the browser
```

## Test File Organization

**Location:**
- Not established. There are no current tests in `src/`, `prisma/`, or `scripts/`.
- When adding tests, prefer colocated unit tests next to the implementation for feature and utility modules, for example `src/features/content/services/upload-service.test.ts` beside `src/features/content/services/upload-service.ts`.
- For App Router/API route tests, use route-level test files beside route handlers when a runner is added, for example `src/app/api/content-projects/route.test.ts` beside `src/app/api/content-projects/route.ts`.
- For Python transcription behavior, add tests under `scripts/` only if a Python test runner is introduced, for example `scripts/test_transcribe_audio.py`.

**Naming:**
- No current pattern. Use `*.test.ts` / `*.test.tsx` for TypeScript unit tests and `*.spec.ts` only for broader integration or route specs if the project adopts that distinction.

**Structure:**
```
src/
  features/
    content/
      services/
        upload-service.ts
        upload-service.test.ts
  lib/
    storage/
      local-storage.ts
      local-storage.test.ts
  app/
    api/
      content-projects/
        route.ts
        route.test.ts
```

## Test Structure

**Suite Organization:**
```typescript
// No current in-repo test suite exists.
// Recommended shape when a runner is added:
describe("parseProjectFormData", () => {
  it("validates title, prompt, content type, images, and audio", () => {
    // Arrange FormData and File objects.
    // Act through parseProjectFormData from src/features/content/services/upload-service.ts.
    // Assert parsed input and file filtering behavior.
  });
});
```

**Patterns:**
- Setup pattern: not established. Future tests should create isolated temporary storage/database state instead of using committed `storage/` contents.
- Teardown pattern: not established. Future tests touching filesystem code in `src/lib/storage/local-storage.ts` should remove temporary folders after each test.
- Assertion pattern: not established. Use direct assertions around boundary helpers first: Zod parsing in `src/features/content/schemas.ts`, file type validation in `src/features/content/services/upload-service.ts`, path guards in `src/lib/storage/local-storage.ts`, and API helper responses in `src/lib/api-response.ts`.

## Mocking

**Framework:** Not detected.

**Patterns:**
```typescript
// No current mocking pattern exists.
// Recommended once Vitest/Jest is introduced:
vi.mock("@/lib/prisma", () => ({
  prisma: {
    contentProject: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
  },
}));
```

**What to Mock:**
- Mock Prisma for unit tests around `src/features/content/actions.ts`, `src/features/content/queries.ts`, `src/features/schedule/actions.ts`, and `src/features/settings/actions.ts`.
- Mock process execution around `src/features/video/services/video-service.ts` and `src/features/video/services/transcription-service.ts` so tests do not require real FFmpeg, ffprobe, Python, or faster-whisper.
- Mock provider/network clients around `src/integrations/gemini/gemini-service.ts` and `src/integrations/manus/manus-service.ts`.
- Mock filesystem roots for storage tests around `src/lib/storage/local-storage.ts` unless the test is explicitly an integration test with temp directories.

**What NOT to Mock:**
- Do not mock Zod schemas in `src/features/content/schemas.ts`, `src/features/schedule/actions.ts`, or `src/features/settings/actions.ts`; validate real schema behavior.
- Do not mock pure formatters in `src/lib/formatters.ts`.
- Do not mock `assertStoragePath` behavior in `src/lib/storage/local-storage.ts`; test it against safe and unsafe paths directly.
- Do not mock `apiCreated` and `apiError` from `src/lib/api-response.ts` in route tests; they are part of the API contract.

## Fixtures and Factories

**Test Data:**
```typescript
// No current fixture factory exists.
// Recommended baseline for content tests:
const contentInput = {
  title: "Campanha produto A",
  prompt: "Roteiro curto para Reels",
  caption: "Legenda opcional",
  contentType: "REELS" as const,
};
```

**Location:**
- Not established. Prefer small local fixtures inside test files until duplication appears.
- If shared fixtures become necessary, place feature-specific factories near the feature tests, for example `src/features/content/test-fixtures.ts`.
- Keep binary/media fixtures outside production storage paths. Use temporary directories instead of `storage/uploads/` or `storage/generated/`.

## Coverage

**Requirements:** None enforced.

**View Coverage:**
```bash
# Not available. No coverage command exists in package.json.
```

## Test Types

**Unit Tests:**
- Not implemented.
- Highest-value candidates are pure or mostly isolated modules: `src/features/content/schemas.ts`, `src/features/content/services/upload-service.ts`, `src/lib/formatters.ts`, `src/lib/storage/local-storage.ts`, `src/lib/api-response.ts`, and caption/text helpers in `src/features/video/services/video-service.ts`.

**Integration Tests:**
- Not implemented.
- Future integration tests should cover Prisma-backed workflows in `src/features/content/actions.ts`, `src/features/schedule/actions.ts`, and `src/features/settings/actions.ts` with an isolated database configured through environment variables.
- API route integration tests should cover `src/app/api/content-projects/route.ts`, `src/app/api/content-projects/[id]/media/route.ts`, `src/app/api/content-projects/[id]/generate/route.ts`, and `src/app/api/files/[...path]/route.ts`.

**E2E Tests:**
- Not used.
- Manual browser verification currently relies on `npm run dev` and app flows through `src/app/contents/new/page.tsx`, `src/app/contents/[id]/page.tsx`, `src/app/schedule/page.tsx`, and `src/app/settings/page.tsx`.

## Common Patterns

**Async Testing:**
```typescript
// No current async test pattern exists.
// Recommended shape for service tests:
await expect(videoService.generateProjectVideo(projectId)).rejects.toThrow(
  "Projeto precisa de pelo menos uma imagem.",
);
```

**Error Testing:**
```typescript
// No current error test pattern exists.
// Recommended shape for validation helpers:
expect(() => contentProjectInputSchema.parse({ title: "", prompt: "" })).toThrow();
```

**Manual Verification:**
- Run `npm run lint` before handing off changes; it executes ESLint from `eslint.config.mjs` and currently passes.
- Run `npm run build` for Next.js compilation and production build verification.
- For Prisma changes, run `npm run prisma:generate` after editing `prisma/schema.prisma`.
- For database migrations, use `npm run prisma:migrate` during development and `npm run prisma:deploy` for applying existing migrations.
- For video generation behavior, manual verification requires FFmpeg/ffprobe availability via `FFMPEG_PATH` and `FFPROBE_PATH` or system PATH, as consumed by `src/features/video/services/video-service.ts`.
- For Whisper transcription behavior, manual verification requires Python dependencies from `requirements-whisper.txt`, consumed by `scripts/transcribe_audio.py` through `src/features/video/services/transcription-service.ts`.
- For Gemini and Manus flows, verify behavior without committing secrets. The app reads provider configuration through environment variables and/or saved settings in `src/integrations/gemini/gemini-service.ts`, `src/integrations/manus/manus-service.ts`, and `src/features/settings/actions.ts`.

---

*Testing analysis: 2026-04-21*
