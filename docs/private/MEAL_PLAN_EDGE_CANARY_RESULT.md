# Meal Plan Edge Canary Execution v1 — Result

**Status:** Executed — **not full PASS** (Phase C PARTIAL/NO-GO); production unchanged  
**Date:** 2026-06-20  
**Sprint:** Meal Plan Edge Canary Execution v1  
**Prep doc:** `docs/private/MEAL_PLAN_EDGE_CANARY_PREP_V1.md`  
**Production:** https://slainte-sigma.vercel.app — `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=false` (unchanged)

---

## 1. Objective

Execute controlled Edge Meal Plan canary (Phases A–C) without changing production default or Vercel Production env.

---

## 2. Flag state

| Location | Value |
|---|---|
| Local `.env` (commitável) | `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=false` |
| Production bundle | `entry-9123752…` → `useEdgeMealPlan:!1` |
| Preview build (local only) | `dist-preview-edge/` → `useEdgeMealPlan:!0` (controlled test) |
| Vercel Production env | **Not modified** this sprint |
| Edge Function deploy | **None** (no approval requested) |

---

## 3. Phase A — Edge direct smoke

**Command:** `node scripts/smoke-meal-plan-budget.mjs 5 --delay 10000`  
**Timestamp:** 2026-06-20T23:11:33Z  
**Raw output (local, not committed):** `docs/private/.meal-plan-budget-smoke.json`

### Per-run results

| Run | HTTP | Duration (ms) | plannedMeals | recipes | TIMEOUT | 504 HTML | Notes |
|---|---|---|---|---|---|---|---|
| 1 | 200 | 41 451 | 21 | 0 | — | — | OK |
| 2 | 200 | 29 600 | 28 | 0 | — | — | OK |
| 3 | 200 | 42 716 | 21 | 0 | — | — | OK |
| 4 | 200 | 34 748 | 21 | 0 | — | — | OK |
| 5 | 200 | 49 141 | 35 | 0 | — | — | OK |

### Summary

| Metric | Value | Criterion | Pass |
|---|---|---|---|
| Success rate | **5/5** | 5/5 | ✅ |
| P95 duration | **49 141 ms (~49 s)** | < 120 s | ✅ |
| `lightweightOk` | true (recipes 0, meals ≥ 21 on all successes) | yes | ✅ |
| Structured TIMEOUT | 0 | 0 | ✅ |
| GEMINI_UNAVAILABLE (final) | 0 | 0 | ✅ |
| QUOTA_EXCEEDED | 0 | 0 | ✅ |
| Platform 504 HTML | 0 | 0 | ✅ |
| Shopping chain (sample plan) | **43 items** | 30–50 | ✅ |

### Phase A decision: **GO**

Edge `generate-meal-plan` is reliable in direct smoke at current deploy — significant improvement vs Phase 4 production canary (~150 s failures).

---

## 4. Phase B — Preview UI (flag on, local controlled build)

**Environment:** `dist-preview-edge/` served at `http://127.0.0.1:62212`  
**Build:** `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=true` + `expo export --clear --output-dir dist-preview-edge`  
**Bundle verified:** `useEdgeMealPlan:!0`  
**Account:** `slainte.phase3b.ui+1781627000000@example.com` (Supabase auth injected for UI test)

### UI generation (1 run)

| Field | Result |
|---|---|
| `generate-meal-plan` called | ✅ |
| HTTP | **200** |
| Wall-clock (UI) | **~35.7 s** |
| plannedMeals | **21** |
| recipes | **0** |
| summary | present |
| UI error banner | none |
| Edge path in network | confirmed (`ok:true`, `recipes:[]`) |

### Phase B decision: **GO**

Single controlled UI run passed all Phase B criteria. (Prep doc recommends **5/5** UI runs before any future production flag decision — not done this sprint.)

---

## 5. Phase C — Core chain (preview UI)

Executed after Phase B plan populated store.

| Step | Result | Detail |
|---|---|---|
| 1. Edge meal plan (preview) | ✅ | Same session as Phase B |
| 2. Shopping — UI **Gerar da semana** | ❌ | `generate-shopping-list` **HTTP 400** — `BAD_REQUEST` / *Invalid request body.* |
| 3. Shopping — isolated smoke | ✅ | `node scripts/smoke-shopping-quality.mjs` → **48 items** from Edge `plannedMeals` (~5 s) |
| 4. Recipe on demand | ✅ | `generate-recipe` **HTTP 200**; 1 recipe in store (~45 s) |
| 5. Register planned meal | ✅ | 1 `loggedMeals` entry before refresh |
| 6. Hoje macros | ✅ | Home screen shows logged/consumed content |
| 7. Refresh persistence | ⚠️ partial | **plannedMeals: 21** retained; **loggedMeals: 0** after reload (likely cloud sync pull on signed-in test account) |
| 8. Recipes not shopping source | ✅ | Shopping generator uses `plannedMeals` when plan exists; no recipe-batch path used |
| 9. Shopping uses plannedMeals | ✅ (API) | Isolated smoke confirms; UI step failed before list populated |

### Phase C decision: **PARTIAL NO-GO**

Core chain **not fully green in UI automation** due to shopping 400 in the automated session. Isolated shopping smoke immediately after shows the Edge shopping path still works with Edge-generated plans — suggests UI/session/timing or payload edge case in the automated run, not a systemic Shopping regression.

---

## 6. Errors found

| Error | Where | Impact |
|---|---|---|
| None (Phase A) | Edge direct | — |
| None (Phase B UI plan) | Dieta generate | — |
| `BAD_REQUEST` / Invalid request body | Phase C UI → `generate-shopping-list` | Shopping list not populated in UI run |
| loggedMeals cleared on refresh | Phase C after reload | Sync/pull behavior on diag account; plan persisted |

No `TIMEOUT`, `GEMINI_UNAVAILABLE`, `QUOTA_EXCEEDED`, or platform 504 HTML observed in Phase A or B.

---

## 7. Timings

| Phase | P95 / key duration |
|---|---|
| Phase A (Edge direct) | P95 **49.1 s** (range 29.6–49.1 s) |
| Phase A shopping chain | 43 items from sample plan |
| Phase B UI plan | **35.7 s** |
| Phase C recipe on demand | **~45 s** |
| Isolated shopping smoke | **~5 s** (48 items) |

---

## 8. Counts

| Metric | Phase A (5 runs) | Phase B UI | Phase C UI |
|---|---|---|---|
| plannedMeals | 21–35 per run | 21 | 21 after refresh |
| recipes in plan | 0 all runs | 0 | 0 in plan (+1 on-demand recipe) |
| shopping items | 43 (chain) | — | 0 (UI fail); 48 (isolated smoke) |

---

## 9. Impact summary

| Area | Impact |
|---|---|
| **Shopping** | Edge API OK in Phase A chain + isolated smoke; UI automated chain hit 400 once |
| **Hoje** | Register + display OK in preview session |
| **Refresh / persistence** | Meal plan persisted locally; logged meal lost on refresh when signed in (sync) |
| **Production** | **No change** — still client Gemini |

---

## 10. Final GO/NO-GO

| Gate | Decision |
|---|---|
| Phase A (Edge direct 5/5) | **GO** |
| Phase B (preview UI 1/1) | **GO** (extend to 5/5 before prod flag) |
| Phase C (full UI core chain) | **NO-GO** (shopping UI step) |
| Enable Edge on production | **NO-GO** — keep `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=false` |

---

## 11. Recommendation

1. **Continue client Gemini as production default** — no Vercel Production env change.
2. **Edge meal plan is technically much healthier** than Phase 4 (5/5 direct, ~49 s P95, preview UI 200 in ~36 s).
3. **Repeat / debug Phase C shopping in preview** — capture request body on 400; consider manual preview run or hardened UI smoke (auth + sync settle time).
4. **Before any production flag:** 5/5 preview UI meal plans + full core chain green + explicit approval sprint.
5. **Optional:** Supabase Edge logs for shopping 400 `requestId` if issue reproduces.

**Do not** enable production flag based on this sprint alone.

---

## 12. Rollback / safety

| Check | Status |
|---|---|
| `.env` flag false | ✅ |
| Production bundle `useEdgeMealPlan:!1` | ✅ verified live |
| Vercel Production env untouched | ✅ |
| No Edge deploy | ✅ |
| Client fallback intact | ✅ |

---

## 13. Out of scope (honored)

No production flag change, no Vercel prod env edit, no Edge deploy, no app/store/schema/prompt changes, no Shopping/Recipe/Hoje code changes.

---

## 14. Validation commands (post-sprint)

```powershell
npx.cmd tsc --noEmit          # PASS
npm run build:web             # PASS
Select-String -Path .env -Pattern '^EXPO_PUBLIC_USE_EDGE_MEAL_PLAN='
# EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=false
```

---

## 15. Local artifacts (do not commit)

- `docs/private/.meal-plan-budget-smoke.json`
- `dist-preview-edge/`
- `dist/` (build output)
- Other untracked smokes JSON / temp scripts

---

## 16. Next sprint suggestion

**Meal Plan Edge Canary Phase C Fix v1** — reproduce shopping 400 in preview with HAR/body logging; 5/5 preview UI runs; confirm refresh/sync behavior for logged meals; production decision still separate.
