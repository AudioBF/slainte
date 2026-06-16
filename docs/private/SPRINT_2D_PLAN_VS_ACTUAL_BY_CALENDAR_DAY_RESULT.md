# Sprint 2D — Plano × Real by Calendar Day Result

**Status:** Implemented. Not committed in this doc step.  
**Plan:** `docs/private/SPRINT_2D_PLAN_VS_ACTUAL_BY_CALENDAR_DAY_PLAN.md` (revised — Option B approved)  
**Scope:** Selector-only fix for **Plano × Real** on Hoje → **Semana**. No persist or UI layout changes.

---

## Summary

Sprint 2D v1 fixes misleading **Plano × Real** comparison bars. Previously, **Planned** summed the full Mon–Sun meal plan while **Actual** used rolling last-7-day logs — especially inflated mid-week.

**Option B** implemented: both sides now use **current calendar week-to-date** (Segunda through hoje, inclusive), mapped via `dayIndex` without storing dates on `PlannedMeal`.

---

## Decision implemented

**Option B — current week-to-date (Segunda até hoje)**

Rejected for v1:

- **Option A** (rolling 7 days + per-date mapping) — mathematically ≈ full plan for complete plans; does not fix mid-week bar.
- **Option C** (copy only) — does not fix adherence UX.

---

## Files changed

| File | Change |
|---|---|
| `src/store/selectors.ts` | New date/plan helpers; `selectWeekComparison` rewritten |
| `docs/private/SPRINT_2D_PLAN_VS_ACTUAL_BY_CALENDAR_DAY_RESULT.md` | This document |

**Only code file:** `src/store/selectors.ts`

---

## Helpers added

| Helper | Purpose |
|---|---|
| `isoToDayIndex(iso)` | Mon=0 … Sun=6; matches `PlannedMeal.dayIndex`; `T12:00:00` anchor |
| `startOfWeekMonday(iso)` | ISO date of Monday in the week containing `iso` |
| `selectWeekToDateDates(endDate?)` | `[Monday, …, endDate]` inclusive (default `todayISO()`) |
| `selectPlannedForDate(plannedMeals, date)` | Sum plan macros for `dayIndex(isoToDayIndex(date))` |

`selectTodayPlanned` now delegates to `selectPlannedForDate(..., todayISO())` — same behavior, shared path.

---

## Behavior before

| Side | Window |
|---|---|
| **Planned** | Sum of **all** `plannedMeals` (full Mon–Sun abstract plan) |
| **Actual** | Logged meals in `selectRecentDates(7)` (rolling last 7 calendar days) |

Mid-week: Plano bar reflected a **full week** of planned macros vs partial logs.

---

## Behavior after

| Side | Window |
|---|---|
| **Planned** | Sum of plan macros for **Monday → today** (each day via `isoToDayIndex`) |
| **Actual** | Logged meals whose `date` falls in the **same** Monday → today window |

Examples:

- **Quarta:** planned = Seg + Ter + Qua plan slots only.
- **Segunda:** planned = Seg only.
- **Domingo:** planned = full Mon–Sun plan (if all dayIndexes populated).

---

## Validation

```bash
npx tsc --noEmit
npm run build:web
```

- `npx tsc --noEmit` — passed
- `npm run build:web` — passed
- Sanity: `selectWeekToDateDates('2026-06-10')` → `['2026-06-08', '2026-06-09', '2026-06-10']` (Wed + Mon/Tue in same week)

---

## Explicit non-changes

| Area | Status |
|---|---|
| `PlannedMeal` shape | No change |
| `LoggedMeal` shape | No change |
| Zustand persisted shape | No change |
| Supabase | No change |
| AI / Edge Functions / prompts | No change |
| UI layout / copy | No change |
| `WeekDiagnosisCard` | Unchanged (profile goals) |
| `TrendChart` | Unchanged (rolling 7 days) |
| Histórico da semana | Unchanged (rolling 7 days) |
| `ComparisonBars` API | Unchanged `{ planned, actual }` |
| Shopping | Untouched |

---

## Known v1 mismatch (intentional — 2D+)

| Component | Window |
|---|---|
| **Plano × Real** | Calendar week **Seg → hoje** |
| **TrendChart** | Rolling `selectRecentDates(7)` |
| **Histórico da semana** | Rolling `selectRecentDates(7)` |

Align trend/history to calendar week or add clarifying copy in **2D+**.

---

## Next recommended slice

**Meal review sticky footer polish** — small, safe UX win.  
Defer **Meal plan Edge rollout** until Gemini quota is stable.

Optional: **Shopping 3C+** collapsible Comprados; **2D+** calendar-week trend alignment.

---

*Result doc only. No app code changed in this step.*
