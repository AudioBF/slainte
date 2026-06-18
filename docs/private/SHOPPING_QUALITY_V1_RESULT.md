# Shopping Quality v1 — Result

**Date:** 2026-06-17  
**Context:** Shopping Source Fix v1 routes `plannedMeals` over on-demand `recipes`. This sprint improves list quality from lightweight weekly plans.  
**Status:** ✅ Implemented

---

## Summary

**Compras → Do cardápio** now uses an enhanced `plannedMeals` prompt (week-wide consolidation, Dublin supermarkets, 30–50 item target) plus server-side deduplication of duplicate item names after Gemini.

---

## Changes

| Area | Change |
|---|---|
| `supabase/functions/_shared/shopping-list.ts` | Richer PT-BR prompts; meals grouped by weekday; `consolidateShoppingListItems()`; `plannedMeals` preferred in `buildShoppingListRequestPrompt` |
| `supabase/functions/generate-shopping-list/index.ts` | Apply consolidation before response |
| `src/services/ai/prompts/shopping-list.prompt.ts` | Client mirror of prompts (legacy / docs parity) |
| `scripts/smoke-shopping-quality.mjs` | Quality smoke: 28–55 items, 0 duplicate names, recipes fallback |
| `scripts/smoke-shopping-source.mjs` | Raised plannedMeals item floor to 28 |

**Unchanged:** `ShoppingItem` shape, Zustand persistence, Recipe On Demand, Meal Plan Lightweight, Gemini models, `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN`.

---

## Rules (enforced)

| Source | When |
|---|---|
| `plannedMeals` | `plannedMeals.length > 0` (primary) |
| `recipes` | `plannedMeals.length === 0` && `recipes.length > 0` (legacy) |

Prompt highlights: week-wide coverage, merge duplicates, practical Irish supermarket quantities, no vague/gourmet items, 30–50 distinct lines.

Post-processing: case/diacritic-insensitive name merge; combined quantities when Gemini returns duplicate names.

---

## Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ |
| `npm run build:web` | ✅ |
| Edge deploy `generate-shopping-list` | ✅ |
| `node scripts/smoke-shopping-quality.mjs` | ✅ 33 items, 0 dupes, recipes fallback 4 items |
| `node scripts/smoke-shopping-source.mjs` | ✅ plannedMeals 30 vs recipe 4 |

Smokes use Edge meal-plan when available; otherwise a 21-meal fixture (`scripts/fixtures/lightweight-meal-plan.mjs`).

---

## Manual smoke (production)

1. Cardápio leve (21 meals, 0 recipes)  
2. (Opcional) 1 receita on-demand — lista ainda usa semana inteira (Source Fix)  
3. Compras → **Do cardápio** → ~30–50 itens, poucos duplicados  
4. **Marcar todos** / **Desmarcar todos** OK  
5. Sem plano, só `recipes` no store → fallback legado funciona  

---

## Not in v1

- Quantity math / unit normalization across merges  
- Section-aware consolidation (Hortifruti vs Outros tuning in prompt only)  
- Auto-refresh shopping when plan changes  
