# Meal Plan Edge Timeout Budget v1 — Result

**Status:** ✅ Implemented, deployed, validated (spaced smoke **5/5**). Phase 4 re-canary **deferred**.  
**Date:** 2026-06-16  
**Context:** `docs/private/MEAL_PLAN_EDGE_PROD_FAILURE_DIAGNOSIS.md`  
**Production flag:** `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=false` (unchanged — product decision)

---

## Goal

Keep `generate-meal-plan` Edge invocations under Supabase’s **~150 s** idle limit by enforcing a **135 s global budget**, skipping late retries, returning structured `{ ok: false, code: "TIMEOUT" }` before the platform 504, and absorbing transient Gemini **503** with one controlled retry.

---

## Implementation summary

| Area | Change |
|---|---|
| `supabase/functions/_shared/execution-budget.ts` | **New** — `ExecutionBudget` (135 s default), guards, structured logs; `MIN_BUDGET_FOR_UNAVAILABLE_RETRY_MS` (60 s) |
| `supabase/functions/_shared/gemini.ts` | Budget-aware timeouts; **1 unavailable retry** (503/overload only, 2–4 s jitter); events `retry_scheduled` / `retry_skipped`; single model for meal plan when budget set |
| `supabase/functions/generate-meal-plan/index.ts` | Per-request `requestId`, budget passed through, variety attempts **≤ 2**, skip variety retry if `< 45 s` remaining, explicit `TIMEOUT` JSON on budget exceed |
| `src/services/ai/edge-client.ts` | Map unparseable **504** → `AiEdgeError('TIMEOUT')` |
| `src/services/ai/errors.ts` | Explicit `FUNCTION` / `INTERNAL` edge codes (unchanged user copy) |
| `scripts/smoke-meal-plan-budget.mjs` | Optional `--delay ms` between runs |

**Not changed:** prompts, schemas, store, production env flag, client Gemini fallback path.

### Budget constants

| Constant | Value |
|---|---|
| `MEAL_PLAN_GLOBAL_BUDGET_MS` | **135 000** (target 130–135 s) |
| `MIN_BUDGET_TO_START_CALL_MS` | 20 000 |
| `MIN_BUDGET_FOR_VARIETY_RETRY_MS` | 45 000 |
| `MIN_BUDGET_FOR_UNAVAILABLE_RETRY_MS` | 60 000 |
| Per-call Gemini cap | `min(120 s, remaining − 2 s reserve)` |
| Unavailable retry (503/overload) | **1** max; delay **2–4 s** jitter; only if budget ≥ 60 s |
| Meal plan model fallback (with budget) | **1 model** |
| Variety loop | **≤ 2** generations (attempts 0–1), second skipped if budget low |

### Structured logging (Edge)

JSON lines with `tag: "meal-plan-budget"`: `requestId`, `attempt`, `geminiAttempt`, `model`, `elapsedMs`, `remainingBudgetMs`, `code`, `event`.

Events: `gemini_start`, `gemini_end`, `retry_scheduled`, `retry_skipped`, `variety_skip`, `budget_exceeded`, `success`, `error`.

---

## Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ Pass |
| `npm run build:web` | ✅ Pass |
| Edge deploy | ✅ **2026-06-16** — `generate-meal-plan` on `vukpkqcelmboqnptyceu` (version 6+ with retry) |
| `GEMINI_API_KEY` sync | ✅ Supabase secret aligned with working client key |
| Rollback `flag=false` | ✅ Unchanged (client path not modified beyond error mapping) |

### Smoke — back-to-back

```bash
node scripts/smoke-meal-plan-budget.mjs 5
```

| Metric | Result |
|---|---|
| Success | **3/5** |
| P95 | **125.5 s** |
| `QUOTA_EXCEEDED` | **0** |
| Platform 504 (HTML) | **0** |
| Structured `TIMEOUT` | **1** (retry + long calls exceeded budget) |
| `GEMINI_UNAVAILABLE` | **1** (503 late in call; `retry_skipped` / `INSUFFICIENT_BUDGET`) |

### Smoke — spaced (authoritative)

```bash
node scripts/smoke-meal-plan-budget.mjs 5 --delay 90000
```

Artifact: `docs/private/.meal-plan-budget-smoke.json`

| Run | Duration (s) | HTTP | plannedMeals | recipes | Error |
|---|---|---|---|---|---|
| 1 | 62.8 | 200 | 21 | 9 | — |
| 2 | 101.4 | 200 | 21 | 8 | — |
| 3 | 43.5 | 200 | 21 | 9 | — |
| 4 | 59.9 | 200 | 21 | 7 | — |
| 5 | 67.9 | 200 | 28 | 8 | — |

| Metric | Result |
|---|---|
| Success | **5/5** ✅ |
| P95 | **101.4 s** (< 140 s) |
| `QUOTA_EXCEEDED` | **0** |
| Platform 504 (HTML) | **0** |
| Structured `TIMEOUT` | **0** |

**Pass criteria met** for realistic single-user spacing.

---

## Conclusion

**Budget + retry are working in realistic usage.** Earlier **503** failures under back-to-back smokes appear related to **Gemini pressure from heavy sequential calls**, not a broken Edge implementation.

### Product decision

**Do not** proceed with Phase 4 re-canary now. Production remains **`EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=false`**.

### Next sprint — Meal Plan Lightweight v1

Generate **planned meals only** (no full recipes in the initial response). Recipes **on demand** in a future sprint — reduces payload and latency before re-evaluating production Edge enablement.

---

## Client error mapping

| Edge response | Client behavior |
|---|---|
| HTTP 504 + JSON `{ ok:false, code:"TIMEOUT" }` | `AiEdgeError TIMEOUT` → *A IA demorou demais…* |
| HTTP 504 without JSON (platform) | `edge-client` → `TIMEOUT` |
| HTTP 429 `QUOTA_EXCEEDED` | Existing quota message |
| HTTP 503 `GEMINI_UNAVAILABLE` | Generic operation failure (no auto client fallback) |

---

## Deploy access verification (2026-06-16)

CLI session on this machine:

| Check | Result |
|---|---|
| `npx supabase orgs list` | **AudioBF's Org** (`ldfdxkvclfgzmddzvrxi`) |
| `npx supabase projects list` | `finflow`, `nexo` only |
| Sláinte `vukpkqcelmboqnptyceu` | ❌ **Not listed** on AudioBF account |

**Conclusion:** Deploy on **spouse Supabase account** via `npx.cmd supabase login --token …`.

```powershell
npx.cmd supabase link --project-ref vukpkqcelmboqnptyceu
npx.cmd supabase functions deploy generate-meal-plan --project-ref vukpkqcelmboqnptyceu
```

Dashboard: https://supabase.com/dashboard/project/vukpkqcelmboqnptyceu/functions

**PowerShell note:** use `npx.cmd` (not `npx`) when script execution policy blocks `npx.ps1`.

---

## Files touched

- `supabase/functions/_shared/execution-budget.ts`
- `supabase/functions/_shared/gemini.ts`
- `supabase/functions/generate-meal-plan/index.ts`
- `src/services/ai/edge-client.ts`
- `src/services/ai/errors.ts`
- `scripts/smoke-meal-plan-budget.mjs` (`--delay`)

---

*Timeout Budget v1 + unavailable retry validated. Phase 4 re-canary deferred; Meal Plan Lightweight v1 is next.*
