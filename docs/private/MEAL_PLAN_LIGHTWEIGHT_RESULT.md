# Meal Plan Lightweight v1 — Result

**Plan:** `docs/private/MEAL_PLAN_LIGHTWEIGHT_PLAN.md`  
**Date:** 2026-06-16  
**Status:** ✅ Implemented and validated  
**Production:** `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=false` (unchanged)

---

## Summary

Weekly meal plan generation now returns **`plannedMeals` + `summary` only**. Full recipes are no longer generated. `recipes` is normalized to **`[]`** and orphan `recipeId` values are stripped. Shopping list generation accepts **`plannedMeals`** when the store has no recipes (legacy plans with recipes still use the recipe path).

---

## Changes

| Area | Change |
|---|---|
| `meal-plan.schema.ts` + Edge `_shared/meal-plan.ts` | Lightweight Gemini schema (no `recipes` required); `normalizeLightweightMealPlan()` |
| Prompts (client + Edge) | Planned meals only; descriptive names for shopping; no recipeId |
| `validate-meal-plan.ts` + Edge variety | Removed `recipes.length` rules |
| `generate-shopping-list` (client + Edge) | `plannedMeals` input path when `recipes.length === 0` |
| `useShoppingListGenerator` | Sends `recipes` if present, else `plannedMeals` |
| `diet.tsx` | Subtitle copy — no “ver receita” promise |
| `scripts/smoke-meal-plan-budget.mjs` | `lightweightOk`, shopping follow-up |

**Not changed:** store shape, production Edge flag, Gemini models, `generate-recipe` (future sprint).

---

## Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ |
| `npm run build:web` | ✅ |
| Edge deploy `generate-meal-plan` | ✅ |
| Edge deploy `generate-shopping-list` | ✅ |

### Smoke — Edge (`node scripts/smoke-meal-plan-budget.mjs 3 --delay 60000`)

| Run | Duration (s) | plannedMeals | recipes | HTTP |
|---|---|---|---|---|
| 1 | 26.5 | 21 | 0 | 200 |
| 2 | 33.1 | 21 | 0 | 200 |
| 3 | 31.4 | 21 | 0 | 200 |

| Metric | Result |
|---|---|
| Success | **3/3** ✅ |
| `lightweightOk` | **true** (`recipes === 0`, `plannedMeals >= 21`) |
| P95 | **33.1 s** (vs ~90–101 s full-stack) |
| Shopping from `plannedMeals` | **41 items** ✅ |
| `QUOTA_EXCEEDED` | **0** |
| Platform 504 | **0** |
| Structured `TIMEOUT` | **0** |

Artifact: `docs/private/.meal-plan-budget-smoke.json`

### UI / flows (by design — no regression expected)

| Flow | Status |
|---|---|
| Dieta — list, macros, register | ✅ Uses `plannedMeals` only |
| Hoje / TodayPlanSection | ✅ Unaffected |
| Compras — Do cardápio | ✅ `plannedMeals` path when `recipes` empty |
| Tap meal without recipe | ✅ Pressable disabled (existing behavior) |

---

## Performance note

Lightweight generation on Edge averaged **~31 s** vs **~58–101 s** for full recipe plans in prior smokes — primary goal of the sprint achieved.

---

## Next steps

1. **Recipe on demand** — future sprint: `generate-recipe` Edge function + Dieta CTA  
2. Preview UI smoke with client path (`EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=false` in prod)  
3. Re-evaluate production Edge flag only after Lightweight soak + optional recipe-on-demand

---

*Lightweight v1 complete. Production remains on client Gemini path.*
