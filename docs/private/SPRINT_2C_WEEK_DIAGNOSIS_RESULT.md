# Sprint 2C — WeekDiagnosisCard Result

**Status:** Implemented. Not committed.  
**Scope:** "Resumo da semana" on Home Semana tab with up to 3 local insights. No AI, no Hoje changes, no store persist changes.

---

## Files changed

| File | Change |
|---|---|
| `src/features/home/selectWeeklyInsights.ts` | **New** — weekly stats, insight bullets, `shouldShowWeekComparison` |
| `src/features/home/WeekDiagnosisCard.tsx` | **New** — compact cream card with bullet list |
| `src/features/home/index.ts` | Export selector, component, helpers |
| `app/(tabs)/index.tsx` | Semana branch only: card above chart; gate ComparisonBars |
| `docs/private/SPRINT_2C_WEEK_DIAGNOSIS_RESULT.md` | This document |

---

## Insights implemented

Window: last 7 calendar days (`selectRecentDates(7)`).

| Rule | When | Example copy |
|---|---|---|
| `logging_consistency` | Always | "Você registrou 4 de 7 dias esta semana." |
| `zero_days_nudge` | 0 days logged | "Poucos registros esta semana. Comece registrando uma refeição por dia." |
| `sparse_week` | 1–2 days logged | Same nudge; no macro/calorie judgment |
| `calorie_average` | 3+ days logged | "Média de 1.950 kcal/dia — 150 abaixo da sua meta." |
| `macro_gap` | 3+ days, deficit &gt;10% on a macro | "Proteína foi o macro mais distante da meta nesta semana." |
| `plan_adherence` | 3+ days, plan exists, plan meals logged, room for 3rd bullet | "5 refeições do cardápio foram registradas esta semana." |

Max **3** bullets per card.

### Plano × Real gating

`ComparisonBars` hidden when:

- `plannedMeals.length === 0`, or
- sum of planned protein + carbs + fat is 0

Chart and Histórico unchanged.

---

## Manual test checklist

| Scenario | Expected | Pass? |
|---|---|---|
| Semana, 0 days logged | Consistency + nudge; no macro/calorie bullets | |
| Semana, 2 days logged | Consistency + sparse nudge only | |
| Semana, 5 days, avg below goal | Consistency + calorie average + optional macro | |
| Semana, 7/7 days | Positive consistency line | |
| No meal plan | ComparisonBars hidden | |
| With meal plan | ComparisonBars visible (if macros &gt; 0) | |
| Hoje tab | No WeekDiagnosisCard | |
| Histórico tap | Still opens Hoje for that day | |
| InsightCard / TodayPlanSection | Unchanged on Hoje | |

---

## Known limitations

1. **`selectWeekComparison` alignment** — still sums full plan vs 7 calendar days; bars may mislead when visible. Documented; not fixed in 2C.
2. **Calorie average includes zero days** — average divides by 7 always, so sparse logging lowers the average mechanically.
3. **Macro gap uses weekly totals** — not per-day majority; simple deficit heuristic.
4. **Plan adherence** — counts `fromPlan` logged meals in window, not strict plannedMealId matching per calendar day.
5. **No `profile.goal` copy variants** — fixed PT-BR strings.

---

## Deferred items

| Item | Target |
|---|---|
| `selectWeekComparisonByDay` | **Sprint 2D** — align plan dayIndex to calendar week for Plano × Real |
| `TrendCaption` under chart | Optional polish |
| InsightCard vs TodayPlanSection dedup | Hoje polish slice |
| AI weekly narrative | Future Edge Function (feature-flagged) |

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

**Sprint 2D — Weekly comparison fix**

- Implement `selectWeekComparisonByDay`
- Optional caption on ComparisonBars
- Re-smoke Semana with plan active mid-week

Or **Hoje polish**: suppress `plan_pending` on InsightCard when `TodayPlanSection` is visible.
