# Small UX Sweep v1 — Result

**Date:** 2026-06-19  
**Status:** ✅ PASS — local build validated

## Objective

Small copy and micro-UX sweep on stable Sláinte screens (Dieta, Hoje, Compras, Mercados) to improve PT-BR clarity and product polish without changing IA, Edge Functions, stores, schema, or core flows.

## Files changed

| File | Change |
|---|---|
| `app/(tabs)/diet.tsx` | Header subtitle, plan macro hint, recipe/register hints |
| `app/(tabs)/index.tsx` | Empty state copy, macro helper under ring |
| `app/(tabs)/shopping.tsx` | Header, button label/loading, hints, empty state |
| `src/constants/ai-messages.ts` | Meal plan loading messages (no false recipe promise) |
| `src/features/home/TodayPlanSection.tsx` | Plan-complete copy |
| `src/features/home/selectPrimaryDailyInsight.ts` | Softer insight titles + empty-day message |
| `app/(tabs)/markets.tsx` | Actionable tip |
| `docs/private/SMALL_UX_SWEEP_V1_RESULT.md` | This document |
| `docs/private/PROJECT_BRIEFING.md` | Status line |

## Scope implemented

### Must-have

| Item | Result |
|---|---|
| Dieta header without `meal-prep` | ✅ `Planeje a semana — receitas quando você quiser` |
| Meal plan loading — no recipe promise | ✅ Updated `MEAL_PLAN_MESSAGES` |
| Dieta plan macro context | ✅ `Macros estimados do cardápio.` |
| Recipe hint | ✅ `Toque em Gerar receita para ingredientes e passo a passo` |
| Register other-day hint | ✅ `Só dá para registrar refeições de hoje aqui.` |
| Hoje empty state | ✅ Action-oriented copy |
| Hoje macro helper | ✅ `Valores somam o que você registrou hoje.` |
| Compras header | ✅ `Compras da semana a partir do plano` |
| Compras loading button | ✅ `Gerando lista…` |
| Compras button | ✅ `Gerar da semana` |
| Compras hints/empty | ✅ Dieta-first + generate list guidance |

### Nice-to-have (included)

| Item | Result |
|---|---|
| Softer daily insight titles (3) | ✅ |
| Empty-day insight message | ✅ |
| Today plan complete copy | ✅ |
| Mercados tip | ✅ |

### Deferred

| Item | Reason |
|---|---|
| Shopping badge `plano` → `Cardápio` | Badge lives in `ShoppingListItem.tsx` (out of allowed file list for this sprint) |

## Out of scope (confirmed untouched)

- Supabase Edge Functions and Gemini prompts
- Zustand stores, persist shape, schemas, migrations
- `app/recipe/[id].tsx` (Recipe UX Polish v1.1 intact)
- Meal Plan / Shopping / Hoje business logic
- `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN` (remains `false`)
- Auth, sync, onboarding, new screens

## Commands executed

```powershell
npx.cmd tsc --noEmit
Select-String -Path .env -Pattern '^EXPO_PUBLIC_USE_EDGE_MEAL_PLAN='
npm run build:web
```

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ PASS |
| `npm run build:web` | ✅ PASS |
| `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN` | ✅ `false` |

Bundle verification (`entry-44cbde1330e1bd77cad89a6ea24dd1e1.js`): new copy present; removed strings `Cardápio semanal com meal-prep` and `Gerando receitas e ingredientes` absent.

## Manual smoke (local build)

Structural/code verification + bundle strings. Production deploy pending after git push.

| Area | Expected | Verified |
|---|---|---|
| Dieta header | No `meal-prep` | ✅ bundle |
| Loading messages | No recipe promise | ✅ bundle |
| Compras | `Gerar da semana` / `Gerando lista…` | ✅ bundle |
| Hoje empty + macro helper | New copy | ✅ bundle |
| Recipe screen | Unchanged file | ✅ no diff |
| Core logic | No store/Edge diff | ✅ git scope |

**Post-deploy:** re-run checklist on https://slainte-sigma.vercel.app after Vercel build.

## Risks / pendencies

- Production copy updates only after Vercel deploy of this commit.
- Shopping item badge still shows `PLANO` (uppercase via CSS) — deferred to a one-line follow-up in `ShoppingListItem.tsx` if desired.
- Macro helper on Hoje adds one caption line under bars — monitor on small screens.

## Verdict

**Small UX Sweep v1: PASS** — ready to commit and deploy web bundle.

Suggested commit: `fix(ux): small copy sweep for diet, today and shopping`
