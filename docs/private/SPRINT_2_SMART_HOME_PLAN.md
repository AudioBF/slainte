# Sprint 2 — Smart Home / Weekly Nutrition Diagnosis

**Status:** Planning only. No app code changed.  
**Goal:** Transform the Home screen (`app/(tabs)/index.tsx`) from a numbers dashboard into a practical daily assistant that explains what the numbers mean and suggests the next useful action.  
**Scope:** One sprint, local/rule-based insights only. No new AI calls. No full app redesign.

---

## 1. Current Home screen behavior

The Home tab is implemented as `TodayScreen` in `app/(tabs)/index.tsx`. It has two modes via `SegmentedControl`: **Hoje** and **Semana**.

### Hoje (today) mode

| Element | Behavior |
|---|---|
| `ScreenHeader` | Title "Hoje", avatar → profile |
| `DateNavigator` | Browse past days; cannot go beyond today |
| Past-day hint | Card + "Ir para hoje" when viewing history |
| Macro card | `CalorieRing` + three `MacroBar`s vs `profile.dailyGoals` |
| Meals section | `ListRow` per logged meal; "+ Nova" only on today |
| Empty state | Plain text: "Nenhuma refeição registrada neste dia." |
| FAB | `PrimaryActionBar` "Fotografar refeição" when today has zero meals |

Data sources:

- `loggedMeals`, `selectedHistoryDate`, `profile.dailyGoals`
- Selectors: `selectMealsForDate`, `selectTodayActual` / `selectActualForDate`

**Not used on Home today (but available in store):**

- `selectTodayPlanned(plannedMeals)` — today's planned macros from meal plan
- `profile.goal` (`lose` / `maintain` / `gain`)
- `mealPlanSummary` — only shown on Diet tab
- `isPlannedMealLoggedToday` — used on Diet tab, not Home

### Semana (week) mode

| Element | Behavior |
|---|---|
| `TrendChart` | Last 7 calendar days of calories vs daily goal line |
| `ComparisonBars` | "Plano × Real" for protein, carbs, fat |
| Week history | Tap a day → switches to Hoje mode for that date |

Data sources:

- `selectWeekCalorieTrend`, `selectWeekComparison`, `selectRecentDates`
- `weekSummaries` built inline in the screen

**Important limitation in current week comparison:**

`selectWeekComparison` sums **all** `plannedMeals` (entire generated plan) against **actual** logged meals in the last 7 calendar days. It does not align plan days to calendar dates, and it ignores whether the user has a plan at all when rendering the chart.

---

## 2. Main UX weaknesses

1. **Numbers without meaning** — The ring and bars show progress toward goals but never say "you're on track", "protein is low", or "you have 400 kcal left for dinner".

2. **No next action** — After opening Home, the user must infer what to do: log a meal, follow the plan, adjust intake, or check the diet tab.

3. **Plan disconnected from Home** — Users generate a weekly plan on the Diet tab, but Home never references today's planned meals, missing slots, or plan adherence.

4. **Week view is analytical, not diagnostic** — Charts compare aggregates without a plain-language summary like "você registrou 4 de 7 dias" or "proteína ficou abaixo da meta em 5 dias".

5. **Goal type ignored** — `profile.goal` (emagrecimento / manutenção / hipertrofia) does not change Home copy or thresholds.

6. **Empty states are passive** — "Nenhuma refeição registrada" does not guide first-time or returning users toward photo logging or plan logging.

7. **Duplicated mental model** — Diet tab shows `mealPlanSummary`; Home shows raw macros. The assistant narrative lives on the wrong screen.

8. **Week comparison can mislead** — Full-plan totals vs partial logging over 7 days produces bars that are hard to interpret without context.

---

## 3. Proposed Smart Home sections

Keep the existing layout skeleton (header → segmented control → content). Add interpretation layers on top — do not replace the whole screen.

### 3.1 Hoje — new sections (top to bottom)

```
┌─────────────────────────────────────┐
│ ScreenHeader                        │
│ SegmentedControl                    │
│ DateNavigator                       │
├─────────────────────────────────────┤
│ ★ InsightCard (1 primary message)   │  ← NEW
├─────────────────────────────────────┤
│ CalorieRing + MacroBars (existing)  │
│ ★ RemainingBudgetRow (optional)     │  ← NEW, compact line under ring
├─────────────────────────────────────┤
│ ★ TodayPlanSection (if plan exists) │  ← NEW
│   - next unlogged planned meal      │
│   - ProgressBar adherence           │
├─────────────────────────────────────┤
│ Refeições de hoje (existing)        │
└─────────────────────────────────────┘
```

### 3.2 Semana — new sections

```
┌─────────────────────────────────────┐
│ ★ WeekDiagnosisCard                 │  ← NEW: 2–3 bullet insights
├─────────────────────────────────────┤
│ TrendChart (existing)               │
│ ★ TrendCaption (1 line)             │  ← NEW: e.g. "média 1.950 kcal/dia"
├─────────────────────────────────────┤
│ ComparisonBars (existing, improved) │  ← caption + only if plan exists
├─────────────────────────────────────┤
│ Histórico da semana (existing)      │
└─────────────────────────────────────┘
```

### Section definitions

| Section | Purpose | When hidden |
|---|---|---|
| **InsightCard** | One human sentence: status + suggestion | Never on today; show generic welcome if no data |
| **RemainingBudgetRow** | "Restam ~420 kcal · P 35g · C 60g · G 18g" | When viewing past days |
| **TodayPlanSection** | Today's planned meals vs logged; CTA to log next | No `plannedMeals` or not today |
| **WeekDiagnosisCard** | Weekly summary bullets | Always (fallback if sparse data) |
| **TrendCaption** | One-line stat under chart | Always |

Design notes:

- Reuse `Card`, `Section`, `ProgressBar`, `ListRow`, `Button`, `EmptyState`
- Cream background (`colors.cream`) for insight cards; forest text (`colors.forest`)
- No new color palette — sage/orange/gold for status accents only
- Max **one** primary insight visible at a time on Hoje to avoid clutter

---

## 4. Daily insights (local, no AI)

All computed from `loggedMeals`, `plannedMeals`, `profile.dailyGoals`, `profile.goal`, and clock time.

### Calorie budget

| Rule | Condition | Insight type |
|---|---|---|
| Remaining calories | `goal.calories - actual.calories` | `remaining` / `over` |
| Near goal | within ±10% of goal | `on_track` |
| Over goal | >110% | `over_calories` |
| Under goal (late day) | after 18:00 and <70% of goal | `under_calories` |

### Macro balance

| Rule | Condition | Insight type |
|---|---|---|
| Protein gap | `actual.protein < goal.protein * 0.7` after lunch slot logged or after 14:00 | `low_protein` |
| Protein on track | `actual.protein >= goal.protein * 0.8` | `protein_ok` |
| Carbs heavy | carbs > goal and protein < 70% goal | `carbs_high` |
| Fat heavy | fat > goal * 1.15 | `fat_high` |

### Meal logging

| Rule | Condition | Insight type |
|---|---|---|
| No meals today | `dayMeals.length === 0` and is today | `empty_day` |
| Missing slot | slot not in logged meals; infer by time: before 11 → breakfast, 11–15 → lunch, 15–20 → snack, after 20 → dinner | `missing_slot` |
| All slots logged | all expected slots have meals | `day_complete` |

### Plan adherence (today)

| Rule | Condition | Insight type |
|---|---|---|
| Plan exists, meal not logged | planned meal for today's `dayIndex` without matching `plannedMealId` in `loggedMeals` | `plan_pending` |
| Plan meal logged | `isPlannedMealLoggedToday` | `plan_done` |
| No plan | `plannedMeals.length === 0` | `no_plan` |

### Goal-aware framing

| `profile.goal` | Emphasis in copy |
|---|---|
| `lose` | staying near goal, avoiding overshoot |
| `maintain` | consistency day to day |
| `gain` | hitting protein and total calories |

Priority order when multiple rules match (show highest priority only on InsightCard):

1. `empty_day`
2. `plan_pending` (specific next meal)
3. `missing_slot`
4. `over_calories` / `low_protein` / macro issues
5. `on_track` / `remaining`
6. `day_complete`

---

## 5. Weekly insights (local, no AI)

Computed from last 7 calendar days (`selectRecentDates(7)`).

### Logging consistency

| Metric | Calculation |
|---|---|
| Days logged | count of dates where `selectMealsForDate` length > 0 |
| Days on calorie target | count where actual calories within ±15% of goal |
| Streak | consecutive days up to today with at least 1 meal |

### Calorie trend

| Metric | Calculation |
|---|---|
| Daily average | mean of `selectWeekCalorieTrend` |
| vs goal | average - `profile.dailyGoals.calories` |
| Best / worst day | max/min calorie day in period |

### Macro trend (weekly totals vs weekly goals)

| Metric | Calculation |
|---|---|
| Weekly actual | `sumMacros` for last 7 days |
| Weekly goal | `dailyGoals * daysInPeriod` (7) |
| Dominant gap | macro with largest `(goal - actual) / goal` deficit |

### Plan alignment (improved)

| Metric | Calculation |
|---|---|
| Per-day planned | map `dayIndex` to calendar date starting from plan creation or current week Mon–Sun |
| Per-day actual | `selectActualForDate` |
| Plan days matched | days where user logged at least one `fromPlan` meal |

**Sprint 2 simplification:** Align plan `dayIndex` 0–6 to current calendar week (Mon=0 … Sun=6) using today's weekday. Document limitation: if user generated plan mid-week, day 0 may not mean Monday — acceptable for personal use; note in code comment.

### Weekly insight priority (WeekDiagnosisCard, max 3 bullets)

1. Logging consistency ("Registrou X de 7 dias")
2. Dominant macro gap ("Proteína ficou abaixo da meta na maior parte da semana")
3. Calorie average vs goal
4. Plan adherence (if plan exists)

---

## 6. Optional AI diagnosis ideas (later, not Sprint 2)

These are **future** enhancements. Sprint 2 must work fully without them.

| Idea | Input | Output | Why later |
|---|---|---|---|
| Weekly narrative | 7-day summaries + goals + plan | 2–3 sentence diagnosis in PT-BR | Needs Edge Function, quota, latency |
| Meal swap suggestion | today's remaining macros + planned dinner | "Troque X por Y no jantar" | Requires recipe/plan context + AI |
| Pattern detection | 30-day history | "Fins de semana você passa ~300 kcal" | Needs longer history + AI or heavier local stats |
| Gentle coaching tone | insight type + profile | Personalized phrasing | Cosmetic; rule-based copy is enough for now |

If added later, call a new Edge Function (e.g. `diagnose-week`) with **aggregated** stats only — never raw photos. Feature-flag like `EXPO_PUBLIC_USE_EDGE_DIAGNOSIS`.

---

## 7. Data needed from existing store/selectors

### From `useAppStore`

| Field | Used for |
|---|---|
| `profile.dailyGoals` | targets, remaining budget |
| `profile.goal` | copy tone and thresholds |
| `profile.displayName` | optional greeting |
| `loggedMeals` | all actual intake |
| `plannedMeals` | today's plan, adherence, week comparison |
| `mealPlanSummary` | optional secondary line in TodayPlanSection |
| `selectedHistoryDate` | today vs history mode |
| `viewMode` | today vs week |

### Existing selectors (reuse as-is)

| Selector | Use |
|---|---|
| `todayISO()` | date boundaries |
| `selectTodayActual` | today's totals |
| `selectTodayPlanned` | today's planned totals |
| `selectMealsForDate` | meals for a day |
| `selectActualForDate` | totals for a day |
| `selectRecentDates(7)` | week window |
| `selectWeekCalorieTrend` | chart + average |
| `selectWeekComparison` | macro bars (improve caller logic) |
| `isPlannedMealLoggedToday` | plan slot status |
| `sumComponentMacros` | meal row display |
| `formatDateLabel` | labels |

---

## 8. New selectors needed

Add to `src/store/selectors.ts` (pure functions, easy to unit test).

### Types (add to `src/types/index.ts` or a local `insights.ts`)

```ts
export type MacroKey = 'calories' | 'protein' | 'carbs' | 'fat';

export type InsightSeverity = 'info' | 'success' | 'warning';

export type DailyInsight = {
  id: string;
  severity: InsightSeverity;
  title: string;
  message: string;
  actionLabel?: string;
  actionRoute?: string; // expo-router path
};

export type WeeklyInsight = {
  id: string;
  message: string;
};

export type RemainingBudget = MacroTotals; // goal - actual, floored at 0 per macro

export type TodayPlanStatus = {
  dayIndex: number;
  plannedMeals: PlannedMeal[];
  loggedPlannedIds: Set<string>;
  nextUnlogged: PlannedMeal | null;
  loggedCount: number;
  totalCount: number;
};
```

### Selector functions

| Function | Returns | Notes |
|---|---|---|
| `selectRemainingBudget(actual, goals)` | `RemainingBudget` | clamp negatives to 0 for display; track `isOver` separately |
| `selectMacroStatuses(actual, goals)` | per-macro `{ ratio, status: 'under' \| 'on' \| 'over' }` | thresholds: under <0.85, on 0.85–1.1, over >1.1 |
| `selectTodayPlanStatus(loggedMeals, plannedMeals, date?)` | `TodayPlanStatus` | uses weekday → `dayIndex` |
| `selectMissingSlots(meals, now?)` | `MealSlot[]` | time-based heuristic |
| `selectPrimaryDailyInsight(...)` | `DailyInsight \| null` | applies priority rules from §4 |
| `selectWeeklyStats(loggedMeals, goals, dates?)` | `{ daysLogged, avgCalories, onTargetDays, streak, weeklyActual, weeklyGoal }` | |
| `selectWeeklyInsights(...)` | `WeeklyInsight[]` | max 3, priority from §5 |
| `selectWeekComparisonByDay(loggedMeals, plannedMeals, dates)` | `{ planned: MacroTotals, actual: MacroTotals }` | fix alignment: sum planned for mapped days only |
| `selectTrendCaption(weekTrend, goal)` | `string` | e.g. "Média 1.920 kcal/dia · 120 abaixo da meta" |

Keep `getTodayPlanned` / `getWeekComparison` on the store unchanged; Home can import selectors directly (current pattern in `index.tsx`).

---

## 9. Components to create or modify

### Create

| Component | File | Description |
|---|---|---|
| `InsightCard` | `src/components/InsightCard.tsx` | Single insight: severity accent border, title, message, optional `Button` / `SectionAction` |
| `RemainingBudgetRow` | `src/components/RemainingBudgetRow.tsx` | Compact muted line under calorie ring |
| `TodayPlanSection` | `src/features/home/TodayPlanSection.tsx` | Section + `ProgressBar` + next planned `ListRow` with "Registrar" action |
| `WeekDiagnosisCard` | `src/features/home/WeekDiagnosisCard.tsx` | Card with 2–3 bullet insights |
| `TrendCaption` | `src/components/TrendCaption.tsx` | One-line caption under `TrendChart` |

### Modify

| File | Change |
|---|---|
| `app/(tabs)/index.tsx` | Wire new sections; use new selectors; improve empty state |
| `src/store/selectors.ts` | Add insight selectors |
| `src/types/index.ts` | Add insight types (or `src/features/home/types.ts`) |
| `src/components/ComparisonBars.tsx` | Optional subtitle prop: "Últimos 7 dias · plano alinhado ao calendário" |
| `src/components/EmptyState.tsx` | Use on Home meal empty state with CTA |

### Do not modify in Sprint 2

- AI services / Edge Functions
- Diet, Shopping, Meal flows (except navigation targets from CTAs)
- Tab bar, global theme, onboarding
- `useAppStore` persist shape

---

## 10. Copy examples (Brazilian Portuguese)

### Daily InsightCard

| Scenario | Title | Message | CTA |
|---|---|---|---|
| Empty day | "Dia ainda sem registros" | "Fotografe sua próxima refeição ou registre uma do cardápio." | "Fotografar refeição" → `/meal` |
| Plan pending | "Almoço do plano" | "Você ainda não registrou o almoço de hoje: Frango com batata doce (~520 kcal)." | "Registrar" → log via store |
| Low protein | "Proteína abaixo do ideal" | "Faltam ~45g de proteína para a meta. Priorize proteína no jantar." | — |
| On track | "No caminho certo" | "Você consumiu 1.450 de 2.100 kcal. Ainda restam ~650 kcal hoje." | — |
| Over calories | "Acima da meta de calorias" | "Passou ~180 kcal da meta. Amanhã volte ao plano sem culpa — consistência importa mais." | — |
| Day complete | "Dia registrado" | "Todas as refeições de hoje foram registradas. Boa consistência." | — |
| No plan | "Sem cardápio ativo" | "Gere um plano semanal na aba Dieta para receber sugestões aqui." | "Ver Dieta" → `/diet` |

### RemainingBudgetRow

- "Restam **650 kcal** · P **52g** · C **85g** · G **22g**"
- "Meta atingida — **+120 kcal** acima do objetivo"

### TodayPlanSection

- Section title: "Cardápio de hoje"
- Subtitle: "2 de 4 refeições registradas"
- Row: "🍽️ Almoço · Frango grelhado · 520 kcal" → trailing "Registrar"

### WeekDiagnosisCard

- "• Você registrou **5 de 7 dias** esta semana."
- "• Média de **1.950 kcal/dia** — **150 abaixo** da meta."
- "• **Proteína** foi o macro mais distante da meta (≈18% abaixo)."
- "• **3 refeições do plano** foram registradas na semana."

### TrendCaption

- "Média 2.010 kcal/dia · linha tracejada = meta (2.100 kcal)"

### Improved empty state (meals)

- Title: "Nenhuma refeição hoje"
- Message: "Comece fotografando o café da manhã ou registre uma refeição do seu cardápio."
- Action: "Fotografar refeição"

Tone rules:

- Direct, friendly, no guilt
- Numbers rounded (integers)
- Avoid medical claims
- Use "você" consistently

---

## 11. Implementation phases

### Phase 1 — Selectors & types (~1 day)

- [ ] Add insight types
- [ ] Implement `selectRemainingBudget`, `selectMacroStatuses`, `selectTodayPlanStatus`
- [ ] Implement `selectPrimaryDailyInsight` with priority rules
- [ ] Implement `selectWeeklyStats`, `selectWeeklyInsights`, `selectWeekComparisonByDay`
- [ ] Manual sanity check with mock data in dev

### Phase 2 — Daily Smart Home (~1–1.5 days)

- [ ] Create `InsightCard`, `RemainingBudgetRow`
- [ ] Create `TodayPlanSection` with log-planned-meal action (reuse `logPlannedMeal`)
- [ ] Integrate into `index.tsx` Hoje mode
- [ ] Replace plain empty state with `EmptyState` + CTA
- [ ] Hide insight sections when viewing past days (or show historical insight)

### Phase 3 — Weekly diagnosis (~1 day)

- [ ] Create `WeekDiagnosisCard`, `TrendCaption`
- [ ] Wire week mode in `index.tsx`
- [ ] Switch to `selectWeekComparisonByDay` when plan exists; hide or simplify `ComparisonBars` when no plan
- [ ] Add fallback copy for sparse weeks (<3 days logged)

### Phase 4 — Polish & validation (~0.5 day)

- [ ] `npx tsc --noEmit`
- [ ] `npm run build:web`
- [ ] Manual test matrix (below)
- [ ] Update `docs/private/PROJECT_BRIEFING.md` — Home now shows local insights

### Test matrix

| Scenario | Expected |
|---|---|
| Today, no meals | Empty insight + FAB + EmptyState CTA |
| Today, 1 meal, below protein | Low protein insight |
| Today, plan exists, lunch not logged | Plan pending insight + TodayPlanSection |
| Today, all plan meals logged | Day complete or on track |
| Past day | No remaining budget; historical totals only |
| Week, 2 days logged | "Registrou 2 de 7 dias" |
| Week, no plan | No ComparisonBars or caption "Sem cardápio" |
| Over calorie goal | Warning insight, no alarmist tone |

---

## 12. Risks and how to keep the Home simple

| Risk | Mitigation |
|---|---|
| Too many messages at once | One `InsightCard` on Hoje; max 3 bullets on Semana |
| Incorrect plan/day mapping | Document Mon–Sun mapping; show plan section only when `plannedMeals.length > 0` |
| Time-based slot guessing wrong | Use soft copy: "Talvez falte registrar o almoço" not "Você perdeu o almoço" |
| Week comparison confusion | Fix selector alignment; add caption explaining period |
| Scope creep into AI | Explicit non-goal in PR description; no imports from `src/services/ai` |
| Performance | All selectors are O(n) over meals; memoize in screen with `useMemo` (existing pattern) |
| Past-day navigation clutter | Suppress plan section and "next action" on non-today dates |
| Feature feels generic | Prioritize plan-aware and protein insights — highest value for daily use |

**Simplicity rule:** If a new element does not answer "what should I do next?" or "what does this number mean?", it does not ship in Sprint 2.

---

## 13. Recommendation — what to implement first

**Start with Phase 2's `InsightCard` + `selectPrimaryDailyInsight` on the Hoje tab.** This delivers the core product promise with the smallest diff:

1. Immediate usefulness the first time you open the app each day
2. No new dependencies, no AI, no store migrations
3. Reuses existing `Card`, `Button`, navigation to `/meal` and `/diet`

**Second priority:** `TodayPlanSection` — connects Diet tab work to daily Home use (log next planned meal in one tap).

**Third priority:** `WeekDiagnosisCard` + fixed week comparison — completes the "weekly nutrition diagnosis" story without touching charts.

Defer `RemainingBudgetRow` and `TrendCaption` if time is tight; they are nice-to-have compressions of data already shown elsewhere.

---

## Appendix: file reference

| Area | Path |
|---|---|
| Home screen | `app/(tabs)/index.tsx` |
| Store | `src/store/useAppStore.ts` |
| Selectors | `src/store/selectors.ts` |
| Types | `src/types/index.ts` |
| Design system | `Card`, `Section`, `CalorieRing`, `MacroBar`, `TrendChart`, `ComparisonBars`, `ProgressBar`, `EmptyState`, `ListRow` |
| Theme | `src/theme/colors.ts` (cream `#F5F0E8`, forest `#1B4332`) |
| Plan summary (Diet only today) | `mealPlanSummary` in store, shown in `app/(tabs)/diet.tsx` |
