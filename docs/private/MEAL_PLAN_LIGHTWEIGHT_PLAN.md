# Meal Plan Lightweight v1 — Implementation Plan

**Status:** Planning only — no app code changed yet.  
**Date:** 2026-06-16  
**Context:** `docs/private/MEAL_PLAN_EDGE_TIMEOUT_BUDGET_RESULT.md`, `docs/private/MEAL_PLAN_EDGE_ROLLOUT_RESULT.md`  
**Production:** `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=false` (unchanged this sprint)

---

## 1. Problema atual

A geração semanal **full-stack** (plano + 5–8 receitas completas com ingredientes e passos) é:

| Sintoma | Evidência |
|---|---|
| **Lenta** | Smokes Edge 43–101 s por invoke; UI copy já fala “até 2 min” |
| **Cara** | Payload JSON grande → mais tokens Gemini (input + output) |
| **Instável sob pressão** | Back-to-back smokes **3/5** com 503; espaçado **5/5** — overload correlacionado a chamadas pesadas sequenciais |
| **Rígida para o produto real** | Usuário pode querer **seguir o plano**, **trocar**, **improvisar** ou **ver receita só quando precisar** — receita completa na geração inicial é overkill |

Hoje o pipeline exige:

```text
Gemini → { recipes[5–8], plannedMeals[21–28], summary }
       → validateMealPlanVariety (inclui regra recipes.length 5–8)
       → setMealPlan(plannedMeals, recipes, summary)
```

Receitas completas são o principal custo de tokens e tempo. O resto do app (Dieta, Hoje, registro, macros) consome **`plannedMeals`** — não `recipes`.

**Gap crítico hoje:** `generateShoppingList(recipes)` retorna `{ items: [] }` se `recipes.length === 0` (`src/services/ai/generate-shopping-list.ts`). Lightweight **exige** ajuste em Compras na mesma sprint.

---

## 2. Nova decisão de produto

**Planejamento primeiro, receita sob demanda depois.**

| Momento | O que o usuário recebe |
|---|---|
| **Gerar cardápio da semana (v1)** | `plannedMeals` + `summary` — nomes, horários, slots, macros por refeição |
| **Receita completa (sprint futura)** | On demand ao tocar na refeição → `generate-recipe` (fora do escopo v1) |

Comportamento desejado:

- Plano semanal continua útil para **orientação** e **tracking** (Dieta, Hoje, Plano × Real).
- Refeição **sem receita** não quebra o app — registro e macros funcionam; toque na refeição fica inativo ou mostra detalhe mínimo (já parcialmente implementado em `diet.tsx`).
- Compras continua gerando lista a partir do **plano**, não de receitas completas pré-geradas.

**Produção:** permanece client Gemini (`EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=false`) até Lightweight validado em preview + smoke; re-canary Phase 4 **não** é meta desta sprint.

---

## 3. Escopo v1

### In scope

| # | Entrega |
|---|---|
| 1 | **`generate-meal-plan`** (client + Edge) retorna **`plannedMeals` + `summary`**; `recipes` **vazio `[]`** ou omitido após parse |
| 2 | **Prompt** reorientado: variedade e meal-prep via **nomes descritivos** nas refeições, sem pedir ingredientes/passos |
| 3 | **Schema Gemini + Zod**: `recipes` opcional / default `[]`; remover `recipes` de `required` no response schema |
| 4 | **`validateMealPlanVariety`**: remover regras de contagem de receitas (5–8); manter regras de variedade em `plannedMeals` |
| 5 | **`generate-shopping-list`**: aceitar **`plannedMeals`** quando não houver receitas — prompt infere ingredientes a partir dos nomes do plano |
| 6 | **Client hooks**: `useShoppingListGenerator` envia `plannedMeals` se `recipes.length === 0` |
| 7 | **Mock mode**: `mockMealPlan()` alinhado (recipes vazio ou mínimo) |
| 8 | **Deploy Edge** `generate-meal-plan` (+ `generate-shopping-list` se alterado) — sem flag prod |
| 9 | **Smoke compacto** + registro de duração / counts |

### Constraints (explicit)

- ❌ Não ligar `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=true` em produção  
- ❌ Não remover `EXPO_PUBLIC_GEMINI_API_KEY`  
- ❌ Não alterar plano Supabase / billing  
- ❌ Não trocar modelo Gemini  
- ❌ Não criar `generate-recipe`  
- ❌ Não redesign de UI — copy mínima permitida (ex.: subtítulo Dieta)

---

## 4. Fora do escopo

| Item | Sprint |
|---|---|
| `generate-recipe` Edge Function | Futura |
| Botão “Gerar receita” na Dieta / modal de detalhe | Futura |
| Persistência relacional de receitas | N/A |
| Re-enable production Edge flag / Phase 4 re-canary | Após Lightweight + preview soak |
| Meal plan cap 55 s / retry tuning adicional | Opcional pós-v1 |
| Snacks obrigatórios (4 slots × 7 dias) | Manter regra atual (café + almoço + jantar mínimo) |
| Drag-and-drop, Chef IA | Backlog |

---

## 5. Arquivos afetados

### Schema + validação (client ↔ Edge parity)

| File | Change |
|---|---|
| `src/services/ai/schemas/meal-plan.schema.ts` | `recipes` optional / default `[]`; slim `mealPlanResponseSchema` |
| `supabase/functions/_shared/meal-plan.ts` | Mirror client schema + variety validator |
| `src/services/ai/validate-meal-plan.ts` | Drop recipe count rules |
| `supabase/functions/_shared/meal-plan.ts` (`validateMealPlanVariety`) | Same |

### Prompts

| File | Change |
|---|---|
| `src/services/ai/prompts/meal-plan.prompt.ts` | Lightweight instructions |
| `supabase/functions/_shared/meal-plan.ts` (`buildMealPlanPrompt`, retry) | Keep in sync with client |

### Generators

| File | Change |
|---|---|
| `src/services/ai/generate-meal-plan.ts` | Normalize `recipes: []` on success; mock update |
| `supabase/functions/generate-meal-plan/index.ts` | No logic change beyond shared module |
| `src/services/ai/generate-shopping-list.ts` | Input: recipes **or** plannedMeals |
| `supabase/functions/_shared/shopping-list.ts` | Request schema + prompt from plannedMeals |
| `supabase/functions/generate-shopping-list/index.ts` | Wire new request shape |
| `src/services/ai/edge-client.ts` | Types for shopping body if extended |

### Hooks / store (minimal)

| File | Change |
|---|---|
| `src/features/shopping/hooks/useShoppingListGenerator.ts` | Pass `plannedMeals` when no recipes |
| `src/store/useAppStore.ts` | **No shape change** — `recipes` may be `[]` |
| `src/features/diet/hooks/useMealPlanGenerator.ts` | **Unchanged** (still `setMealPlan(...)`) |

### UI (optional copy only)

| File | Change |
|---|---|
| `app/(tabs)/diet.tsx` | Subtitle: “toque para ver receita” → “macros e registro”; comportamento sem receita **já seguro** (`hasRecipe` / `disabled` Pressable) |
| `app/recipe/[id].tsx` | **Unchanged** — only reached when recipe exists in store |

### Scripts / docs

| File | Change |
|---|---|
| `scripts/smoke-meal-plan-budget.mjs` | Assert `recipes === 0` or null; optional shopping follow-up |
| `scripts/test-meal-plan.mjs` | Update if used locally |
| `docs/private/MEAL_PLAN_LIGHTWEIGHT_RESULT.md` | Created after implementation |

**Not touched:** `src/types/index.ts` (`recipeId?` already optional), `TodayPlanSection`, selectors, cloud merge.

---

## 6. Mudanças em prompt / schema

### 6.1 Response shape (target)

```typescript
{
  plannedMeals: PlannedMeal[];  // required, 21+ typical (3 slots × 7 days)
  summary?: string;             // 2–3 frases
  recipes?: Recipe[];           // optional v1 — always [] from generator
}
```

**Zod:** `recipes: z.array(recipeSchema).default([])`  
**Gemini schema:** remove `recipes` from `required`; either omit property or `minItems: 0` empty array.

### 6.2 Prompt — remover

- Regra “5 a 8 receitas-base reutilizáveis”
- Instruções de ingredientes, passos, `servings`
- Expectativa de `recipeId` em todas as refeições principais

### 6.3 Prompt — adicionar / reforçar

- **Nomes descritivos** suficientes para compras: incluir proteína + base + preparo no `name`  
  - Ex.: *“Bowl de frango grelhado, arroz integral e brócolis”* em vez de *“Almoço 1”*
- **Macros por refeição** coerentes com meta diária (somar ~meta por dia)
- **Variedade** mantida (mesmas regras de slot/dia)
- **`recipeId`**: omitir ou deixar vazio — **nunca** referenciar receita inexistente
- **`summary`**: lógica da semana sem mencionar “receitas preparadas no domingo” de forma que exija objeto recipe

### 6.4 Variety validator

**Keep:**

- 7 dias com café + almoço + jantar
- Máx. 2 dias 100% idênticos
- Mín. 3 cafés / 4 almoços / 4 jantares distintos (por `name`)

**Remove:**

- `plan.recipes.length < 5` / `> 10`

### 6.5 Shopping list — request shape (proposed)

```typescript
// Prefer plannedMeals when recipes empty
type GenerateShoppingListBody =
  | { recipes: ShoppingListRecipe[] }
  | { plannedMeals: Array<{ name: string; slot: string; dayIndex: number }> };
```

**Prompt (plannedMeals path):** infer ingredientes consolidados para a semana a partir dos nomes das refeições; mesmas regras Dublin/supermercados; merge duplicatas.

**Backward compat:** se `recipes.length > 0`, usar prompt atual (usuários com plano antigo em cache local).

---

## 7. Impacto em Dieta, Hoje e Compras

### Dieta (`app/(tabs)/diet.tsx`)

| Área | Impacto v1 |
|---|---|
| Lista por dia | ✅ Usa `plannedMeals` — sem mudança estrutural |
| Macros / StatPill | ✅ Campos em `plannedMeal` |
| Registrar | ✅ `logPlannedMeal(meal)` — independente de receita |
| Toque → receita | ✅ Já seguro: `hasRecipe()` false → Pressable disabled, sem chevron |
| Summary card | ✅ Continua com `mealPlanSummary` |
| Copy | ⚠️ Ajustar subtitle que promete “ver receita” |

### Hoje (`TodayPlanSection` + `index.tsx`)

| Área | Impacto |
|---|---|
| Próxima refeição | ✅ `name`, `time`, `slot`, `calories` |
| Progresso registrado | ✅ `plannedMealId` em logged meals |
| Week comparison | ✅ Macros de `plannedMeals` |

**Nenhuma alteração de componente necessária.**

### Compras (`shopping.tsx` + generator)

| Área | Impacto |
|---|---|
| **Hoje** | `recipes` vazio → lista vazia — **regressão** |
| **v1** | Generator usa `plannedMeals` → Edge infere itens |
| “Do cardápio” CTA | Continua; precisa `plannedMeals.length > 0` (já usa `hasPlan`) |
| `fromPlan: true` | Mantido em `mapShoppingListToItems` |

### Cloud sync

`user_data` JSON blobs incluem `recipes: []` — **sem migration SQL**. Planos antigos com receitas continuam válidos até o usuário regerar.

---

## 8. Riscos

| Risco | Severidade | Mitigação |
|---|---|---|
| Lista de compras inferida de nomes — qualidade inferior vs ingredientes explícitos | Média | Nomes descritivos no prompt; smoke Compras ≥ N itens; iterar prompt |
| Usuário espera receita ao tocar | Baixa | Copy Dieta; sprint futura `generate-recipe` |
| Divergência client vs Edge (duplicação meal-plan.ts) | Média | Mesmo diff em ambos os paths; smoke client **e** Edge preview |
| Plano antigo com receitas + novo sem | Baixa | Shopping prefer recipes se existirem |
| Menos tokens mas ainda >60s | Média | Medir P95 pós-v1; meta <70s aspiracional |
| `recipeId` órfão se modelo ainda emitir | Baixa | Strip/normalize no parse; não validar FK |
| Variety retry ainda dispara 2× Gemini | Baixa | Aceitável v1; monitorar duração |

---

## 9. Smoke test compacto

### 9.1 Meal plan (client path — produção atual)

```bash
# Após implementação — local .env EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=false
node scripts/smoke-meal-plan-budget.mjs 3 --delay 60000
```

**Nota:** script hoje chama Edge diretamente; para validar **client path**, usar extensão ou `scripts/test-meal-plan.mjs` + browser UI smoke.

| # | Check |
|---|---|
| 1 | `ok: true` em **3/3** (com delay 60s) |
| 2 | `plannedMeals.length >= 21` |
| 3 | `recipes.length === 0` (ou null normalizado) |
| 4 | Cada dia 0–6 tem café + almoço + jantar |
| 5 | `summary` non-empty string |
| 6 | P95 **< 90 s** (target aspiracional; hard cap < 140 s) |
| 7 | 0 `QUOTA_EXCEEDED`, 0 platform 504 HTML |

Registrar: `durationMs`, `plannedMeals`, `recipes`, `envelopeCode`.

### 9.2 Shopping (manual ou script curto)

1. Gerar plano lightweight (mock ou real).  
2. Compras → “Do cardápio”.  
3. Assert `shoppingItems.length >= 10` (ajustar threshold após 1ª execução real).

### 9.3 UI sanity (5 min)

| Step | Expected |
|---|---|
| Dieta → gerar | Skeleton → cards com macros |
| Toque refeição sem receita | Nada quebra; sem navegação |
| Registrar refeição | Toast + Hoje atualiza |
| Compras → do cardápio | Lista populada |

### 9.4 Edge parity (optional, preview build-env)

```bash
EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=true  # preview only
node scripts/smoke-meal-plan-budget.mjs 3 --delay 90000
```

Same assertions + confirm `recipes` absent/empty in JSON.

---

## 10. Critérios de sucesso

### Must have (v1 done)

- [ ] Geração semanal retorna **`plannedMeals` + `summary`** com **`recipes` vazio** (client path em produção)
- [ ] Variety validation passa **sem** exigir receitas
- [ ] **Compras “Do cardápio”** produz lista não vazia a partir de plano lightweight
- [ ] Dieta / Hoje / Registrar refeição **sem regressão**
- [ ] Toque em refeição sem receita **não crasha**
- [ ] `npx tsc --noEmit` + `npm run build:web` passam
- [ ] Edge functions deployadas (meal-plan; shopping se alterado)
- [ ] Smoke **3/3** meal plan (delay 60–90s), P95 **< 140 s**, 0 quota / 0 platform 504
- [ ] **`EXPO_PUBLIC_USE_EDGE_MEAL_PLAN` permanece `false` em produção**

### Nice to have

- [ ] P95 meal plan **< 70 s** (média claramente menor que full-stack ~90–100s)
- [ ] Preview Edge smoke 3/3 com recipes vazio
- [ ] Doc `MEAL_PLAN_LIGHTWEIGHT_RESULT.md` com tabela run-a-run

### Explicit non-goals (não falhar sprint se ausente)

- Receita on demand
- Phase 4 re-canary
- Remoção de `EXPO_PUBLIC_GEMINI_API_KEY`

---

## Implementation order (suggested)

```text
1. Schema + variety validator (client + Edge shared)
2. Prompt lightweight (client + Edge shared)
3. generate-meal-plan normalize recipes → []
4. Shopping list plannedMeals path (client + Edge)
5. useShoppingListGenerator wiring
6. Mock + scripts
7. tsc / build:web
8. Deploy Edge
9. Smoke + UI sanity
10. MEAL_PLAN_LIGHTWEIGHT_RESULT.md
```

**Estimate:** 1 focused dev session (schema/prompt) + 1 session (shopping + smoke + deploy).

---

*Planning doc only. Implementation starts when sprint is picked up.*
