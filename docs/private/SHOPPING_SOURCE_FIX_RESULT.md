# Shopping Source Fix v1 — Result

**Date:** 2026-06-17  
**Context:** App stability smoke noted shopping used `recipes` path when 1 on-demand recipe existed, yielding ~4 items instead of full-week `plannedMeals`.  
**Status:** ✅ Implemented

---

## Problem

`generateShoppingList()` preferred `recipes.length > 0` over `plannedMeals`. After Recipe On Demand, a single linked recipe caused **Compras → Do cardápio** to generate a list from that recipe only.

---

## Fix

| File | Change |
|---|---|
| `src/services/ai/generate-shopping-list.ts` | **plannedMeals first** when `plannedMeals.length > 0`; `recipes` only as legacy fallback when no plan |

**Rule (client):**

1. `plannedMeals.length > 0` → invoke Edge with `plannedMeals`
2. else `recipes.length > 0` → invoke Edge with `recipes`
3. else → `{ items: [] }`

No store/schema changes. Edge meal plan flag and Recipe On Demand unchanged.

---

## Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ |
| `npm run build:web` | ✅ |
| `node scripts/smoke-shopping-source.mjs` | ✅ plannedMeals path wins; week list > recipe-only list |

### Manual smoke (production)

1. Gerar cardápio leve (21 meals, 0 recipes)  
2. Gerar 1 receita on-demand  
3. Compras → **Do cardápio**  
4. Lista cobre a semana (dezenas de itens), não ~4 itens da receita isolada  

---

## Not changed

- Persisted Zustand / Supabase shape  
- `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN`  
- Recipe On Demand flow  
- Edge `generate-shopping-list` handler (already supports both inputs)
