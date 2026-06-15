# Sprint 2B — TodayPlanSection Result

**Status:** Implemented. Not committed.  
**Scope:** "Cardápio de hoje" section on Home Hoje tab with plan progress and one-tap register. No AI, no Edge Functions, no store persist changes.

---

## Files changed

| File | Change |
|---|---|
| `src/features/home/selectTodayPlanStatus.ts` | **New** — pure selector for today's plan vs logged |
| `src/features/home/TodayPlanSection.tsx` | **New** — compact section UI |
| `src/features/home/index.ts` | Export selector, component, types |
| `app/(tabs)/index.tsx` | Wire section below macro card on Hoje (today only) |
| `docs/private/SPRINT_2B_TODAY_PLAN_SECTION_RESULT.md` | This result document |

---

## Behavior implemented

### Visibility

Shown only when:

- `viewMode === 'today'`
- `selectedHistoryDate` is today
- `plannedMeals.length > 0`
- At least one planned meal exists for today's `dayIndex` (Mon=0 … Sun=6)

Hidden on Semana mode, past dates, and when there is no active plan for today.

### UI

- **Section:** "Cardápio de hoje"
- **Subtitle:** `"X de Y refeições registradas"`
- **ProgressBar:** logged planned meals / total planned today
- **Next unlogged meal:** slot emoji, time · slot label, name, ~kcal, **Registrar** button
- **All logged:** "Todas as refeições do plano de hoje foram registradas."

### Register action

- Uses existing `logPlannedMeal(meal)` from Zustand store (same as Dieta tab)
- No new persisted fields
- Home updates via existing store reactivity (logged count, next meal, insight card)

### Placement

Below calorie/macro card, above "Refeições de hoje" list — matches Sprint 2 plan layout.

---

## Manual test checklist

| Scenario | Expected | Pass? |
|---|---|---|
| Hoje, no meal plan | Section hidden | |
| Hoje, plan exists, 0 of N registered | Progress 0/N, next meal + Registrar | |
| Tap Registrar | Meal appears in list below; progress updates | |
| Tap Registrar again on same meal (Dieta) | Disabled / no duplicate | |
| All plan meals registered | Success copy, no Registrar button | |
| Semana tab | Section not visible | |
| Past date on Hoje | Section not visible | |
| InsightCard + TodayPlanSection together | Both visible when plan exists | |

Screenshots: _add after manual test_

---

## Known limitations

1. **Next meal order** — shows first unlogged planned meal by slot order, not time-aware filtering. Future meals before their scheduled time may still appear (acceptable for Sprint 2B; InsightCard already uses time-aware `plan_pending`).
2. **dayIndex mapping** — same as Dieta/Home insight: `dayIndex` 0–6 maps to current weekday; mid-week plan generation may misalign calendar days.
3. **No recipe link** — tapping the meal row does not open recipe (Dieta tab still owns full meal cards).
4. **No Fotografar shortcut** — only quick register; photo flow remains on Dieta or "+ Nova".

---

## Validation

```bash
npx tsc --noEmit
npm run build:web
```

Results:

- `npx tsc --noEmit` — passed
- `npm run build:web` — passed

---

## Next recommended slice

**Sprint 2C — WeekDiagnosisCard** on Semana tab:

- 2–3 bullet weekly insights (local rules)
- Optional `selectWeekComparisonByDay` fix for "Plano × Real" alignment
- `TrendCaption` one-liner under chart (nice-to-have)

Do not start 2C until 2B is deployed and smoke-tested on production.
