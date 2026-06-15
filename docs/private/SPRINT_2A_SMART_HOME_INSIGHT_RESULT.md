# Sprint 2A — Smart Home InsightCard Result

**Status:** Implemented. Not committed.  
**Scope:** One primary daily insight on the Hoje tab. No AI, no Edge Functions, no store persist changes.

---

## Files changed

| File | Change |
|---|---|
| `src/features/home/types.ts` | **New** — `DailyInsight`, `InsightSeverity` |
| `src/features/home/selectPrimaryDailyInsight.ts` | **New** — rule-based primary insight selector |
| `src/features/home/index.ts` | Export types and selector |
| `src/components/InsightCard.tsx` | **New** — compact insight card with optional CTA |
| `app/(tabs)/index.tsx` | Wire `InsightCard` above calorie/macro card on Hoje (today only) |
| `docs/private/SPRINT_2A_SMART_HOME_INSIGHT_RESULT.md` | This result document |

---

## Rules implemented

Priority order in `selectPrimaryDailyInsight`:

| Priority | Rule ID | Condition | CTA |
|---|---|---|---|
| 1 | `empty_day` | No meals logged today | "Fotografar refeição" → `/meal` |
| 2 | `plan_pending` | Plan exists; next **due** planned meal for today not logged (time ≤ now, or slot fallback) | None |
| 3 | `low_protein` | Protein &lt; 70% of daily goal, **only after 14:00 or ≥2 logged meals** | None |
| 4 | `over_calories` | Calories &gt; 110% of daily goal | None |
| 5 | `on_track` | Remaining calories &gt; 0 | None |
| 6 | `day_complete` | All today's planned meals logged, or all 4 slots filled when no plan | None |

| fallback | `on_track` | At/near calorie goal but day not "complete" | None |

`day_complete` title: **"Diário completo"** — copy emphasizes logging consistency, not nutrition perfection.

`plan_pending` uses `PlannedMeal.time` when parseable (`HH:mm`); otherwise slot-based due hour (breakfast 11h, lunch 15h, snack 20h, dinner 21h).

---

## Review fixes (post-2A)

1. **Low protein gate** — only evaluated after 14:00 or when ≥2 meals logged.
2. **Plan pending** — only suggests unlogged meals whose scheduled time has passed (or slot fallback).
3. **Day complete copy** — reframed as diary/logging consistency.
4. **Render guards** — `viewMode === 'today'` in selector memo; `isToday && dailyInsight` in JSX (Semana and past dates never render).

- `info` — empty day, plan pending
- `warning` — low protein, over calories
- `success` — on track, day complete

---

## UI behavior

- **Hoje mode, today:** `InsightCard` appears above the existing `CalorieRing` / `MacroBar` card.
- **Hoje mode, past dates:** Insight hidden (past-day hint card unchanged).
- **Semana mode:** Unchanged.
- Design: cream card background, left accent border by severity (sage / success / orange).

---

## Manual test notes

_To fill after manual testing:_

| Scenario | Expected insight | Pass? |
|---|---|---|
| Today, zero meals | "Dia ainda sem registros" + CTA | |
| Today, plan exists, breakfast not logged | "{Slot} do plano" | |
| Today, meals logged, protein &lt; 70% goal | "Proteína abaixo do ideal" | |
| Today, calories &gt; 110% goal | "Acima da meta de calorias" | |
| Today, under goal with meals | "No caminho certo" + remaining kcal | |
| Today, all plan meals logged | "Dia registrado" | |
| Past date selected | No insight card | |
| Semana tab | No insight card | |

Screenshots: _add later_

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

## Known limitations

1. **`profileGoal` not used in copy yet** — accepted in selector input for future goal-aware messaging; Sprint 2A uses fixed PT-BR strings.
2. **Plan day mapping** — `dayIndex` 0–6 maps to current weekday (Mon–Sun), same as `selectTodayPlanned`. Mid-week plan generation may misalign day 0 with calendar Monday.
3. **No CTA for plan pending** — user must go to Dieta tab or meal list manually; deferred to Sprint 2B (`TodayPlanSection`).
4. **Low protein threshold is static** — 70% of goal; gated by 14:00 or ≥2 logged meals.
5. **Past days** — insight hidden entirely; no historical diagnosis.
6. **Future plan meals** — before scheduled time, `plan_pending` is suppressed.
7. **No unit tests** — selector is pure and testable; tests not added in this slice.

---

## Next recommended slice

**Sprint 2B — `TodayPlanSection`**

- Show today's planned meals vs logged with `ProgressBar`
- One-tap "Registrar" using existing `logPlannedMeal`
- Optionally add CTA on `plan_pending` insight to log the next planned meal directly

After that: **Sprint 2C — `WeekDiagnosisCard`** on Semana tab.
