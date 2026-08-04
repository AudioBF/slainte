# Metas efetivas em Hoje e Semana (Sprint 2C)

## Escopo desta entrega

Integração de metas por tipo de dia em **Hoje** e **Semana** (antigos 2C.1 + 2C.2).

**Incluído**

- Selectors centrais em `src/store/selectors/dayTargets/`
- Resolução de meta efetiva por data civil
- Semana civil segunda–domingo (Europe/Dublin)
- Estados `future` / `no_log` / `logged`
- UI discreta de label em Hoje (flag ON)
- TrendChart com meta por dia (flag ON)

**Fora de escopo (histórico — concluído em Sprint 2C.3)**

- Dieta usando metas diferentes por dia → ver [meal-plan-multi-target.md](./meal-plan-multi-target.md)
- Geração de cardápio multi-meta / prompts / Edge Functions (código local; publicação em rollout separado)
- Sync cloud de day targets, migrations, RLS, Supabase schema (ainda fora)

## Feature flag

`EXPO_PUBLIC_USE_DAY_TARGETS` permanece **OFF** por padrão (somente `"true"` liga).

| Flag | Hoje / Semana | Dieta / cardápio |
|------|---------------|------------------|
| OFF | `profile.dailyGoals` (equivalente pós-2B); sem label de tipo de dia | Meta única do perfil (V1) |
| ON | Meta efetiva por data (override → agenda → perfil) | Continua V1 até `USE_MULTI_TARGET_MEAL_PLAN` também ON |

Ao desligar a flag: templates e agenda **permanecem** salvos no dispositivo; telas voltam ao perfil; nenhum dado é apagado.

## Selector central

Componentes React **não** chamam `getEffectiveTargetForDate` diretamente. Hoje e Semana consomem:

- `selectEffectiveNutritionTargetForDate` (pura, recebe `flagEnabled`)
- `selectEffectiveGoalsForDate`
- `selectEffectiveTargetLabel`
- `selectWeekCivilDates` / `selectWeekEffectiveTargets`
- `selectWeekNutritionComparison` / `selectDayLogStatus`

## Semana civil

Sempre segunda→domingo contendo a data de referência (Dublin). Não usa “últimos 7 dias” no modo flag ON.

## Ausência vs zero

- `future`: não entra no realizado
- `no_log`: “sem registro” — não é consumo zero
- `logged`: soma real (inclusive macros zerados)

Médias comparáveis dividem apenas por dias com log; sem logs → `null`.

## Rollout

1. Merge com flag OFF
2. QA OFF e ON isoladas
3. Preview ON só com autorização
4. Produção ON só após GO separado (após avaliar Dieta mono-meta vs Hoje multi-meta no canary)
