# Recipe UX Polish v1.1 — Result

**Date:** 2026-06-19  
**Status:** ✅ PASS — deployed and validated in production

## Objective

Small copy and context polish on the recipe screen (`/recipe/[id]`) so on-demand recipes communicate servings, card origin, practical intent, and IA estimates — without changing IA, schema, store shape, or stable flows.

## Files changed

| File | Change |
|---|---|
| `app/recipe/[id].tsx` | Conditional subtitle, linked planned-meal line, context/disclaimer card, macro label + helper, `Passo a passo` label, local `formatRecipeSubtitle()` helper |
| `docs/private/RECIPE_UX_POLISH_V1_1_RESULT.md` | This document |
| `docs/private/PROJECT_BRIEFING.md` | One-line status update |

## Scope implemented

| Item | Result |
|---|---|
| `servings === 1` subtitle | `1 porção · receita prática` |
| `servings > 1` subtitle | `{N} porções · meal-prep` |
| No `meal-prep` when individual | ✅ |
| `Baseado em: {card}` | ✅ via `plannedMeals.find(m => m.recipeId === id)` |
| Macro label | `Estimativa por porção` + `AiBadge` |
| Macro helper | `Valores aproximados para acompanhar sua meta — não precisa ser exato.` |
| IA / disclaimer (once) | Context card with cardápio line + medical disclaimer |
| Preparo label | `Passo a passo` (was `Modo de preparo`) |
| `recipe.name` / `ScreenHeader` | Unchanged structure |

## Out of scope (confirmed untouched)

- Supabase Edge Functions (`generate-recipe`, `generate-meal-plan`, `generate-shopping-list`)
- IA prompts
- Zustand stores / persist / schemas / migrations
- Meal Plan Lightweight, Shopping, Hoje, Auth, sync
- `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN`
- Recipe library, regenerate, edit, favorites, history
- UI redesign

## Commands executed

```powershell
npx.cmd tsc --noEmit
Select-String -Path .env -Pattern '^EXPO_PUBLIC_USE_EDGE_MEAL_PLAN='
npm run build:web
```

Local UX smoke: `http://localhost:56256/recipe/ux-smoke-recipe-1` (fresh `dist/` build with injected store state).

## Validation results

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ PASS |
| `npm run build:web` | ✅ PASS |
| `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN` | ✅ `false` |
| Lint script in `package.json` | N/A (none configured) |

## Manual UX smoke (local build)

Fixture: `servings: 1`, linked `plannedMeal` with matching `recipeId`.

| Step | Result |
|---|---|
| Subtitle shows `1 porção · receita prática` | ✅ |
| Subtitle does **not** show `meal-prep` | ✅ |
| `Baseado em: Panqueca de aveia…` visible | ✅ |
| Context: `Receita sugerida a partir do seu cardápio.` | ✅ |
| Disclaimer once (not repeated per section) | ✅ |
| `Estimativa por porção` + `Estimativa IA` + StatPill | ✅ |
| Macro helper text visible | ✅ |
| Ingredientes list intact | ✅ |
| `Passo a passo` with numbered steps | ✅ |
| `Voltar ao cardápio` present | ✅ |

**Note:** Production PWA validated after Vercel deploy (bundle `entry-704f6a6962ec9a85808107f45aa71290.js`).

## Production smoke (2026-06-19)

URL: https://slainte-sigma.vercel.app  
Commit: `297756b` — `fix(recipe): polish recipe screen copy and servings context`

| Check | Result |
|---|---|
| Open recipe from planned card (Gerar receita) | ✅ |
| `1 porção · receita prática` | ✅ |
| No `meal-prep` when `servings === 1` | ✅ |
| `Baseado em: {card}` | ✅ |
| `Estimativa por porção` | ✅ |
| `Estimativa IA` badge | ✅ |
| Disclaimer once | ✅ |
| Ingredientes + passo a passo | ✅ |
| `Voltar ao cardápio` | ✅ |
| Dieta → Ver receita → same route | ✅ |
| Compras intact (41 items, sections) | ✅ |
| Hoje loads with plan data | ✅ |

Sample recipe: **Ovos mexidos com queijo e tomate cereja** — `/recipe/recipe-1781909213946-4xq521m`.

## Risks / pendencies

- Long recipe titles may still truncate in `ScreenHeader` (`numberOfLines={1}`) — accepted for v1.1.
- `servings > 1` manual smoke not re-run in browser (no fixture in session); logic covered by `formatRecipeSubtitle()` branch review.

## Regression guard

| Area | Altered? |
|---|---|
| Edge Functions | ❌ |
| Meal Plan | ❌ |
| Shopping | ❌ |
| Stores / schema | ❌ |
| `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN` | ❌ (`false`) |

## Verdict

**Recipe UX Polish v1.1: PASS** — live on production; automated build + production UX smoke passed.
