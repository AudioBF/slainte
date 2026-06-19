# Core Flow Release Checkpoint v1 — Result

**Date:** 2026-06-18  
**Status:** PASS

---

## Context

This checkpoint validates the main Sláinte production flow after the following completed work:

- Meal Plan Lightweight v1
- Recipe On Demand v1
- Recipe On Demand Polish v1
- Shopping Source Fix v1
- Shopping Quality v1

**Production URL:** https://slainte-sigma.vercel.app

**Production configuration:**

- `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=false`
- Weekly meal plan: client lightweight path
- Recipe generation: Edge `generate-recipe`
- Shopping generation: Edge `generate-shopping-list`

---

## Pre-flight

| Check | Result |
|---|---|
| Latest `origin/master` commit | `3e8598e` — Shopping Quality v1 |
| `npx tsc --noEmit` | PASS |
| `npm run build:web` | PASS |
| Production bundle | `entry-e124e85f…` |
| `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN` | `false` |

---

## Production smoke

| Flow | Result |
|---|---|
| Dieta → Generate lightweight weekly plan | PASS — 21 `plannedMeals`, 0 `recipes`, ~52s |
| Dieta → Generate recipe on demand | PASS — loading state, buttons disabled, recipe route opened |
| Recipe screen | PASS — “1 porção” displayed correctly |
| Dieta → Linked planned meal | PASS — linked meal opens the same recipe |
| Compras → Do cardápio | PASS — 41 full-week shopping items generated |
| Shopping sections | PASS — sections displayed correctly |
| Shopping bulk actions | PASS — Marcar todos / Desmarcar todos working |
| Hoje → Register planned meal | PASS — calories/macros updated |
| Refeição tab | PASS — Foto / Análise / Revisar flow loads |

---

## Refresh persistence

| Data | Result |
|---|---|
| `plannedMeals` | PASS |
| `recipes` | PASS |
| `plannedMeal.recipeId` | PASS |
| Linked recipe navigation | PASS |
| Shopping items | PASS |
| Hoje / Dieta / Compras coherence | PASS |

---

## Sign out / sign in sync

| Data | Result |
|---|---|
| `plannedMeals` preserved | PASS |
| `recipes` preserved | PASS |
| `plannedMeal.recipeId` preserved | PASS |
| Shopping items preserved | PASS |
| Dieta coherent after login | PASS |
| Compras coherent after login | PASS |
| Hoje coherent after login | PASS |

---

## Observations

- Weekly meal plan remains on the client lightweight path.
- Recipe on demand requires authentication and uses the Edge `generate-recipe` function.
- Shopping generation correctly uses `plannedMeals` as the primary source when a weekly plan exists.
- Recipe on demand does not override the weekly shopping source.
- No critical data wipe was observed after refresh or sign out / sign in.

---

## Bugs

None filed this run.

---

## Final verdict

**Core Flow Release Checkpoint v1: PASS**

The main production loop is stable:

```
Generate lightweight plan
→ Generate recipe on demand
→ Generate weekly shopping list
→ Register planned meal
→ Hoje updates
→ Data persists after refresh/login
```
