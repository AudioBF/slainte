# Sprint 2D — Plano × Real by Calendar Day Plan

**Status:** Planning only — **revised after review**. Do not implement until approved.  
**Goal:** Fix misleading **Plano × Real** on Hoje → **Semana** so planned and actual macros compare the **same meaningful calendar window**.  
**Context:** Sprint 2 Smart Home complete. Shopping 3A–3B done.

---

## Review note — why the first draft was insufficient

The original proposal mapped `selectRecentDates(7)` → `dayIndex` and summed planned meals per date. That is **semantically cleaner** but **does not fix the mid-week bar problem** for a complete Mon–Sun plan:

| Fact | Implication |
|---|---|
| `selectRecentDates(7)` = 7 **consecutive** calendar days (today−6 … today) | That window always contains Seg, Ter, Qua, Qui, Sex, Sáb, Dom **exactly once each** |
| Complete plan has meals for every `dayIndex` 0–6 | Mapping each of the 7 dates → `dayIndex` → sum planned = **same total** as summing all `plannedMeals` |
| Actual side already uses those 7 dates | Bars may look unchanged after the “fix” |

**Conclusion:** Option A (rolling 7 days + per-date mapping) is a structural improvement but **≈ zero visual impact** on a full plan. It does **not** address “Plano bar muito alto na quarta-feira”.

A **product decision** is required before coding.

---

## 1. Objective

Make **Plano × Real** on the **Semana** tab answer:

> “Até hoje nesta semana, quanto o plano previa vs quanto eu registrei?”

Not:

> “Plano da semana inteira vs logs dos últimos 7 dias rolantes.”

**Constraints:**

- Derived selectors only — **no** `PlannedMeal` persist shape change.
- **2D v1:** change **`selectWeekComparison` only** (plus small date helpers).
- **Do not** change `WeekDiagnosisCard`, trend, or history in v1 (document mismatch; align in **2D+**).

---

## 2. Current behavior

### Week tab (`app/(tabs)/index.tsx`, `viewMode === 'week'`)

| UI block | Data source | Window |
|---|---|---|
| `WeekDiagnosisCard` | `selectWeeklyInsights` | Profile goals × 7 — **not plan macros** |
| `TrendChart` | `selectWeekCalorieTrend` | `selectRecentDates(7)` — rolling |
| **Plano × Real** | `selectWeekComparison` | Planned: **all** `plannedMeals`; Actual: rolling 7 days |
| Histórico da semana | `selectRecentDates(7)` | Rolling — actual only |

### `selectWeekComparison` today

```ts
planned = sum ALL plannedMeals (dayIndex 0–6, full abstract week)
actual  = sum loggedMeals where date ∈ selectRecentDates(7)
```

**Misalignment:**

1. Planned = always **7 plan days** of macros.
2. Actual = **7 rolling calendar days** of logs (may include partial logging).
3. Mid-week: user logs Seg–Qua but Plano still shows **Seg–Dom** → Plano bar looks inflated.

### Today tab (already correct for “today”)

`selectTodayPlanned`, `TodayPlanSection`, `InsightCard` map **calendar today** → `dayIndex` and filter planned meals for that day only.

---

## 3. User / product problem

| What the user sees | What they think | What the code does |
|---|---|---|
| Plano ≫ Real on Wednesday | “Estou abaixo do plano esta semana” | Plano = semana **inteira** do cardápio |
| Aba **Semana** | “Semana **atual**” (Seg → hoje) | Trend/histórico = **últimos 7 dias rolantes** |
| Plano × Real | Mesma janela nos dois lados | Janelas diferentes |

**Real pain:** mid-week adherence — full-week planned macros vs partial actual logs.

---

## 4. Current date model

| Concept | Model |
|---|---|
| **Logged meals** | `LoggedMeal.date` — ISO `YYYY-MM-DD` |
| **Planned meals** | `PlannedMeal.dayIndex` — `0=Seg … 6=Dom` (no calendar date stored) |
| **Plan anchor** | Implicit weekday mapping; AI prompt: dayIndex 0 = Segunda |
| **`selectedHistoryDate`** | Persisted; Hoje navigator only |
| **`todayISO()`** | Current local calendar date |
| **`selectRecentDates(7)`** | `[today−6, …, today]` — rolling, **not** “semana corrente” |
| **`isoToDayIndex(iso)`** | To add: Mon=0 … Sun=6 (duplicate logic exists in home selectors) |

**Mapping rule (all options):** for a given ISO date `d`, planned contribution = sum of `plannedMeals` where `dayIndex === isoToDayIndex(d)`.

---

## 5. Options compared

### Option A — Last 7 rolling days (first draft)

**Window:** `selectRecentDates(7)` for both planned and actual.

| Pros | Cons |
|---|---|
| Semantically aligned with current trend + histórico | For complete plan, planned total ≈ **unchanged** |
| Simple mapping via `isoToDayIndex` | **Does not fix** mid-week inflated Plano bar |
| No UI copy change needed | User expectation “Semana” ≠ rolling 7 days |

**Verdict:** acceptable refactor, **insufficient** as 2D goal.

---

### Option B — Current week-to-date ✅ **Recommended for 2D v1**

**Window:** ISO dates from **Monday of the current calendar week** through **today** (inclusive).

Example — today = Quarta:

| Side | Dates included |
|---|---|
| Planned | Seg + Ter + Qua (via dayIndex 0, 1, 2) |
| Actual | logs on Seg, Ter, Qua only |

| Pros | Cons |
|---|---|
| Fixes real mid-week “Plano alto demais” | Trend/histórico still rolling until **2D+** |
| Matches “Semana” mental model | Monday boundary assumes ISO week starts Seg (matches `dayIndex`) |
| No persist change | Plan regenerated Fri still maps Mon slot to calendar Mon (v1 limitation) |

**Verdict:** **implement 2D v1 with this window** for `selectWeekComparison` only.

---

### Option C — Keep logic; change copy only

Label Plano × Real as “Plano semanal completo vs real recente”.

| Pros | Cons |
|---|---|
| Zero logic risk | **Misleading**; does not fix adherence UX |
| | Not recommended |

**Verdict:** reject unless product explicitly wants no code change.

---

## 6. Recommended smallest implementation (Option B — 2D v1)

**Touch:** `src/store/selectors.ts` only (optional: consolidate `todayDayIndex` imports in home selectors if trivial).

### New helpers

```ts
/** Mon=0 … Sun=6 — same as meal-plan dayIndex. */
export function isoToDayIndex(iso: string): number;

/** Monday of the calendar week containing `iso`. */
export function startOfWeekMonday(iso: string): string;

/** Seg → `endDate` inclusive (typically today). */
export function selectWeekToDateDates(endDate = todayISO()): string[];

export function selectPlannedForDate(
  plannedMeals: PlannedMeal[],
  date: string,
): MacroTotals;
```

Use existing `offsetDate(iso, n)` with `T12:00:00` noon anchor.

### Rewrite `selectWeekComparison`

```ts
const dates = selectWeekToDateDates(todayISO());

const planned = dates.reduce(
  (acc, date) => addMacros(acc, selectPlannedForDate(plannedMeals, date)),
  zeroMacros,
);

const dateSet = new Set(dates);
const actual = sumMacros(loggedMeals.filter((m) => dateSet.has(m.date)));

return { planned, actual };
```

### What stays unchanged in v1

| Component | Window (unchanged) |
|---|---|
| `TrendChart` | Rolling `selectRecentDates(7)` |
| Histórico da semana | Rolling 7 days |
| `WeekDiagnosisCard` | Profile goals |
| `ComparisonBars` props | `{ planned, actual }` — values change, UI same |

### Known v1 inconsistency (document; fix in 2D+)

**Plano × Real** = semana corrente Seg→hoje.  
**Trend + Histórico** = últimos 7 dias rolantes.

On **Monday**, rolling window ≠ calendar week start — charts may show last week Thu–Mon while comparison is Mon only. Accept for v1 or add one-line subtitle under Plano × Real: *“Segunda a hoje”* (optional micro-copy — only if product wants; not required for logic PR).

---

## 7. Files to inspect

| File | Role |
|---|---|
| `src/store/selectors.ts` | **Primary** — helpers + `selectWeekComparison` |
| `app/(tabs)/index.tsx` | Consumer; no change expected if selector API unchanged |
| `src/components/ComparisonBars.tsx` | Unchanged |
| `src/features/home/selectWeeklyInsights.ts` | Out of scope |
| `src/store/useAppStore.ts` | `getWeekComparison` wrapper |
| `src/types/index.ts` | Confirm no shape change |

---

## 8. Risks

| Risk | Mitigation |
|---|---|
| Trend/history vs comparison window mismatch | Document in result doc; **2D+** aligns trend or adds copy |
| Monday week start vs locale | Matches existing `dayIndex` 0=Seg; document assumption |
| Plan without all dayIndexes | Sum only days present — correct |
| Today = Sunday | `selectWeekToDateDates` = Mon–Sun full week — planned equals full plan if complete |
| Timezone midnight | Noon anchor on date math (existing pattern) |
| Empty plan | Keep `shouldShowWeekComparison` guard |

---

## 9. Out of scope (2D v1)

- `PlannedMeal` / persist / Supabase changes
- `planWeekStart` field
- AI, Edge Functions, meal plan generation, shopping
- Auth, onboarding, profile, Mercados, meal photo flow
- **`WeekDiagnosisCard`** changes
- Aligning **TrendChart** / **Histórico** to calendar week (**2D+**)
- Per-day planned in history rows
- Automated test suite (optional follow-up)

---

## 10. Acceptance criteria

- [ ] `selectWeekComparison` uses `selectWeekToDateDates(todayISO())` for **both** planned and actual.
- [ ] Wednesday + complete plan: planned total = Seg + Ter + Qua plan macros only (**<** full-week sum).
- [ ] Sunday + complete plan: planned total = full week plan (all 7 dayIndexes).
- [ ] Actual sums only logs whose `date` falls in Seg→hoje window.
- [ ] No plan → comparison hidden; no crash.
- [ ] Hoje / `TodayPlanSection` / `InsightCard` unchanged.
- [ ] `WeekDiagnosisCard` unchanged.
- [ ] No persist migration.
- [ ] `npx tsc --noEmit` and `npm run build:web` pass.

---

## 11. Manual test checklist

| # | Today | Logs | Expected Plano × Real |
|---|---|---|---|
| 1 | Qua | Seg–Qua logged | Planned ≈ plan Seg+Ter+Qua; Real ≈ those logs; Plano **lower** than old full-week bar |
| 2 | Qua | only Qua logged | Planned still Seg+Ter+Qua; Real lower — adherence gap visible |
| 3 | Seg | none | Planned = Seg only; Real = 0 |
| 4 | Dom | Seg–Dom logged | Planned = full week; Real = week logs |
| 5 | Qui | no plan | Comparison hidden |
| 6 | Ter | plan with zero macros | Comparison hidden |
| 7 | Any | — | Hoje tab / TodayPlanSection unchanged |
| 8 | Any | — | WeekDiagnosisCard unchanged |
| 9 | Qui | compare to Option A mentally | Rolling-7 mapping would ≈ equal full plan — **not** this behavior |

---

## 12. Follow-up — 2D+ (not v1)

| Item | Notes |
|---|---|
| Align `selectWeekCalorieTrend` + histórico to calendar week or Seg→hoje | Removes rolling vs comparison mismatch |
| Subtitle on Plano × Real: “Segunda a hoje” | Clarifies window without redesign |
| `isoToDayIndex` shared import in home selectors | Dedupe `todayDayIndex()` |
| Persist `mealPlanWeekStart` | Only if weekday mapping proves insufficient |

---

## Success metric

Mid-week, user opens **Semana** and **Plano × Real** reflects **aderência da semana corrente até hoje** — not the full Mon–Sun plan against partial logs.

---

*Revised plan — implementation blocked until Option B is approved.*
