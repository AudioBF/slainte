# Recipe On Demand Polish v1 — Result

**Date:** 2026-06-16  
**Status:** ✅ Implemented  
**Prerequisite:** Recipe On Demand v1 (`docs/private/MEAL_PLAN_RECIPE_ON_DEMAND_RESULT.md`)

---

## Summary

Small UX and reliability polish for on-demand recipe generation: correct Portuguese servings plural, double-click guard, clearer failure handling, and safer persistence/sync for linked recipes.

---

## Changes

| Area | Change |
|---|---|
| `src/lib/strings.ts` | `formatServingsPt()` — `1 porção` vs `N porções` |
| `app/recipe/[id].tsx` | Subtitle uses `formatServingsPt` |
| `src/features/diet/hooks/useRecipeGenerator.ts` | `inFlightMealIdRef` guard, `isRecipeLoading`, `toRecipeUserMessage`, atomic success via `saveGeneratedRecipe` |
| `src/services/ai/errors.ts` | `toRecipeUserMessage()` — recipe-specific copy |
| `app/(tabs)/diet.tsx` | Disable all **Gerar receita** while loading; error toast + inline message; retry via same button |
| `src/store/useAppStore.ts` | `saveGeneratedRecipe()` — atomic recipe + `recipeId` link + `profile.updatedAt`; `upsertRecipe` / `linkPlannedMealRecipe` bump `updatedAt` |
| `src/store/mergePersisted.ts` | `mergeRecipes` (union by id), `mergePlannedMeals` (preserve `recipeId` from either side) |

**Not changed:** weekly meal plan, Edge meal-plan flag, regenerate/edit/library flows.

---

## Behaviour

| Topic | Behaviour |
|---|---|
| Pluralização | `servings === 1` → **1 porção** |
| Duplo clique | `inFlightMealIdRef` + `disabled={isRecipeLoading}`; skeleton while `loadingMealId` matches meal |
| Erro | No `saveGeneratedRecipe` on failure → no partial recipe, no `recipeId` link; toast + inline text; user can tap **Gerar receita** again |
| Refresh | `recipes` + `plannedMeals` in Zustand `partialize` → AsyncStorage; `recipeId` opens recipe on Dieta after reload |
| Cloud sync | `saveGeneratedRecipe` updates `profile.updatedAt`; merge keeps recipes and `recipeId` links from local or cloud |

---

## Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ |
| `npm run build:web` | ✅ |

### Manual smoke (PWA)

1. Gerar cardápio leve  
2. **Gerar receita** em uma refeição — botão disabled + skeleton durante geração  
3. Receita abre em `/recipe/[id]` — subtítulo **1 porção** quando `servings === 1`  
4. Voltar à Dieta — refeição abre receita direto (toque)  
5. Refresh PWA — link e receita persistem  
6. (Opcional) Falha simulada — mensagem clara, sem link parcial, retry funciona  

---

## Next (out of scope)

- Regenerate alternate recipe (v2)
- Edit recipe / recipe library
