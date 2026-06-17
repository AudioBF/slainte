# Recipe On Demand v1 — Result

**Plan:** `docs/private/MEAL_PLAN_RECIPE_ON_DEMAND_PLAN.md`  
**Date:** 2026-06-16  
**Status:** ✅ Implemented and validated  
**Production meal plan:** `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=false` (unchanged)

---

## Summary

Users can generate a **full recipe for one planned meal** on demand from Dieta. Weekly lightweight meal plans stay unchanged (`recipes: []`). Recipe generation runs through the new **`generate-recipe`** Edge function; the client stores the result via `upsertRecipe` + `linkPlannedMealRecipe` and opens `/recipe/[id]`.

---

## Changes

| Area | Change |
|---|---|
| `supabase/functions/generate-recipe/index.ts` | New Edge handler (auth + Gemini structured JSON) |
| `supabase/functions/_shared/recipe-generation.ts` | Prompt, Zod schema, request validation |
| `supabase/functions/_shared/gemini.ts` | `recipe` task + `RECIPE_MODELS` chain |
| `supabase/config.toml` | `generate-recipe` with `verify_jwt = true` |
| `src/services/ai/schemas/recipe-generation.schema.ts` | Client Zod + Gemini response schema |
| `src/services/ai/generate-recipe.ts` | `generateRecipeForMeal()` + mock mode |
| `src/services/ai/edge-client.ts` | `invokeGenerateRecipe()` |
| `src/features/diet/hooks/useRecipeGenerator.ts` | Hook: generate, loading, per-meal error |
| `src/store/useAppStore.ts` | `upsertRecipe`, `linkPlannedMealRecipe` |
| `app/(tabs)/diet.tsx` | **Gerar receita** CTA, loading skeleton, tap-to-open when linked |
| `src/constants/ai-messages.ts` | `RECIPE_MESSAGES` |
| `scripts/smoke-generate-recipe.mjs` | Edge smoke (signed-in invoke) |

**Not changed:** production `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN`, `EXPO_PUBLIC_GEMINI_API_KEY`, store persistence shape, batch recipe generation, regenerate/edit flows.

---

## Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ |
| `npm run build:web` | ✅ |
| Edge deploy `generate-recipe` | ✅ |
| Smoke `node scripts/smoke-generate-recipe.mjs` | ✅ (~10.2 s, 7 ingredients, 3 steps) |

---

## UX

| State | Behavior |
|---|---|
| Planned meal **without** recipe | Hint + **Gerar receita** button; loading skeleton with `RECIPE_MESSAGES` |
| After generate | Recipe saved, `recipeId` linked, navigates to recipe detail |
| Planned meal **with** recipe | Tap card → `/recipe/[id]` (unchanged) |

---

## Next (out of v1 scope)

- Regenerate alternate recipe (v2)
- Edge cache / dedup by meal hash (v2)
- Re-enable production Edge for weekly meal plan (after soak)
