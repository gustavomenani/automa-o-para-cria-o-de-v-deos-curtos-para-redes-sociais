# Phase 2: AI Asset Pipeline - Context

**Gathered:** 2026-04-22
**Status:** Ready for planning
**Mode:** Auto-generated during autonomous continuation

<domain>
## Phase Boundary

The prompt-based creation flow must generate enough material for a short vertical video without requiring manual upload first. Manus is the primary provider path, Gemini remains the fallback/test path, and manual upload remains available when providers return partial or text-only results.

</domain>

<decisions>
## Implementation Decisions

### Provider Priority
- Use Manus as the primary automated asset path when configured.
- Keep Gemini as fallback/test support and preserve existing Gemini prompt semantics where required by current form/action wiring.
- Treat partial provider output as a recoverable user-facing state, not a hard product dead end.
- Persist provider task/status/summary data so support and UI can explain what happened.

### User Recovery
- If generated assets are incomplete, show missing image/audio guidance and keep manual upload completion visible.
- Keep provider errors safe for users: no keys, stack traces, local paths, raw JSON payloads, or provider internals.
- Show enough run metadata to distinguish running, completed, partial, failed, and manual-action-required outcomes.
- Do not promise fully automated social posting in this phase.

### the agent's Discretion
Implementation details may follow existing codebase patterns as long as the phase plans, UI-SPEC, and roadmap success criteria are satisfied.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/features/content/actions.ts` owns prompt/manual creation flow and redirects with query-based feedback.
- `src/features/content/queries.ts` owns content read models consumed by detail pages.
- `src/features/content/components/create-content-form.tsx` is the prompt/manual upload form surface.
- `src/integrations/manus/manus-service.ts` and `src/integrations/gemini/gemini-service.ts` isolate provider behavior.
- `src/components/feedback-banner.tsx` and existing Tailwind page patterns provide safe status display conventions.

### Established Patterns
- Server components call feature queries and compose feature UI.
- Server actions validate inputs, orchestrate services, revalidate affected routes, and redirect with user-safe messages.
- Prisma relations are included in feature query read models and surfaced through typed content objects.
- Integration failures should be normalized before reaching pages.

### Integration Points
- Prompt submit flow connects `CreateContentForm` to `createContentAction`.
- Provider orchestration connects content creation to Manus/Gemini services and saved `MediaFile` rows.
- Detail page consumes `getContentById` and should render latest provider run state.
- Settings and README copy must describe configured Manus behavior and Gemini fallback accurately.

</code_context>

<specifics>
## Specific Ideas

Follow the approved `02-UI-SPEC.md`: primary CTA copy should be "Gerar assets com Manus"; partial result copy should tell the user that textual planning exists but images or audio are missing; error copy should direct the user to check provider configuration or complete manually.

</specifics>

<deferred>
## Deferred Ideas

- Auth/session scoping belongs to Phase 3.
- Queue/worker processing belongs to Phase 4.
- Social publishing adapters and assisted export belong to Phase 5.

</deferred>
