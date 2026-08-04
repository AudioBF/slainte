# Cardápio multi-meta V1/V2 (Sprint 2C.3)

## Escopo

Dieta e `generate-meal-plan` passam a aceitar **metas diferentes por dia** quando ambas as flags estão ON. Edge local é retrocompatível (V1 + V2). **Não publicar** Edge neste sprint; flags permanecem OFF.

## Feature flags

| Variável | Default | Parser |
|----------|---------|--------|
| `EXPO_PUBLIC_USE_DAY_TARGETS` | OFF | só `"true"` = ON |
| `EXPO_PUBLIC_USE_MULTI_TARGET_MEAL_PLAN` | OFF | só `"true"` = ON |

**Efetivo:**

```
multiTargetEnabled = useDayTargets && useMultiTargetMealPlan
```

### Matriz

| DAY | MULTI | Hoje/Semana | Dieta |
|-----|-------|-------------|-------|
| OFF | OFF | legado | V1 mono-meta |
| ON | OFF | day targets | V1 + texto “ainda usa meta padrão” |
| OFF | ON | legado | V1 (multi efetivo OFF) |
| ON | ON | day targets | V2 (7 metas); exige Edge (mock/E2E ok) |

## Contratos

- **V1:** `{ profile: { goal, restrictions, dailyGoals } }` (inalterado)
- **V2:** `{ contractVersion: 2, profile: { goal, restrictions }, fallbackDailyGoals, dailyTargets[7] }`

`contractVersion === 2` obriga validação V2 — incompleto **não** cai para V1.

## Semana de geração

Europe/Dublin, semana civil **corrente** Mon–Sun contendo a data da geração. Domingo gera a semana atual, não a próxima. `dayIndex` 0–6 continua sendo a identidade persistida das refeições; `dateISO` é auditoria/overrides.

## Tolerâncias (fonte única)

- kcal: `max(150, 8%)`
- proteína: `max(8g, 10%)`
- carbs: `max(15g, 15%)`
- gordura: `max(5g, 15%)`
- soft: `1,25 ×` tolerância

Paridade app/Edge via `MEAL_PLAN_TOLERANCE_FIXTURE` + `supabase/functions/_shared/meal-plan-targets.ts`.

## Correção (budget Edge)

No máximo **uma** ação após a geração inicial:

- variedade falha **ou** >3 dias hard → retry integral
- 1–3 dias hard → reparo em lote
- nunca ambos em sequência; se ainda hard → rejeitar e preservar plano anterior

## Snapshot local

`mealPlanGenerationMeta` no Zustand/AsyncStorage (device-local). Sem coluna Supabase. Planos antigos sem snapshot abrem normalmente. Troca de usuário limpa o snapshot (junto com day targets).

## Client

- V1: Edge → Gemini client → mock
- V2: Edge obrigatório; sem Edge e sem mock → mensagem controlada (sem mencionar “Edge Function”)
- Mock V2 só para testes/E2E (`EXPO_PUBLIC_AI_MOCK`)

## Rollout (fora deste sprint)

1. Publicar Edge V2 retrocompatível (canary)
2. Preview com flags ON
3. Produção com flags ON

## Testes

- Unitários: `src/domain/meal-plan-targets/`
- Paridade: `parity.app-edge.test.ts`
- Smoke local Edge: `npm run smoke:meal-plan-v2-local`
- E2E: `npm run test:e2e:sprint2c3`
