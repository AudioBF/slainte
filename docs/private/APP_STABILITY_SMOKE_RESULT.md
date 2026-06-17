# App Stability Smoke — Result

**Date:** 2026-06-17  
**Context:** After Recipe On Demand Polish v1 (`3cfccb5`)  
**Production:** https://slainte-sigma.vercel.app  
**Bundle:** `entry-df4bde5d84d58f5e9acfc28b4b6ee52b.js`  
**Flags:** `useEdgeMealPlan: false` ✅

---

## Pre-flight

| Check | Result |
|---|---|
| Git commit + push | ✅ `3cfccb5` on `origin/master` |
| Production deploy | ✅ (Vercel prod alias) |
| `npx tsc --noEmit` | ✅ |
| `npm run build:web` | ✅ |
| Bundle `useEdgeMealPlan` | ✅ `false` |
| `node scripts/smoke-meal-plan-client.mjs` | ✅ 21 meals, 0 recipes, ~25s, `edgeFlag: false` |
| `node scripts/smoke-generate-recipe.mjs` | ✅ ~9.8s, servings 1 |

---

## Manual smoke (production PWA)

Account: diag test user (`slainte.phase3b.ui+…@example.com`). **Login required** for `generate-recipe` (Edge JWT).

| # | Step | Result | Notes |
|---|---|---|---|
| 1 | Open prod + login | ✅ | Recipe on demand fails with clear message when signed out |
| 2 | Dieta → gerar cardápio | ✅ | 21 `plannedMeals`, 0 `recipes`, summary + meal cards |
| 3 | Copy Dieta | ✅ | “Escolha o dia — veja macros e registre refeições”; “Gere a receita…” hint |
| 4 | Gerar receita | ✅ | All **Gerar receita** disabled while loading; opens `/recipe/[id]` |
| 5 | Pluralização | ✅ | Subtitle **“1 porção · meal-prep”** (`servings: 1`) |
| 6 | Voltar Dieta → toque refeição | ✅ | “Ver receita de …” opens linked recipe |
| 7 | Refresh PWA | ✅ | `recipes: 1`, `recipeId` on meal persists |
| 8 | Hoje | ✅ | Próxima refeição (07:30 café); Registrar → 380 kcal, P 28g |
| 9 | Compras | ✅ | Do cardápio → 4 items (not empty); Marcar/Desmarcar todos OK |
| 10 | Refeição | ✅ | Foto / Análise / Revisar; Câmera + Galeria |
| 11 | Cloud sync / refresh | ✅ | After login: 21 meals kept; after reload: no wipe |

**Overall: PASS** — no blocking bugs found.

---

## Observations (not blocking)

1. **Auth prerequisite for recipe on demand** — Unsigned session shows inline + toast: “Entre na conta para gerar receitas.” Weekly meal plan still works client-side without login. Expected.
2. **Shopping after on-demand recipe** — Once `recipes.length > 0`, `generateShoppingList` uses the **recipe** path (4 items from omelette) instead of full-week `plannedMeals` inference. Pre-existing branch in `generate-shopping-list.ts`; list is not empty but smaller than lightweight-only flow (~41 items in Edge smoke).

---

## Bugs

None filed this run.

---

## Config unchanged

- `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=false` (prod bundle verified)
- `EXPO_PUBLIC_GEMINI_API_KEY` still used for weekly meal plan (client)
- Recipe on demand remains Edge `generate-recipe`
