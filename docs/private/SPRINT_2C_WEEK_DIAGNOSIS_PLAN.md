# Sprint 2C — WeekDiagnosisCard Plan

**Status:** Planning only. No app code changed.  
**Goal:** Add a compact `WeekDiagnosisCard` to the Home **Semana** tab that explains the last 7 calendar days in plain Brazilian Portuguese — without AI.  
**Context:** Sprint 2A (InsightCard) and 2B (TodayPlanSection) are complete on Hoje. Composer 2.5 → keep scope small and controlled.

---

## 1. Current Semana behavior

The week branch in `app/(tabs)/index.tsx` (`viewMode === 'week'`) renders, top to bottom:

| Block | Component | Data source |
|---|---|---|
| Calorie trend | `TrendChart` | `selectWeekCalorieTrend(loggedMeals)` vs `profile.dailyGoals.calories` |
| Macro comparison | `ComparisonBars` | `selectWeekComparison(loggedMeals, plannedMeals)` |
| Week history | `Section` + `ListRow` list | `selectRecentDates(7)` + `selectActualForDate` / `selectMealsForDate` |

**What the user sees today:**

- A chart of daily calories with a dashed goal line — no summary sentence.
- "Plano × Real" bars for protein, carbs, fat — numbers only, no interpretation.
- A tappable list of 7 days with meal count and kcal.

**What is not shown:**

- How many days were logged.
- Whether the week was above/below calorie goal on average.
- Which macro drifted most.
- Whether plan meals were followed.

**Known quirk in `selectWeekComparison`:**

```ts
// Sums ALL plannedMeals (entire generated plan)
const planned = plannedMeals.reduce(...)
// vs actual logged in last 7 calendar days only
const actual = sumMacros(loggedMeals.filter(m => weekDates.has(m.date)))
```

This misaligns plan days with calendar days and can produce confusing bars (including perceived "0g planned" when no plan exists or when the UI looks broken). Documented in `SPRINT_2A` as deferred.

Hoje mode is unchanged in Semana — no InsightCard, no TodayPlanSection.

---

## 2. What problem we are solving

| Problem | User impact |
|---|---|
| Semana is a **dashboard**, not an assistant | User must interpret charts alone |
| No **consistency signal** | "Did I log most days?" is invisible |
| No **weekly calorie narrative** | Average vs goal requires mental math |
| No **macro headline** | Chart shows bars but not "proteína foi o maior gap" |
| Misleading **Plano × Real** | Bars can confuse more than help when plan data doesn't match the 7-day window |

**Sprint 2C solves:** one card at the top of Semana with **up to 3 bullet insights** computed locally — the same product promise as InsightCard, but for the week.

**Sprint 2C does not solve:** perfect plan-to-calendar alignment, AI coaching, or Hoje polish (e.g. InsightCard vs TodayPlanSection duplication).

---

## 3. Exact local insights to calculate (no AI)

Window: `selectRecentDates(7)` — last 7 calendar days ending today.

### 3.1 Core metrics (`selectWeeklyStats`)

| Metric | Calculation |
|---|---|
| `daysLogged` | Count dates where `selectMealsForDate(loggedMeals, date).length > 0` |
| `daysInPeriod` | `7` (fixed) |
| `avgCalories` | `sum(selectWeekCalorieTrend) / 7` (include zero-calorie days) |
| `calorieGoal` | `profile.dailyGoals.calories` |
| `calorieDelta` | `avgCalories - calorieGoal` (negative = below goal) |
| `daysOnTarget` | Days where `actual.calories` within ±15% of `calorieGoal` |
| `weeklyActual` | `sumMacros` for meals in the 7 dates |
| `weeklyGoal` | `dailyGoals * 7` per macro |
| `dominantMacroGap` | Among protein/carbs/fat: macro with largest relative **deficit** `(weeklyGoal - weeklyActual) / weeklyGoal` when `weeklyActual < weeklyGoal * 0.9`; ignore if all within 10% |
| `planMealsLogged` | Count `loggedMeals` in window where `fromPlan === true` (optional 3rd bullet) |
| `hasPlan` | `plannedMeals.length > 0` |

### 3.2 Insight bullets (`selectWeeklyInsights`) — max 3

Build an ordered list, take first 3 non-empty items.

**Priority order:**

| Priority | ID | Condition | Bullet intent |
|---|---|---|---|
| 1 | `logging_consistency` | Always (if `daysLogged < 7`, emphasize; if 7/7, positive) | Consistency |
| 2 | `calorie_average` | Always when `daysLogged >= 1`; soft message when `daysLogged === 0` | Calorie trend vs goal |
| 3 | `macro_gap` | `dominantMacroGap` exists AND `daysLogged >= 3` | Dominant macro deficit |
| 4 | `plan_adherence` | `hasPlan` AND `planMealsLogged >= 1` | Plan meals logged this week |
| 5 | `sparse_week` | `daysLogged <= 2` | Encourage more logging (only if not enough bullets yet) |

**Rules:**

- Never emit more than **3** bullets.
- Round kcal and macro deltas to integers; use `~` in copy.
- If `daysLogged === 0`: card still shows with 1–2 bullets (consistency + gentle nudge); skip macro gap and calorie average detail.
- No `profile.goal` branching in 2C (optional polish later).

### 3.3 Types

```ts
export type WeeklyInsight = {
  id: string;
  message: string; // full bullet text including "• " prefix optional in component
};

export type WeeklyStats = {
  daysLogged: number;
  daysInPeriod: number;
  avgCalories: number;
  calorieGoal: number;
  calorieDelta: number;
  daysOnTarget: number;
  weeklyActual: MacroTotals;
  weeklyGoal: MacroTotals;
  dominantMacroGap: { key: 'protein' | 'carbs' | 'fat'; deficitPct: number } | null;
  planMealsLogged: number;
  hasPlan: boolean;
};
```

---

## 4. Selector/helper functions needed

Add under `src/features/home/` (same pattern as 2A/2B):

| Function | File | Returns |
|---|---|---|
| `selectWeeklyStats(input)` | `selectWeeklyInsights.ts` or split `selectWeeklyStats.ts` | `WeeklyStats` |
| `selectWeeklyInsights(input)` | same file | `WeeklyInsight[]` (max 3) |

**Input type:**

```ts
type SelectWeeklyInsightsInput = {
  loggedMeals: LoggedMeal[];
  plannedMeals: PlannedMeal[];
  dailyGoals: MacroGoals;
};
```

**Reuse from `src/store/selectors.ts` (do not duplicate logic unnecessarily):**

- `selectRecentDates(7)`
- `selectMealsForDate`
- `selectActualForDate`
- `selectWeekCalorieTrend`
- `sumMacros`

**Do not add in 2C (defer):**

- `selectWeekComparisonByDay` — alignment fix for ComparisonBars; optional 2D slice
- `selectTrendCaption` — nice-to-have one-liner under chart; out of scope unless trivial

Export from `src/features/home/index.ts`.

---

## 5. Component needed

### `src/features/home/WeekDiagnosisCard.tsx`

**Props:**

```ts
type Props = {
  insights: WeeklyInsight[];
};
```

**UI:**

- Reuse `Card` with cream background (match `InsightCard` / `TodayPlanSection`).
- Title: **"Resumo da semana"** (`typography.subtitle`).
- Body: up to 3 lines, each a bullet (`•` + `typography.body` / muted color).
- No CTA buttons in 2C.
- Compact padding; no icons per bullet.

**Empty fallback:**

- If `insights.length === 0` (shouldn't happen with rules above), show single line:  
  `"Registre refeições durante a semana para ver um resumo aqui."`

**Do not reuse `InsightCard` directly** — weekly card is multi-bullet, no severity accent, no action. Keep separate component (~40 lines).

---

## 6. Where it appears in the Semana layout

Insert **at the top** of the week branch, before `TrendChart`:

```
┌─────────────────────────────────────┐
│ ScreenHeader + SegmentedControl     │
├─────────────────────────────────────┤
│ ★ WeekDiagnosisCard                 │  ← NEW
├─────────────────────────────────────┤
│ TrendChart (existing)               │
│ ComparisonBars (existing, gated)    │  ← see §8
├─────────────────────────────────────┤
│ Histórico da semana (existing)      │
└─────────────────────────────────────┘
```

**Wire in `index.tsx`:**

```ts
const weeklyInsights = useMemo(() => {
  if (viewMode !== 'week') return [];
  return selectWeeklyInsights({ loggedMeals, plannedMeals, dailyGoals: profile.dailyGoals });
}, [viewMode, loggedMeals, plannedMeals, profile.dailyGoals]);

// Inside viewMode === 'week' branch:
<WeekDiagnosisCard insights={weeklyInsights} />
```

**Guards:**

- Only render when `viewMode === 'week'`.
- Do not touch Hoje branch.

---

## 7. Copy examples (Brazilian Portuguese)

### Logging consistency

- `daysLogged === 0`:  
  `"• Você ainda não registrou refeições nos últimos 7 dias."`
- `daysLogged === 3`:  
  `"• Você registrou 3 de 7 dias esta semana."`
- `daysLogged === 7`:  
  `"• Você registrou todos os 7 dias — ótima consistência."`

### Calorie average

- Below goal:  
  `"• Média de 1.850 kcal/dia — ~250 abaixo da meta."`
- Above goal:  
  `"• Média de 2.300 kcal/dia — ~200 acima da meta."`
- Near goal (±10%):  
  `"• Média de 2.050 kcal/dia — próximo da meta."`
- Sparse data (`daysLogged === 1`):  
  `"• Poucos registros para calcular uma média confiável."`

### Macro gap

- `"• Proteína ficou o macro mais distante da meta esta semana (~18% abaixo)."`
- `"• Carboidrato ficou o macro mais distante da meta esta semana (~12% abaixo)."`

### Plan adherence (optional 3rd bullet)

- `"• 5 refeições do cardápio foram registradas esta semana."`

### Sparse week nudge

- `"• Registrar mais dias ajuda a ver padrões reais da semana."`

**Tone:** direct, neutral, no guilt — same as InsightCard.

---

## 8. What to do with Plano × Real when planned values are 0

**Problem:** `ComparisonBars` shows "Plano" rows at **0g** when:

- `plannedMeals.length === 0` (no active plan), or
- User has a plan but the comparison feels wrong (misalignment — separate issue).

**Sprint 2C recommendation (minimal, controlled):**

| Condition | Behavior |
|---|---|
| `plannedMeals.length === 0` | **Hide** `ComparisonBars` card entirely |
| Plan exists, planned macros > 0 | **Keep** `ComparisonBars` as-is (no alignment fix in 2C) |
| Plan exists but `planned.protein + carbs + fat === 0` (edge) | **Hide** bars; rely on WeekDiagnosisCard |

**Optional caption (only if bars stay visible and time permits):**

Add one `typography.caption` line under the title in `ComparisonBars` or above the card in `index.tsx`:

`"Comparação dos últimos 7 dias — plano semanal completo vs real."`

This acknowledges imperfection without rewriting `selectWeekComparison`.

**Explicitly defer to a future slice (2D or polish):**

- `selectWeekComparisonByDay` — map `dayIndex` 0–6 to the 7 calendar dates in the window, sum planned only for those days
- Hide bars until alignment is fixed, if caption isn't enough

**WeekDiagnosisCard must not depend on ComparisonBars** — insights come from `selectWeeklyStats`, not from the broken comparison.

---

## 9. Manual test checklist

| # | Scenario | Expected |
|---|---|---|
| 1 | Semana, 0 days logged | Card with "não registrou" + nudge; no macro gap bullet |
| 2 | Semana, 5/7 days logged | "5 de 7 dias" bullet present |
| 3 | Semana, avg below goal | Calorie average bullet shows delta below |
| 4 | Semana, protein deficit dominant | Macro gap bullet mentions proteína |
| 5 | Semana, max 3 bullets | Never more than 3 lines |
| 6 | No meal plan | ComparisonBars hidden; card still works |
| 7 | With meal plan | ComparisonBars visible (if planned > 0); plan adherence bullet possible |
| 8 | Hoje tab | No WeekDiagnosisCard |
| 9 | Tap day in Histórico | Still switches to Hoje (unchanged) |
| 10 | Register meal → Semana | `daysLogged` / average update after navigation |

**Regression:** InsightCard, TodayPlanSection, Diet, Shopping, Meal flows unchanged.

**Validation commands:**

```bash
npx tsc --noEmit
npm run build:web
```

---

## 10. Strict out-of-scope items

Do **not** implement in Sprint 2C:

| Item | Reason |
|---|---|
| AI / Edge Function diagnosis | Explicit constraint |
| Changes to Hoje mode (InsightCard, TodayPlanSection) | Semana-only sprint |
| InsightCard / TodayPlanSection dedup polish | Separate micro-slice |
| `selectWeekComparisonByDay` full fix | Scope creep; optional 2D |
| `TrendCaption` under chart | Nice-to-have; defer |
| `RemainingBudgetRow` | Hoje-only |
| Store persist shape changes | Constraint |
| Redesign of TrendChart or ComparisonBars styling | Constraint |
| New navigation / CTAs on diagnosis card | Keep compact |
| Unit tests (unless trivial) | Match 2A/2B pattern |
| `profile.goal`-aware weekly copy | Defer |
| Commit in planning task | User will commit after implementation |

---

## Implementation estimate (for Composer 2.5)

| Step | Effort |
|---|---|
| `selectWeeklyStats` + `selectWeeklyInsights` | ~0.5 day |
| `WeekDiagnosisCard.tsx` | ~0.25 day |
| Wire Semana + hide ComparisonBars when no plan | ~0.25 day |
| Doc `SPRINT_2C_WEEK_DIAGNOSIS_RESULT.md` + validation | ~0.25 day |

**Total:** ~1 day — fits one controlled sprint slice.

---

## Files to create/modify (implementation reference)

| Action | Path |
|---|---|
| Create | `src/features/home/selectWeeklyInsights.ts` |
| Create | `src/features/home/WeekDiagnosisCard.tsx` |
| Modify | `src/features/home/index.ts` |
| Modify | `app/(tabs)/index.tsx` (Semana branch only) |
| Create | `docs/private/SPRINT_2C_WEEK_DIAGNOSIS_RESULT.md` |

No changes to `useAppStore`, Edge Functions, or Hoje components.

---

## Success criteria

- User opens **Semana** and immediately reads what the week meant in plain Portuguese.
- At most 3 bullets; no AI; no new env vars.
- Misleading "Plano 0g" hidden when there is no plan.
- Hoje tab byte-identical in behavior aside from shared imports.
