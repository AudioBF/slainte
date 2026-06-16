# Recipe On Demand v1 — Implementation Plan

**Status:** Planning only — no app code changed yet.  
**Date:** 2026-06-16  
**Prerequisite:** Meal Plan Lightweight v1 ✅ (`docs/private/MEAL_PLAN_LIGHTWEIGHT_RESULT.md`)  
**Production:** `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=false` (unchanged this sprint)

---

## 1. Problema atual

Lightweight v1 entrega **`plannedMeals` + `summary`** com `recipes: []`. O usuário vê macros e nomes descritivos, mas:

| Gap | Impacto |
|---|---|
| Toque na refeição **não abre receita** | `hasRecipe()` false → Pressable disabled em `diet.tsx` |
| Sem ingredientes/passos | Usuário não sabe **como preparar** quando quiser cozinhar |
| Shopping infere ingredientes dos **nomes** | Funciona, mas receita sob demanda melhora precisão futura |

Produto desejado: **seguir o plano sem receita obrigatória**, mas **gerar receita completa quando o usuário pedir**.

---

## 2. Decisão de produto (v1)

| Ação | Comportamento |
|---|---|
| Gerar cardápio semanal | Inalterado (Lightweight) |
| Toque em refeição **sem** receita | CTA **“Gerar receita”** → gera 1 receita on demand |
| Toque em refeição **com** receita | Navega para `/recipe/[id]` (comportamento atual) |
| Após gerar | `recipeId` ligado ao `PlannedMeal`; receita persistida em `store.recipes` |

**Não** regerar cardápio inteiro. **Não** gerar receitas em batch na geração semanal.

---

## 3. Escopo v1

| # | Entrega |
|---|---|
| 1 | Edge Function **`generate-recipe`** (auth + Gemini structured JSON) |
| 2 | Input: `plannedMeal` (name, slot, macros) + `profile` (goal, restrictions) |
| 3 | Output: objeto **`Recipe`** completo (ingredientes, passos, macros por porção) |
| 4 | Client: `invokeGenerateRecipe()` + `generateRecipeForMeal()` |
| 5 | Store: **`upsertRecipe`** + **`linkPlannedMealRecipe(plannedMealId, recipeId)`** (mínimo — sem mudar shape persistido) |
| 6 | Dieta: toque em refeição sem receita → sheet/modal ou navegação com loading + “Gerar receita” |
| 7 | Mock mode + erros AI existentes |
| 8 | Deploy Edge + smoke 1 invoke |

### Constraints

- ❌ Não ligar `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=true` em produção  
- ❌ Não remover `EXPO_PUBLIC_GEMINI_API_KEY` (client path para meal plan semanal)  
- ❌ Não regerar weekly plan  
- ❌ Não redesign completo da Dieta — CTA + loading + link existente  
- ❌ Não trocar modelo (default `gemini-2.5-flash`)  
- ❌ Não alterar plano Supabase  

---

## 4. Fora do escopo

| Item | Sprint |
|---|---|
| Regenerar receita alternativa (“outra versão”) | v2 |
| Cache Edge / dedup por hash do nome | v2 |
| Re-enable production Edge para **meal plan** semanal | Após soak |
| Edição manual de receita | Backlog |
| Foto da refeição → receita | Backlog |

---

## 5. Arquivos afetados (estimativa)

| File | Change |
|---|---|
| `supabase/functions/generate-recipe/index.ts` | **New** |
| `supabase/functions/_shared/recipe.ts` | **New** — prompt, schema, validation |
| `src/services/ai/schemas/recipe.schema.ts` | **New** or extend meal-plan recipe schema |
| `src/services/ai/generate-recipe.ts` | **New** |
| `src/services/ai/edge-client.ts` | `invokeGenerateRecipe` |
| `src/store/useAppStore.ts` | `upsertRecipe`, `linkPlannedMealRecipe` |
| `app/(tabs)/diet.tsx` | Tap handler + generate CTA |
| `app/recipe/[id].tsx` | Unchanged (reuse) |
| `scripts/smoke-generate-recipe.mjs` | **New** — optional 1-run smoke |

**Unchanged:** weekly `generate-meal-plan`, shopping lightweight path, Hoje/TodayPlanSection.

---

## 6. Prompt / schema

### Request

```typescript
{
  profile: { goal, restrictions, dailyGoals };
  plannedMeal: { id, name, slot, dayIndex, calories, protein, carbs, fat };
}
```

### Response (Recipe)

Reutilizar shape existente em `src/types/index.ts` (`Recipe`):

- `id` — gerado no Edge (slug + suffix) ou client-side `createId('recipe')` após parse  
- `name` — alinhado ao `plannedMeal.name`  
- `servings`, `ingredients[]`, `steps[]`, macros por porção  

### Prompt (diretrizes)

- Dublin / supermercados IE  
- PT-BR  
- Ingredientes práticos (Lidl, Tesco, …)  
- Passos curtos e numerados  
- Macros por porção **coerentes** com a refeição planejada (±15%)  
- Respeitar `profile.restrictions`  

---

## 7. Fluxo UX (Dieta)

```text
Tap planned meal
  ├─ has recipeId OR name match in recipes → /recipe/[id]
  └─ else → show inline actions:
        [Gerar receita]  [Registrar]  (Registrar já existe)
        Gerar receita → loading → upsert recipe + link → /recipe/[id]
```

Copy mínima: *“Quer ver como preparar? Gere a receita.”*

---

## 8. Riscos

| Risco | Mitigação |
|---|---|
| Latência ~15–40 s por receita | Loading skeleton; 1 receita por vez |
| Gemini 503 | Reutilizar padrão retry/budget leve (timeout 50–60 s) |
| `recipeId` duplicado | IDs únicos; upsert por id |
| Plano antigo com receitas full | `hasRecipe()` continua funcionando |
| Store merge cloud | `recipes` array merge existente — append/update by id |

---

## 9. Smoke test

```bash
# Edge (signed-in)
node scripts/smoke-generate-recipe.mjs

# Client path parity (optional)
# EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=false — weekly plan unchanged
```

| Check | Target |
|---|---|
| HTTP 200 | ✅ |
| `ingredients.length >= 3` | ✅ |
| `steps.length >= 3` | ✅ |
| Duration | < 60 s |
| 503 / quota | 0 em run único |

---

## 10. Critérios de sucesso

- [ ] Usuário toca refeição sem receita → gera e vê `/recipe/[id]`  
- [ ] `plannedMeal.recipeId` persistido após geração  
- [ ] Segunda visita → abre receita sem regerar  
- [ ] Registrar refeição / Hoje / Compras **sem regressão**  
- [ ] `tsc` + `build:web` passam  
- [ ] Edge deploy + smoke 1/1  
- [ ] Produção continua `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=false`  

---

## Implementation order

```text
1. Edge shared recipe.ts (schema + prompt)
2. generate-recipe function + deploy
3. Client invoke + generateRecipeForMeal
4. Store upsert + link
5. Dieta tap / CTA + loading
6. Smoke + MEAL_PLAN_RECIPE_ON_DEMAND_RESULT.md
```

**Estimate:** 1 dev session (Edge + client) + ½ session (UI + smoke).

---

*Planning doc only. Start implementation when sprint is picked up.*
