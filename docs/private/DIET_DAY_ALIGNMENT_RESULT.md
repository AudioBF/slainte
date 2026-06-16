# Diet Day Alignment — Result

**Status:** Completed.  
**Plan:** `docs/private/DIET_DAY_ALIGNMENT_PLAN.md`  
**Commit:** `fix(diet): align selected plan day with today`

---

## Summary

Aligned Dieta with Home Hoje so the diet tab opens on today’s plan day and planned meals from non-today days cannot be accidentally logged as today. Smoke-tested on a Tuesday session: Dieta showed **Terça-feira (Hoje)**, Home and Dieta plans matched, non-today days were view-only for registration, and today registration updated both Cardápio de hoje progress and Refeições de hoje.

---

## Implemented approach

### A — Dieta defaults to today’s `dayIndex`

- Store initial `selectedDietDay` uses `todayDayIndex()` instead of `0` (Monday).
- `setMealPlan` resets `selectedDietDay` to `todayDayIndex()` after plan generation.
- No `useFocusEffect` snap-to-today on every tab visit (session browsing preserved).

### B — DayPicker shows “(Hoje)”

- `DayPickerRow` subtitle and picker list append **(Hoje)** when the day equals `todayDayIndex()`.
- Example: `Terça-feira (Hoje)`.

### D — Non-today Registrar/Fotografar disabled + `logPlannedMeal` guard

- `canRegisterToday = selectedDietDay === todayDayIndex()` in Dieta.
- Off-today: **Registrar** and **Fotografar** disabled; hint *“Registro disponível apenas para o dia de hoje.”*
- `logPlannedMeal` early-returns `false` when `meal.dayIndex !== todayDayIndex()` (defense in depth for Home and future callers).
- Recipe tap/view remains available on all days.

---

## Files changed

| File | Change |
|---|---|
| `src/store/selectors.ts` | Export `todayDayIndex()` as `isoToDayIndex(todayISO())` |
| `src/store/useAppStore.ts` | Default/reset `selectedDietDay` to today; `logPlannedMeal` day guard |
| `src/features/home/selectTodayPlanStatus.ts` | Import shared `todayDayIndex()` (remove local duplicate) |
| `src/components/DayPickerRow.tsx` | “(Hoje)” label on row and picker |
| `app/(tabs)/diet.tsx` | `canRegisterToday`, disabled buttons, hint copy |

---

## Behavior before

- Dieta defaulted to **Monday** (`selectedDietDay: 0`).
- `setMealPlan` reset `selectedDietDay` to **Monday**.
- `logPlannedMeal` always stamped `date: todayISO()`.
- Non-today planned meals could be logged as today → phantom entry in Refeições de hoje without updating Cardápio de hoje progress.

---

## Behavior after

- Dieta opens on **calendar today** (`todayDayIndex()`).
- `setMealPlan` resets to **calendar today**.
- `logPlannedMeal` rejects `meal.dayIndex !== todayDayIndex()`.
- Non-today **Registrar** and **Fotografar** are disabled with PT-BR hint.
- Recipe view remains available on all days.
- Home `TodayPlanSection` register path unchanged.

---

## Smoke test result

| Check | Result |
|---|---|
| Dieta opened on today | **Terça-feira (Hoje)** |
| Home vs Dieta plan alignment | Same today meals/macros |
| Non-today day selected | Registrar/Fotografar disabled; hint shown |
| Today registration from Dieta | Worked; toast appeared |
| Home Cardápio de hoje | Progress updated |
| Home Refeições de hoje | New meal listed |
| Semana view | Still worked |

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
| AI | No change |
| Supabase | No change |
| Edge Functions | No change |
| Meal plan generation | No change |
| Shopping | No change |
| Persisted data shape | No change |
| `planWeekStart` | Not added |
| Backfill registration | Not implemented |
| `useFocusEffect` snap-to-today | Not added |

---

## Known follow-up

- Consider disabling **Fotografar** when a today planned meal is already registered, to avoid accidental duplicate logging via the photo flow (`plannedId` deep link).
