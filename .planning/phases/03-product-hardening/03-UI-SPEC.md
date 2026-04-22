---
phase: 03
slug: product-hardening
status: draft
shadcn_initialized: false
preset: none
created: 2026-04-22
---

# Phase 03 - UI Design Contract

> Visual and interaction contract for frontend work in Phase 3 (Product Hardening). Scope is user-facing hardening only: login/session gates, upload validation errors, generation locked state, caption review warning/edit affordance, schedule past-date validation, and redacted error messaging.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (manual Tailwind v4 token contract) |
| Preset | not applicable |
| Component library | local reusable components in `src/components` + feature components |
| Icon library | lucide-react |
| Font | Geist Sans (`--font-geist-sans`), Geist Mono for code (`--font-geist-mono`) |

Source: Phase 2 UI spec, `src/app/globals.css`, `src/components/*`, `package.json`.

---

## Visual Hierarchy and Focal Point

- Primary focal point (auth): a compact login/session gate with one clear credential form and CTA.
- Primary focal point (upload validation): inline file-limit guidance near upload controls, then a red `FeedbackBanner` if rejected.
- Primary focal point (generation): locked/in-progress state on the generate action, with status text before any secondary action.
- Primary focal point (caption review): warning banner titled `Revise a legenda` directly above the editable caption area.
- Primary focal point (schedule validation): date/time validation message inside the scheduling card before persistence.
- Redacted errors must appear in existing `FeedbackBanner` styling, never as raw provider payloads, stack traces, filesystem paths, or environment variable names.
- Preserve the existing app shell, card structure, two-column review layout, and schedule card placement. Do not introduce a landing page or broad redesign.

---

## Spacing Scale

Declared values (must be multiples of 4):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon gaps, compact inline padding, status badge internals |
| sm | 8px | Compact element spacing, control adjacency, nav item gaps |
| md | 16px | Default element spacing, feedback banner padding, mobile page rhythm |
| lg | 24px | Card padding, grouped form spacing, review panel gaps |
| xl | 32px | Page section gaps and dashboard groups |
| 2xl | 48px | Major section breaks only |
| 3xl | 64px | Reserved for page-level breathing room; avoid inside hardening controls |

Exceptions: icon-only touch targets must be at least 44px square when introduced; existing text buttons remain `px-4 py-2.5`.

---

## Typography

Allowed font sizes: 12, 14, 16, 30 (max 4)

Allowed font weights: 400, 600 (max 2)

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 16px | 400 | 1.5 |
| Label | 14px | 600 | 1.4 |
| Helper/status text | 12px | 400 | 1.5 |
| Display | 30px | 600 | 1.2 |

Use existing `text-sm` for most form copy and banner content. Use `text-xs` only for helper text, badges, file-limit notes, and secondary metadata. Do not add heavier weights than `font-semibold`.

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | #fafaf9 | page background and app shell base (`bg-stone-50`) |
| Secondary (30%) | #ffffff | cards, forms, side navigation panels |
| Accent (10%) | #0f766e | primary CTA, active/brand marker, focus outline, validation guidance icon, generation in-progress emphasis |
| Destructive | #b91c1c | destructive actions, auth denial/error banners, rejected upload/schedule errors |

Accent reserved for: login CTA, create/generate/save primary CTA, active brand/nav marker, keyboard focus outline, non-error guidance icon, generation in-progress labels. Do not use teal for error, warning, disabled, or destructive states.

Semantic status colors must follow existing local patterns:

| Status | Classes / Color Intent | Usage |
|--------|------------------------|-------|
| Success | `emerald-50/100`, `emerald-800/900` | saved schedule, valid completion |
| Info | `sky-50/100`, `sky-800/900` | session notices, caption review warning when not blocking |
| Warning | `amber-100`, `amber-800` | ready-to-post and generation locked/queued state |
| Error | `red-50/100`, `red-800/900` | rejected upload, past schedule, unauthenticated/forbidden, redacted processing failure |
| Disabled | `stone-100`, `zinc-400` | unavailable generate/schedule controls |

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA | Entrar no painel |
| Existing generation CTA | Gerar video |
| Existing locked generation label | Gerando video... |
| Caption edit CTA | Salvar legenda revisada |
| Schedule CTA | Salvar agendamento |
| Empty state heading | Nenhum conteudo criado ainda. |
| Empty state body | Crie o primeiro projeto para gerar roteiro, imagens e audio automaticamente, ou use upload manual. |
| Auth required error | Faca login para acessar seus projetos. |
| Forbidden resource error | Voce nao tem acesso a este conteudo. |
| Upload validation error | Arquivo recusado. Verifique formato, tamanho e quantidade antes de tentar novamente. |
| Upload limits helper | Aceitamos PNG, JPG ou WebP para imagens e MP3, WAV ou M4A para audio, dentro dos limites do sistema. |
| Generation locked state | Ja existe uma geracao em andamento para este projeto. Aguarde a conclusao antes de tentar novamente. |
| Caption warning | A sincronizacao da legenda pode estar aproximada. Revise o texto antes de gerar ou publicar. |
| Schedule past-date error | Escolha uma data e horario futuros para salvar o agendamento. |
| Redacted generic error | Nao foi possivel concluir a acao. Revise os dados e tente novamente. |
| Redacted processing error | Nao foi possivel concluir o processamento. Revise os arquivos enviados e tente novamente. |
| Destructive confirmation | Excluir conteudo: Tem certeza que deseja excluir este conteudo? Essa acao nao pode ser desfeita. |

All user-facing copy must be in Portuguese and actionable. Error text must describe the user-level problem and next step without exposing keys, provider payloads, stack traces, local paths, SQL, FFmpeg command lines, or request headers.

---

## Interaction Contract

- Login/session gate must block app-shell private surfaces before rendering project data. Anonymous users see the login form or auth-required banner, not partially loaded content.
- Session-expired state must keep the user on a safe surface and use the copy `Faca login para acessar seus projetos.`
- Upload validation must happen before processing. Rejected files must keep the user on the form/review page and identify the rejected category: `imagem`, `audio`, `tamanho`, `quantidade`, `duracao`, or `formato`.
- Upload controls must keep existing accepted-format helper text visible even after an error.
- Generation concurrency must disable the generate/regenerate button while a generation is pending or locked. The button uses `disabled:cursor-not-allowed` and a visible label, not only opacity.
- When generation is locked by an existing server-side run, show an amber/info banner above the review header using the locked-state copy from this spec.
- Caption review affordance must be an edit control for the existing caption text only. Do not introduce a full timeline editor, waveform editor, or scene-level subtitle editor in this phase.
- Caption warning must appear before schedule/download decisions when caption confidence is low or fallback sync was used.
- Past schedule validation must be enforced both by `min` on date inputs and by a server-returned banner using the schedule past-date copy.
- Disabled schedule controls must preserve the existing pattern: `disabled:bg-stone-100 disabled:text-zinc-400`, plus helper copy when no video exists.
- Redacted API/action errors must use `FeedbackBanner` with `type="error"` and safe fallback copy. Detailed diagnostics belong in server logs only.

---

## Surface Contracts

| Surface | Required UI State | Component Pattern |
|---------|-------------------|-------------------|
| Login/session gate | unauthenticated, invalid credentials, expired session, authenticated redirect | centered white card, `FeedbackBanner`, teal primary button, standard inputs |
| App shell private routes | authenticated only, forbidden/not found resources | existing `AppShell`; no private data before auth check |
| Upload/create form | file limit helper, rejected file banner, disabled submit during pending | existing `CreateContentForm`, `SubmitButton`, `FeedbackBanner` |
| Content review page | locked generation, caption warning, editable caption, redacted processing error | existing review card layout and right-side caption/media sections |
| Generate/regenerate action | idle, pending, locked, failed, ready | existing `GenerateVideoButton` with disabled and status banner |
| Schedule card | no video disabled state, valid future date, past-date rejection | existing schedule form card, `SubmitButton`, `FeedbackBanner` |
| Schedule list | ready-to-post and failed states | existing badge colors: amber ready, red failed |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| none (no third-party registry) | n/a | not applicable - manual Tailwind/component contract only - 2026-04-22 |

No shadcn `components.json` exists. Phase 3 must not add third-party registry blocks unless a future design-system initialization phase explicitly approves and vets them.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
