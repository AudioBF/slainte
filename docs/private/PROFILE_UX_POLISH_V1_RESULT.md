# Profile UX Polish v1 — Result

**Date:** 2026-06-28  
**Status:** `PATCH APPLIED` — awaiting manual re-smoke post-deploy  
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

## Regressions found (2026-06-28 smoke)

| Issue | Symptom |
|---|---|
| Macro grid | Labels/units visually outside bordered areas; `g` floating past card edge on narrow widths (`flexBasis: 46%` + `minWidth: 140` overflow) |
| Sticky save bar | After “Salvar”, screen appeared frozen — touches blocked outside the footer |
| Alterar foto | Unreliable on native without gallery permission; nested `Pressable` on avatar; no `contentFit: cover` on preview |

---

## Patch applied

| File | Change |
|---|---|
| `app/profile.tsx` | Unified macro blocks; docked save bar (no absolute overlay); photo picker permissions + web/native editing split; saved feedback timeout |
| `src/components/Avatar.tsx` | `contentFit="cover"` for centered square preview (one line) |
| `docs/private/PROFILE_UX_POLISH_V1_RESULT.md` | This document |

### Patch details

**Macros:** Each macro is one bordered block (`macroBlock`) containing label + input row + unit. Grid uses `width: '48%'` with `overflow: 'hidden'` and `minWidth: 0` on input — no floating units.

**Save bar / freeze fix:** Replaced `PrimaryActionBar` (absolute `zIndex: 100` overlay) with a **docked footer** in normal flex layout (`ScrollView` + bottom bar sibling). Removes full-screen touch interception on RN Web/Android. `saved` resets after 2.5s.

**Alterar foto:** `requestMediaLibraryPermissionsAsync` on native; `allowsEditing` only when `Platform.OS !== 'web'`; guard against double-tap (`pickingPhoto`); `Avatar` uses `onPress`; loading hint “Abrindo galeria…”.

**Web/PWA limitation:** Square crop UI is not available on web without new dependencies — selection works; preview uses `cover` centering.

---

## Original v1 visual changes (retained)

### Objetivo

- `GoalPicker` (radio-style options with descriptions)

### Cards

- Lighter cards: `radius.xl`, hairline border, no shadow

### Conta e nuvem / Mais opções

- List rows with chevron instead of stacked outline buttons

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

- [ ] Open Perfil on **narrow mobile** width
- [ ] **Macros** — each of Calorias / Proteína / Carbs / Gordura: label + value + unit inside same bordered block; no overflow or floating `g`/`kcal`
- [ ] Edit calories, protein, carbs, fat — values update
- [ ] Tap **Salvar alterações** — persists; shows “Salvo ✓” briefly then reverts label
- [ ] **After save, screen does NOT freeze** — scroll, edit fields, open list rows
- [ ] Scroll to bottom — **Mais opções** fully tappable; not covered by save bar
- [ ] Tap **Alterar foto** (link and avatar) — gallery opens on native; web file picker works
- [ ] Cancel picker — screen remains interactive; retry works
- [ ] Select photo — preview centered (`cover`); crop when native editing supported
- [ ] **Gerenciar conta**, **Sair**, **Mais opções** rows work after save
- [ ] Refresh — data persists
- [ ] Web PWA — no post-save freeze; macros layout OK

---

## Automated checks

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ Pass (2026-06-28 patch) |
| `npm run lint` | N/A — no lint script in `package.json` |

---

## Notes

- v1 commit: `9306c97` — `fix(profile): polish Perfil layout and macro inputs`
- Patch commit: see `git log -1` on master
- Local `.env` should remain `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=false`
