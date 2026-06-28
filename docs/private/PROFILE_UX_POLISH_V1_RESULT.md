# Profile UX Polish v1 — Result

**Date:** 2026-06-28  
**Status:** `PENDING MANUAL SMOKE`  
**Scope:** UX/layout only on the Perfil screen — no store, auth, Edge, IA, schema, env, or other flows.

---

## Objective

Improve the visual and layout quality of the Perfil screen, identified as the weakest area of the app after core flows and Edge Meal Plan reached production stability.

Goals for this sprint:

- Fix misaligned macro goal inputs and awkward `kcal` / `g` labels
- Resolve carbohydrate label overflow on narrow widths
- Stop the sticky “Salvar alterações” bar from overlapping scroll content
- Soften heavy/square cards
- Give the “Mais opções” section more breathing room

Out of scope: Edge Functions, IA, schema, Zustand store, auth, env flags, Meal Plan, Shopping, Receita, Hoje, and Dieta.

---

## Files changed

| File | Change |
|---|---|
| `app/profile.tsx` | Profile UX polish — layout, macro grid, cards, footer clearance, list-style actions |
| `docs/private/PROFILE_UX_POLISH_V1_RESULT.md` | This document |

---

## Visual changes summary

### Metas diárias (macro goals)

- Replaced row layout (label left, input right) with a **2×2 grid**
- Short labels with macro colors: Calorias, Proteína, **Carbs**, Gordura — avoids “Carboidrato” overflow
- Unit (`kcal` / `g`) shown as a **suffix inside** the input box, right-aligned
- Full label preserved in `accessibilityLabel` (e.g. “Carboidrato”)

### Objetivo

- Replaced `ChipGroup` with **`GoalPicker`** (same pattern as onboarding) — radio-style options with descriptions

### Cards

- Profile sections use **lighter cards**: `radius.xl`, hairline border, no shadow/elevation

### Sticky “Salvar alterações”

- **`footerSpace` is dynamic** via `useSafeAreaInsets` — bar height + safe area + buffer — so bottom content (especially “Mais opções”) is not covered

### Conta e nuvem

- “Gerenciar conta” and “Sair” are **list rows with chevron** instead of stacked outline buttons
- “Entrar / Criar conta” remains a primary button when signed out

### Mais opções

- Three actions as a **compact list** with separators and chevron (`›`)
- “Aplicar metas padrão do objetivo” is a **text link** (orange) instead of a full outline button

---

## Explicit non-changes

| Area | Status |
|---|---|
| Zustand store / persist | No change |
| Auth / Supabase sync | No change |
| Edge Functions | No change |
| IA / Gemini prompts / schemas | No change |
| Database schema | No change |
| Env vars (`EXPO_PUBLIC_*`) | No change |
| Meal Plan flow | No change |
| Shopping | No change |
| Receita | No change |
| Hoje (`index.tsx`) | No change |
| Dieta (`diet.tsx`) | No change |
| Business logic (save, macros parsing, onboarding reset) | Unchanged — same handlers and store calls |

---

## Manual validation checklist

- [ ] Open Perfil from Hoje (avatar tap) — screen loads without layout errors
- [ ] **Identidade** — avatar, name field, “Alterar foto” link look correct
- [ ] **Objetivo** — `GoalPicker` selects lose / maintain / gain with descriptions
- [ ] **Metas diárias** — 2×2 grid; no “Carboidrato” overflow on narrow mobile / PWA width
- [ ] Macro inputs accept numeric edits; units (`kcal`, `g`) read clearly inside each field
- [ ] “Aplicar metas padrão do objetivo” updates values for current goal
- [ ] **Preferências** — restrictions textarea unchanged in behavior
- [ ] **Conta e nuvem** — signed-in: email, sync hint, list rows navigate / sign out; signed-out: primary CTA to account
- [ ] **Mais opções** — three rows tappable; chevrons visible; adequate vertical spacing
- [ ] Scroll to bottom — **no overlap** between last row and sticky “Salvar alterações”
- [ ] Tap **Salvar alterações** — profile persists; button shows “Salvo ✓”
- [ ] **Rever introdução** — still resets onboarding and routes to `/onboarding`
- [ ] Web PWA (`slainte-sigma.vercel.app` or local) — grid and footer clearance OK
- [ ] Native safe area (home indicator) — footer padding sufficient

---

## Automated checks

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ Pass (2026-06-28) |
| `npm run lint` | N/A — no lint script in `package.json` |

---

## Notes

- Local `.env` should remain `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=false` — not touched in this sprint.
- Commit intentionally deferred until manual smoke passes.
