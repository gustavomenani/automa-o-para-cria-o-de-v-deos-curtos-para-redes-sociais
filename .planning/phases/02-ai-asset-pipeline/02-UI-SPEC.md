---
phase: 02
slug: ai-asset-pipeline
status: approved
shadcn_initialized: false
preset: none
created: 2026-04-21
reviewed_at: 2026-04-21T00:00:00-03:00
---


# Phase 02 - UI Design Contract

> Visual and interaction contract for frontend work in Phase 2 (AI Asset Pipeline).

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (manual Tailwind v4 token contract) |
| Preset | not applicable |
| Component library | local reusable components in `src/components` + feature components |
| Icon library | lucide-react |
| Font | Geist Sans (`--font-geist-sans`), Geist Mono for code (`--font-geist-mono`) |

---

## Visual Hierarchy and Focal Point

- Primary focal point (create flow): AI generation panel and primary CTA for automated generation.
- Secondary focal point: required form fields (title, prompt, content type).
- Tertiary focal point: manual upload fallback section (images/audio) when AI output is partial.
- Review page priority order: generation status banner -> generated video preview -> missing assets guidance -> regenerate/schedule actions.
- Icon-only actions are not allowed for primary/destructive actions; text labels must be visible.

---

## Spacing Scale

Declared values (multiples of 4 only):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | icon gaps, compact inline spacing |
| sm | 8px | control adjacency, small status chips |
| md | 16px | default element spacing and body rhythm |
| lg | 24px | card section padding and grouped form spacing |
| xl | 32px | page section gaps |
| 2xl | 48px | major panel separation |
| 3xl | 64px | top-level page breathing room |

Exceptions: none

---

## Typography

Allowed font sizes: 14, 16, 20, 30 (max 4)

Allowed font weights: 400, 600 (max 2)

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 16px | 400 | 1.5 |
| Label | 14px | 600 | 1.4 |
| Heading | 20px | 600 | 1.3 |
| Display | 30px | 600 | 1.2 |

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | #fafaf9 | page background, app shell surfaces |
| Secondary (30%) | #ffffff | cards, forms, side navigation panels |
| Accent (10%) | #0f766e | primary CTA, active navigation state, keyboard focus outline, status emphasis for generation in progress |
| Destructive | #b91c1c | destructive actions and confirmation affordances only |

Accent reserved for: primary automation CTA, active nav marker, focus ring/outline, in-progress generation state labels. Do not use accent as the default color for every clickable control.

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA | Gerar assets com Manus |
| Secondary CTA (fallback flow) | Salvar e completar com uploads |
| Empty state heading | Nenhum conteudo criado ainda. |
| Empty state body | Crie o primeiro projeto para gerar roteiro, imagens e audio automaticamente, ou use upload manual. |
| Error state | Nao foi possivel gerar assets automaticamente. Revise configuracao da chave/provedor e complete com upload manual. |
| Partial result state | Plano textual gerado, mas faltam imagens ou audio. Envie os arquivos faltantes para continuar. |
| Destructive confirmation | Excluir conteudo: Tem certeza que deseja excluir este conteudo? Essa acao nao pode ser desfeita. |

---

## Interaction Contract

- Prompt automation flow must always show one of these explicit statuses: `running`, `completed`, `partial`, `failed`, `manual action required`.
- If provider returns text without enough media, UI must show missing-assets guidance and keep manual upload path visible.
- Error banners must include a next step, not only a failure statement.
- Provider errors must be user-safe (no keys, stack traces, filesystem paths, or raw provider payloads).

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| none (no third-party registry) | n/a | not applicable - manual Tailwind/component contract only - 2026-04-21 |

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-04-21



