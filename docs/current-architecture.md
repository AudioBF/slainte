# Sláinte — Arquitetura atual (Sprint 0 → baseline pós–Sprint 1)

**Data (auditoria inicial):** 2026-07-29  
**Atualização:** 2026-08-01 — Sprint 1 concluído em produção (`dd71b78`).  
**Escopo original:** auditoria somente leitura.  
**Roadmap:** *Sláinte — Roadmap de Evolução Corporal e Nutrição Adaptativa*

**Encerramento Sprint 1:** ver `docs/sprint-1-closure.md`.  
**Plano Sprint 2:** ver `docs/sprint-2-plan.md`.  
**Backlog residual:** ver `docs/backlog.md`.

---

## 1. Visão geral

O Sláinte é um app Expo 56 / React Native / TypeScript com:

- **UI:** Expo Router + abas
- **Estado:** um único Zustand store com persistência AsyncStorage
- **Cloud:** Supabase Auth + 2 tabelas (perfil + blob JSON de sync)
- **IA:** Gemini via Edge Functions (e fallback client para meal plan)

O produto cobre bem **planejar → executar** (dieta, foto, compras). Ainda não cobre **medir → interpretar → ajustar** (evolução corporal, metas por dia, recomendação).

---

## 2. Mapa de rotas

| Rota | Arquivo | Função |
|------|---------|--------|
| `/(tabs)` / `/(tabs)/index` | `app/(tabs)/index.tsx` | **Hoje** e **Semana** (`viewMode`) |
| `/(tabs)/meal` | `app/(tabs)/meal.tsx` | Registro por foto |
| `/(tabs)/diet` | `app/(tabs)/diet.tsx` | Plano semanal + receitas |
| `/(tabs)/shopping` | `app/(tabs)/shopping.tsx` | Lista de compras |
| `/(tabs)/markets` | `app/(tabs)/markets.tsx` | Atalhos de mercados (Dublin) |
| `/onboarding` | `app/onboarding.tsx` | Setup inicial (3 passos) |
| `/profile` | `app/profile.tsx` | Perfil, metas, restrições |
| `/account` | `app/account.tsx` | Conta / auth |
| `/privacy` | `app/privacy.tsx` | Privacidade |
| `/meal-detail/[id]` | `app/meal-detail/[id].tsx` | Editar refeição logada |
| `/recipe/[id]` | `app/recipe/[id].tsx` | Receita gerada |

**Nota:** Semana não é rota própria — é `viewMode: 'week'` em Hoje.

Navegação bottom atual: Hoje · Refeição · Dieta · Compras · Mercados (5 itens).

---

## 3. Store Zustand

**Arquivo:** `src/store/useAppStore.ts`  
**Persistência:** `@slainte/app-state/v1` (`src/services/storage/keys.ts`)  
**Versão:** `APP.storageVersion = 2`

### Persistido

- `profile` (UserAccount)
- `loggedMeals`, `plannedMeals`, `recipes`, `shopping`
- `mealPlanSummary`, `selectedHistoryDate`

### Ephemeral

- `markets`, `photoDraft`, `selectedDietDay`, `viewMode`, `lastSyncedAt`

### Sync cloud

`src/services/supabase/sync.ts` via `CloudSyncProvider`:

- `profiles` ← campos do perfil
- `user_sync` ← blobs JSON (meals/plan/recipes/shopping)

Não há outros stores Zustand.

---

## 4. Supabase

**Schema:** `supabase/schema.sql` (sem pasta `migrations/`)

### Tabelas

| Tabela | Conteúdo |
|--------|----------|
| `profiles` | `display_name`, `avatar_uri`, `goal`, `restrictions`, `daily_goals` (jsonb), `onboarding_complete` |
| `user_sync` | `logged_meals`, `planned_meals`, `recipes`, `shopping`, `meal_plan_summary`, `selected_history_date` |

### Ausente (roadmap)

- `body_goals`, `body_measurements`, `progress_photos`
- `day_type_templates`, `user_weekly_schedule`, `daily_nutrition_targets`
- `nutrition_target_history`, `weekly_progress_reviews`
- altura, peso, peso-alvo estruturados

### RLS

Own-row (`auth.uid() = id` / `user_id`) em SELECT/INSERT/UPDATE. Trigger `handle_new_user` cria perfil + sync no signup.

---

## 5. Edge Functions

| Função | Papel |
|--------|-------|
| `analyze-meal` | Visão Gemini → componentes da refeição |
| `generate-meal-plan` | Cardápio semanal (só se `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=true`) |
| `generate-shopping-list` | Lista a partir do plano |
| `generate-recipe` | Receita de uma refeição planejada |

Shared: `_shared/auth`, `cors`, `gemini`, `http`, `execution-budget`, `meal-plan`, `analyze-meal`, `shopping-list`, `recipe-generation`.

---

## 6. Fontes de dados por tela

### Hoje

- Store: `profile`, `loggedMeals`, `plannedMeals`, `selectedHistoryDate`
- Selectors: `selectActualForDate`, `selectMealsForDate`, `selectTodayPlanStatus`, `selectPrimaryDailyInsight`
- UI: `CalorieRing`, `MacroBar`, `TodayPlanSection`, `InsightCard`

### Semana

- Mesmo arquivo; `selectWeeklyInsights`, `selectWeekCalorieTrend`, `selectWeekComparison`
- Meta semanal = **uma** `profile.dailyGoals` (linha fixa)

### Perfil

- `profile` + `updateProfile`; macros editáveis como 4 campos independentes
- Sem campos de altura/peso

### Refeição

- `photoDraft` + `confirmPhotoMeal`; `useMealAnalysis` → Edge `analyze-meal`
- Link ao plano só se query `plannedId` estiver presente

### Dieta

- `useMealPlanGenerator`, `useRecipeGenerator`; textarea de `restrictions`
- Chip de goal altera `goal` sem resetar `dailyGoals`

### Compras

- `useShoppingListGenerator` → Edge shopping list

---

## 7. Cálculo de calorias e macros

| Local | Comportamento |
|-------|----------------|
| Defaults | `src/features/profile/types.ts` — por goal, valores fixos |
| Edição | `app/profile.tsx` — calorias e macros **independentes** |
| Arredondamento | `src/lib/macros.ts` — só `Math.round` |
| Totais reais | `src/store/selectors.ts` — soma dos componentes |

**Não existe** conversão Atwater (`P×4 + C×4 + G×9`) nem validação de consistência.

Valores 3.260 / 160P / 450C / 80G **não estão hardcoded** — vêm do `dailyGoals` do usuário (ou sync).

---

## 8. Gerador de cardápio

- Client: `src/services/ai/generate-meal-plan.ts` + prompt em `prompts/meal-plan.prompt.ts`
- Edge: `supabase/functions/_shared/meal-plan.ts`
- Validação: `validateMealPlanVariety` — **só variedade** (dias, nomes distintos)
- Prompt pede soma ~meta, sem tolerância numérica nem reparo

---

## 9. Diagnóstico das inconsistências reportadas

### A. 3.260 kcal ≠ 160P / 450C / 80G (= 3.160)

Campos independentes sem checagem Atwater. Defaults do código já divergem levemente (ex.: maintain 2100 vs macros ≈ 2025).

### B. Plano ~2.970 vs meta 3.260

Validação só de variedade; modelo inventa macros por refeição; UI aceita sem gate calórico.

### C. Preferências com 1,77 m / 76,9 kg / meta 82

`UserProfile` só tem `goal`, `restrictions`, `dailyGoals`. Antropometria entra no texto livre porque não há campos estruturados.

### D. “0 de 4” com refeição por foto

Contador usa `plannedMealId` (`isPlannedMealLoggedToday`). Foto pela aba Refeição/FAB sem `plannedId` → não vincula. Regenerar plano troca IDs → logs antigos deixam de contar.

---

## 10. Feature flags / env

| Flag | Efeito |
|------|--------|
| `EXPO_PUBLIC_AI_MOCK` | Mock de IA (default on se não `'false'`) |
| `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN` | Meal plan via Edge |
| `EXPO_PUBLIC_SUPABASE_*` | Sync + auth Edge |
| `EXPO_PUBLIC_GEMINI_API_KEY` | Fallback client meal-plan |

Flags do roadmap (`USE_DYNAMIC_TARGETS`, `USE_BODY_PROGRESS`, etc.) **ainda não existem**.

---

## 11. Testes atuais

Sem Jest/Vitest/`*.test.ts`. Apenas scripts de smoke em `scripts/` (Gemini, meal-plan, shopping, recipe).

---

## 12. Diagrama de fluxo de dados

```text
[Onboarding / Perfil]
        │
        ▼
 profile.dailyGoals + restrictions ──► Zustand (@slainte/app-state/v1)
        │                                    │
        │                                    ├──► Hoje / Semana (selectors)
        │                                    ├──► Dieta (generate-meal-plan)
        │                                    └──► Compras / Receitas
        ▼
 Supabase profiles + user_sync (JSON blobs)
        ▲
 Edge: analyze-meal | generate-meal-plan | shopping | recipe
        │
 Gemini
```

---

## 13. Riscos (pré–Sprint 1+)

1. Calorias e macros desacoplados (bug 3260/3160).
2. Goal chip na Dieta não sincroniza `dailyGoals`.
3. Sync por blob JSON com merge heurístico — risco de perda.
4. Plano sem validação calórica/macros.
5. Progresso do plano acoplado a `plannedMealId` frágil.
6. Antropometria no texto livre polui prompts.
7. Sem schema de evolução corporal.
8. Dois caminhos de meal-plan (Edge vs client) — drift.
9. Sem testes unitários — regressões fáceis.

---

## 14. Inventário — arquivos críticos

```
app/(tabs)/index.tsx
app/(tabs)/meal.tsx
app/(tabs)/diet.tsx
app/(tabs)/shopping.tsx
app/profile.tsx
app/onboarding.tsx
src/store/useAppStore.ts
src/store/selectors.ts
src/store/mergePersisted.ts
src/features/profile/types.ts
src/types/index.ts
src/lib/macros.ts
src/lib/env.ts
src/services/ai/generate-meal-plan.ts
src/services/ai/validate-meal-plan.ts
src/services/ai/prompts/meal-plan.prompt.ts
src/services/supabase/sync.ts
src/services/supabase/types.ts
supabase/schema.sql
supabase/functions/_shared/meal-plan.ts
supabase/functions/generate-meal-plan/index.ts
```

---

## 15. Plano técnico — Sprint 1

**Status:** implementado localmente (2026-07-29). Aguardar GO antes de deploy.

### Entregue

1. Domínio puro `src/domain/nutrition-targets/` (Atwater, carbs, validação, resolve para gerador, save gate, goal patch).
2. Defaults Atwater-coerentes em `DEFAULT_DAILY_GOALS` (sem migração de dados persistidos).
3. Perfil: aviso inline + “Recalcular carboidratos”; bloqueio **somente** se a flag estiver ON **e** as metas nutricionais da sessão forem alteradas de forma inconsistente.
4. Dieta: Cancelar / Manter minhas metas atuais / Aplicar padrões.
5. Gerador: `resolveConsistentDailyGoals` no payload (ok:false se impossível; sem mutar store).
6. Vitest + testes de flag/save/legado.

### Política

- Tolerância padrão: **5 kcal**.
- Carbs calculados: `Math.round` ao grama; diferença final recalculada.
- Flag `EXPO_PUBLIC_USE_MACRO_CONSISTENCY`: unset/`false`/inválido = **OFF**; só `"true"` = ON.

### O que a flag controla

- Bloqueio de save quando o usuário **altera** kcal/macros para combinação inconsistente.

### O que a flag NÃO controla

- Funções Atwater; aviso inline; recalcular manual; normalização do payload do gerador (proteção interna).

### Fora do Sprint 1 (inalterado)

- Tabelas `body_*`, tipos de dia, validação calórica do plano (Sprint 6), vinculação de refeições.
