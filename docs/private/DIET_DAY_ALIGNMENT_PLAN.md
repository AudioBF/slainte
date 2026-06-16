# Diet Day Alignment — Plan

**Status:** Planning only. No app code changed.  
**Goal:** Align Dieta day selection and planned-meal registration with calendar-day expectations so Home Hoje and Dieta never feel like they refer to different “today.”

---

## 1. Objective

Ensure that:

1. **Dieta opens on the calendar day that matches Home Hoje** (same `dayIndex` as today).
2. **Registering a planned meal from Dieta only logs meals for today** — never silently attaches a Monday plan item to Tuesday’s log.

No changes to meal plan generation, AI, Supabase, Shopping, Auth, or persisted data shape unless proven necessary.

---

## 2. Current behavior

### Day model

| Concept | Implementation |
|---|---|
| `PlannedMeal.dayIndex` | `0` = Seg … `6` = Dom; no calendar date on the plan |
| `LoggedMeal.date` | ISO `YYYY-MM-DD` — the actual calendar day logged |
| Home “Cardápio de hoje” | `selectTodayPlanStatus` filters `plannedMeals` where `dayIndex === todayDayIndex()` |
| Dieta “Cardápio” | Filters `plannedMeals` where `dayIndex === selectedDietDay` |

### `selectedDietDay` (ephemeral, not persisted)

- Initial store value: **`0` (Monday)** — `useAppStore.ts`
- `setMealPlan` also resets to **`0`** after plan generation
- User can change via `DayPickerRow`; choice survives tab switches within the session but not app restart

### Home Hoje (`app/(tabs)/index.tsx`)

- `TodayPlanSection` receives `selectTodayPlanStatus(loggedMeals, plannedMeals)`
- Uses local `todayDayIndex()` in `selectTodayPlanStatus.ts` (Mon=0 logic, duplicates `isoToDayIndex(todayISO())` in `selectors.ts`)
- `onRegister` calls `logPlannedMeal` directly — always registers **today’s** planned meals only (UI only offers `nextUnlogged` from today’s list)

### Dieta (`app/(tabs)/diet.tsx`)

- `dayMeals = plannedMeals.filter(m => m.dayIndex === selectedDietDay)`
- `isPlannedMealLoggedToday(loggedMeals, meal.id)` — checks if `plannedMealId` exists in logs with **`date === todayISO()`**
- `handleRegisterPlannedMeal` → `logPlannedMeal(meal)` with no day guard

### `logPlannedMeal` (`useAppStore.ts`)

```ts
const today = todayISO();
// ...
logged: { date: today, plannedMealId: meal.id, fromPlan: true, ... }
```

Always stamps **`todayISO()`** regardless of `meal.dayIndex` or `selectedDietDay`.

### Sprint 2D helpers (`selectors.ts`) — relevant but unused by Dieta today

- `isoToDayIndex(iso)` — Mon=0 … Sun=6
- `startOfWeekMonday(iso)` — Monday of the week containing `iso`
- `selectPlannedForDate(plannedMeals, date)` — macros for a calendar date via `dayIndex`
- `selectWeekToDateDates(endDate)` — Mon→`endDate` ISO list (used by week comparison, not Dieta)

---

## 3. Smoke test finding

**Scenario:** User opened Dieta on **Monday** while the calendar day was **Tuesday**.

| Screen | What user saw |
|---|---|
| Home Hoje | Tuesday’s planned meals (“Cardápio de hoje”) |
| Dieta | Monday’s planned meals (picker showed “Segunda-feira”) |

**Confusion:** Two tabs both feel like “my plan today” but show different days.

**Higher-risk scenario:** User taps **Registrar** on a Monday meal while today is Tuesday.

| Effect | Result |
|---|---|
| `LoggedMeal.date` | Tuesday (today) |
| Home “Refeições de hoje” | Meal appears (logged today) |
| Home “Cardápio de hoje” progress | Does **not** count — progress tracks **Tuesday** `plannedMealId`s only |
| Dieta Monday card | Shows “Registrado ✓” (`isPlannedMealLoggedToday` matches `plannedMealId` + today’s date) |

Net: phantom log — counted in daily macros but disconnected from today’s plan progress.

---

## 4. Root cause hypothesis

Two independent bugs sharing one mental model gap (**weekday index ≠ “today”**):

1. **Default selection drift:** `selectedDietDay` defaults to `0` and `setMealPlan` forces `0`. Home always derives today from the calendar; Dieta does not. On Tuesday (or any non-Monday), Dieta opens on the wrong day unless the user manually re-picks.

2. **Registration date ignores plan day:** `logPlannedMeal` always writes `date: todayISO()`. Dieta exposes Registrar for **any** `selectedDietDay`, so non-today plan items can be logged against today’s calendar date.

`isPlannedMealLoggedToday` naming reinforces the bug — it answers “logged **today**” not “logged on **this plan day’s calendar date**,” so Monday cards show ✓ after a wrong-day registration.

---

## 5. Options compared

### A) Dieta opens on today’s `dayIndex` by default only

**Change:** Initialize `selectedDietDay` to `isoToDayIndex(todayISO())`; `setMealPlan` sets today’s index instead of `0`. Do **not** reset on every tab focus (preserve browsing other days within session).

| Pros | Cons |
|---|---|
| Smallest UX fix for Home/Dieta mismatch | Does not stop wrong-day Registrar if user switches to Monday |
| No persist shape change | `todayDayIndex()` still duplicated in home vs selectors |
| Matches Home mental model on open | Midnight edge: session started yesterday keeps old selection (acceptable) |

### B) A + label selected day as “Hoje” when applicable

**Change:** `DayPickerRow` subtitle e.g. `Terça-feira (Hoje)` or trailing “Hoje” when `value === isoToDayIndex(todayISO())`. Optional: same marker in picker list.

| Pros | Cons |
|---|---|
| Makes alignment visible; low effort | Cosmetic — does not fix registration alone |
| Reuses `formatDateLabel` pattern (`'Hoje'`) | Slight copy decision for picker vs row |

### C) `logPlannedMeal` logs to calendar date matching `meal.dayIndex` in current week

**Change:** `date = offsetDate(startOfWeekMonday(todayISO()), meal.dayIndex)`; duplicate check uses that date.

| Pros | Cons |
|---|---|
| Enables intentional backfill (register Monday’s meal on Tuesday → logs Monday) | **Opposite of smoke-test fix** if user mis-taps — creates past-dated logs |
| Aligns log date with plan weekday | Home “Refeições de hoje” won’t show it; Histórico behavior changes |
| Uses existing Sprint 2D helpers | Broader product question: is backfill desired? |

### D) Disable or alter “Registrar” for non-today selected days

**Change:** In `diet.tsx`, hide/disable Registrar (and optionally “Fotografar” with `plannedId`) when `selectedDietDay !== isoToDayIndex(todayISO())`. Belt-and-suspenders: `logPlannedMeal` returns `false` if `meal.dayIndex !== isoToDayIndex(todayISO())`.

| Pros | Cons |
|---|---|
| **Directly prevents wrong-day phantom logs** | No retroactive registration from Dieta for past plan days |
| Store guard protects Home path too | Need short PT-BR hint on disabled state (optional) |
| No persist shape change | “Fotografar” path may still need same guard if it logs via plan id |

### Combination matrix

| Combo | Fixes open mismatch | Fixes wrong-day log | Complexity |
|---|---|---|---|
| A | ✓ | ✗ | Low |
| A + B | ✓ (clearer) | ✗ | Low |
| A + D | ✓ | ✓ | Low–medium |
| A + B + D | ✓ | ✓ | Low–medium (**recommended**) |
| C alone | ✗ | ✗ (worse for accidents) | Medium |
| C + D | partial | conflicting semantics | High — avoid |

---

## 6. Recommended smallest implementation

**Ship A + B + D** (no C in this slice).

### A — Default to today

- `useAppStore` initial `selectedDietDay`: `isoToDayIndex(todayISO())`
- `setMealPlan`: set `selectedDietDay` to today’s index, not `0`
- Export a single `todayDayIndex()` from `selectors.ts` (alias `isoToDayIndex(todayISO())`); migrate `selectTodayPlanStatus.ts` to use it (dedupe only, no behavior change)

### B — “Hoje” label

- `DayPickerRow`: when `value === todayDayIndex()`, append ` (Hoje)` to subtitle; mark option in sheet similarly

### D — Guard registration

- **`diet.tsx`:** `canRegisterToday = selectedDietDay === todayDayIndex()`; disable Registrar when `!canRegisterToday` (keep recipe view enabled)
- **`logPlannedMeal`:** early return `false` if `meal.dayIndex !== isoToDayIndex(todayISO())` — defense in depth for Home `TodayPlanSection` and future callers
- Optional caption under day picker when not today: *“Registro disponível apenas para o dia de hoje.”*

**Explicitly defer C** (week-offset log date) to a future “registrar dia anterior” feature with deliberate UX.

**Do not** add `useFocusEffect` to snap Dieta back to today on every visit — that would fight intentional day browsing.

---

## 7. Files likely to touch

| File | Change |
|---|---|
| `src/store/selectors.ts` | Export `todayDayIndex()`; reuse in guards |
| `src/store/useAppStore.ts` | Initial `selectedDietDay`; `setMealPlan` default; `logPlannedMeal` guard |
| `app/(tabs)/diet.tsx` | Disable Registrar when not today; optional hint copy |
| `src/components/DayPickerRow.tsx` | “Hoje” label when selected day is today |
| `src/features/home/selectTodayPlanStatus.ts` | Import `todayDayIndex` from selectors (dedupe) |

**Not expected:** `index.tsx`, `TodayPlanSection.tsx`, types, Supabase, AI, Shopping, persist schema.

---

## 8. Risks

| Risk | Mitigation |
|---|---|
| User wants to register yesterday’s missed plan meal from Dieta | Out of scope; document deferral of C; Histórico / future backfill flow |
| `isPlannedMealLoggedToday` still misleads on non-today Dieta rows | After D, Registrar disabled off-today; logged state on past days is view-only (could later add `isPlannedMealLoggedForDate`) |
| Midnight while app open | `selectedDietDay` may be “yesterday” until user switches tabs or restarts — acceptable; no auto-snap on focus in v1 |
| Duplicate `todayDayIndex` during migration | Single export from `selectors.ts` in same PR |
| “Fotografar” with `plannedId` from non-today day | Verify `meal.tsx` / `confirmPhotoMeal` path; apply same today guard if it links to plan |

---

## 9. Out of scope

- Meal plan generation, AI prompts, Edge Functions
- Supabase schema or sync
- Shopping, Auth, onboarding, profile, markets
- Persisting `selectedDietDay` across sessions
- Calendar-week rollover when plan spans multiple weeks (plan is weekday-indexed only)
- Retroactive / backfill registration (option C)
- Changing `isPlannedMealLoggedToday` to date-aware checks on Dieta off-today views (nice-to-have follow-up)
- Sprint 2D+ TrendChart / Histórico week alignment

---

## 10. Acceptance criteria

1. Fresh app open on Tuesday: Dieta day picker shows **Terça-feira** (with **Hoje** label), same logical day as Home “Cardápio de hoje.”
2. After generating a new meal plan on any weekday: Dieta opens on **that** weekday, not Monday.
3. With Dieta on a **non-today** day: **Registrar** is disabled (or hidden); no new `LoggedMeal` is created from Dieta.
4. With Dieta on **today**: Registrar works; meal appears in both “Refeições de hoje” and “Cardápio de hoje” progress.
5. Home `TodayPlanSection` Registrar still works and only accepts today’s planned meals.
6. `logPlannedMeal` rejects `meal.dayIndex !== todayDayIndex()` even if called programmatically.
7. No changes to persisted JSON shape or sync payloads.

---

## 11. Manual smoke test checklist

**Setup:** Active meal plan with meals on multiple weekdays. Note today’s weekday.

### Default alignment

- [ ] Open app (or hard refresh PWA). Go to Home — note “Cardápio de hoje” meals.
- [ ] Open Dieta — day picker matches today’s weekday; shows **Hoje**.
- [ ] Meal names/macros match Home for the same slots.

### Plan generation

- [ ] Generate new plan (if quota allows). Dieta lands on **today**, not Segunda.

### Non-today browsing

- [ ] In Dieta, pick **yesterday’s** weekday (or any non-today).
- [ ] Planned meals for that day display; **Registrar** disabled.
- [ ] Tap Registrar — nothing logged; no toast; no new row in Home “Refeições de hoje.”

### Today registration

- [ ] Select **Hoje** in Dieta. Register one planned meal.
- [ ] Toast + haptic fire. Button shows “Registrado ✓”.
- [ ] Home “Cardápio de hoje” progress increments.
- [ ] Home “Refeições de hoje” lists the same meal.

### Home path unchanged

- [ ] From Home, register next unlogged meal via “Cardápio de hoje.”
- [ ] Same success behavior; Dieta today view shows ✓ for that meal.

### Regression

- [ ] Recipe tap / Fotografar still work on non-today days (view-only).
- [ ] Shopping tab unaffected.
- [ ] Web PWA and native (if available): label and disabled state render correctly.
