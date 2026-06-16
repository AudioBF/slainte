# Diet Day Alignment — Result

**Status:** Implemented.  
**Plan:** `docs/private/DIET_DAY_ALIGNMENT_PLAN.md`  
**Approach:** A + B + D (default to today, “Hoje” label, guard non-today registration).

---

## Summary

Aligned Dieta with Home Hoje so the diet tab opens on today’s plan day and planned meals from non-today days cannot be accidentally logged as today.

---

## Files changed

| File | Change |
|---|---|
| `src/store/selectors.ts` | Export `todayDayIndex()` via `isoToDayIndex(todayISO())` |
| `src/store/useAppStore.ts` | Default/reset `selectedDietDay` to today; `logPlannedMeal` day guard |
| `src/features/home/selectTodayPlanStatus.ts` | Reuse shared `todayDayIndex()` (dedupe) |
| `src/components/DayPickerRow.tsx` | “(Hoje)” on row subtitle and picker list |
| `app/(tabs)/diet.tsx` | `canRegisterToday`; disable Registrar/Fotografar off-today; hint copy |

---

## Behavior changes

| Area | Before | After |
|---|---|---|
| `selectedDietDay` default | `0` (Monday) | `todayDayIndex()` |
| `setMealPlan` reset | `0` | `todayDayIndex()` |
| `logPlannedMeal` | Always logs with `date: todayISO()` | Returns `false` if `meal.dayIndex !== todayDayIndex()` |
| Dieta non-today | Registrar/Fotografar enabled | Disabled + hint *“Registro disponível apenas para o dia de hoje.”* |
| Day picker | Weekday only | Today shows e.g. `Terça-feira (Hoje)` |

Recipe tap/view on non-today days unchanged. Home `TodayPlanSection` register path unchanged.

---

## Validation

```bash
npx tsc --noEmit
npm run build:web
```

- `npx tsc --noEmit` — passed
- `npm run build:web` — passed

---

## Explicit non-changes

| Area | Status |
|---|---|
| AI / prompts | No change |
| Supabase | No change |
| Edge Functions | No change |
| Meal plan generation | No change |
| Shopping | No change |
| Auth / onboarding / profile / markets | No change |
| Persisted data shape | No change |
| `planWeekStart` | Not added |
| Backfill / register previous day | Not implemented |
| `useFocusEffect` snap-to-today | Not added |

---

## Deferred

- **Option C:** Log planned meals to calendar date matching `dayIndex` in current week (backfill feature).
- **Follow-up:** Date-aware “Registrado ✓” on non-today Dieta rows (`isPlannedMealLoggedForDate`).
