# Sprint 2P — Home Hoje Dedup Polish Result

**Status:** Implemented. Not committed.  
**Scope:** Reduce duplicated guidance on Home Hoje only. No Semana, store, or Edge Function changes.

---

## Files changed

| File | Change |
|---|---|
| `src/features/home/selectPrimaryDailyInsight.ts` | `skipPlanPending` flag; extract `selectNonPlanInsight` |
| `app/(tabs)/index.tsx` | Hide FAB when InsightCard has photo CTA; pass `skipPlanPending` when TodayPlanSection shows next meal |
| `docs/private/SPRINT_2P_HOME_DEDUP_POLISH_RESULT.md` | This document |

---

## Behavior changed

### 1. Empty day CTA dedup

**Before:** Home Hoje with zero meals showed both InsightCard button "Fotografar refeição" and fixed `PrimaryActionBar` with the same label.

**After:** When `dailyInsight.actionRoute` is set (empty day → `/meal`), the bottom FAB is hidden. One clear action remains on the InsightCard.

### 2. Plan pending dedup

**Before:** With an active plan, InsightCard could show `plan_pending` ("Café da manhã do plano…") while TodayPlanSection showed the same pending meal with Registrar.

**After:** When `todayPlanStatus.nextUnlogged` exists (TodayPlanSection visible with a pending meal), `selectPrimaryDailyInsight` receives `skipPlanPending: true` and falls through to macro/calorie insights (`low_protein`, `over_calories`, `fat_high`, `on_track`, etc.).

**Note:** TodayPlanSection uses slot order for next meal; InsightCard `plan_pending` used time-aware `isPlannedMealDue`. Dedup applies whenever the plan section shows any next unlogged meal — acceptable for polish.

---

## Manual test checklist

| Scenario | Expected | Pass? |
|---|---|---|
| Hoje, 0 meals | InsightCard CTA only; **no** bottom FAB | |
| Hoje, plan + pending meal | TodayPlanSection + Registrar; InsightCard **not** plan_pending | |
| Hoje, plan + pending, low protein | InsightCard shows protein warning (if rules apply) | |
| Hoje, plan + pending, no macro issue | InsightCard shows "No caminho certo" / remaining kcal | |
| Hoje, plan all logged | No TodayPlanSection pending row; InsightCard may show plan_pending if due (time-aware) | |
| Hoje, meals logged, no plan | InsightCard unchanged; no FAB unless empty day | |
| Semana tab | Unchanged | |

---

## Known limitations

1. **Time-aware mismatch** — TodayPlanSection may show a future slot while skipped InsightCard would have waited for `isPlannedMealDue`; user sees plan in section earlier than InsightCard would have nudged — intentional tradeoff.
2. **Empty day without InsightCard** — if insight ever failed to render, FAB would return; not an issue with current rules.
3. **No dedup between InsightCard empty message and TodayPlanSection** — empty day has no plan section; N/A.

---

## Validation

```bash
npx tsc --noEmit
npm run build:web
```

Results:

- `npx tsc --noEmit` — passed
- `npm run build:web` — passed
