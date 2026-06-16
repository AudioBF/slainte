# Meal Plan Edge Rollout — Result

**Plan:** `docs/private/MEAL_PLAN_EDGE_ROLLOUT_PLAN.md`  
**Last updated:** 2026-06-16  
**Status:** Phase 2 complete ✅ · Phase 3B complete ✅ · **Phase 4 rolled back** ⚠️ · **Timeout Budget + retry validated** ✅ · **Phase 4 re-canary deferred**

---

## Executive summary

| Phase | Result |
|---|---|
| **Phase 2** (quota + Edge invoke script) | ✅ **GO** — 5/5 signed-in Edge generations, signed-out 401 |
| **Phase 3** (local preview-equivalent) | ⚠️ **Partial** — 1/3 UI gens; superseded by 3B |
| **Phase 3B** (real Vercel preview + UI smoke) | ✅ **GO** — 3/3 UI gens on Vercel preview URL, rollback validated |
| **Phase 4** (production canary) | ❌ **FAILED** — 0/2 UI gens on production; **rolled back** to client path |
| **Post-rollback** (Timeout Budget v1 + unavailable retry) | ✅ **Edge validated** — spaced smoke **5/5**; **Phase 4 re-canary not scheduled** |

**Operational gate:** Edge `GEMINI_API_KEY` quota healthy. No `QUOTA_EXCEEDED` in post-fix smokes.

**Production today:** `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=false` (**unchanged** — product decision). `EXPO_PUBLIC_GEMINI_API_KEY` still present. Client fallback remains production path.

---

## Phase 2 — Script validation (complete)

### Environment

| Field | Value |
|---|---|
| Machine | Local dev (Windows) |
| Supabase project | `vukpkqcelmboqnptyceu` |
| Invoke | `supabase.functions.invoke('generate-meal-plan')` |
| `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN` | `false` in `.env` (direct Edge invoke) |
| Auth | Ephemeral smoke user via `signUp` |

### Quota

| Check | Result |
|---|---|
| Client key (`test-gemini.mjs`) | ✅ |
| Edge secret (5/5 invokes) | ✅ — no `QUOTA_EXCEEDED` |

### Signed-in runs (5/5)

| Run | Duration (s) | HTTP | plannedMeals | recipes |
|---|---|---|---|---|
| quota-probe | 62 | 200 | 21 | 8 |
| run-2 | 92 | 200 | 28 | 8 |
| run-3 (150 chars restrictions) | 76 | 200 | 21 | 5 |
| run-4 | 75 | 200 | 21 | 8 |
| run-5 | 83 | 200 | 21 | 8 |

### Signed-out

| Field | Value |
|---|---|
| HTTP | 401 |
| Code | `UNAUTHORIZED` |
| Message | `Authentication required.` |

---

## Phase 3 — Local preview-equivalent (partial, superseded by 3B)

Local build + `serve -s` at `http://localhost:62212` validated Edge routing in bundle (`useEdgeMealPlan:!0`). Only **1/3** UI generations confirmed (Puppeteer flakiness on runs 2–3). Vercel CLI was not authenticated at the time.

**Superseded by Phase 3B** — see below for authoritative UI smoke results.

---

## Phase 3B — Real Vercel preview + UI smoke (complete)

### Deploy — Edge preview

| Field | Value |
|---|---|
| CLI account | `audiobf` |
| Project | `audiobfs-projects/slainte` |
| Preview URL | https://slainte-fizdawsut-audiobfs-projects.vercel.app |
| Deployment ID | `dpl_BG2PXmvNd2pTdNSzF7QCXfRp6ptY` |
| Inspect | https://vercel.com/audiobfs-projects/slainte/BG2PXmvNd2pTdNSzF7QCXfRp6ptY |
| Build env | `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=true`, `EXPO_PUBLIC_AI_MOCK=false` |
| Bundle | `entry-397bcc5679282f52c44c30c2ff4773d9.js` → `useEdgeMealPlan:!0` |
| `EXPO_PUBLIC_GEMINI_API_KEY` | ✅ Present (Vercel env unchanged) |
| Preview protection | SSO enabled (`all_except_custom_domains`); accessed via automation bypass cookie |
| Production flag | ❌ Not enabled |

### UI test account

- Email: `slainte.phase3b.ui+1781627000000@example.com`
- Auth: real UI sign-up + sign-in on preview URL
- Onboarding: completed via UI (Manutenção goal)

### UI generation runs (Dieta → Gerar cardápio da semana)

Measured via real browser UI on Vercel preview; network timing from `performance.getEntriesByType('resource')`; success inferred from populated store + UI completion (no error banners).

| Run | Signed in | Duration (s) | `generate-meal-plan` | HTTP | plannedMeals | recipes | Errors |
|---|---|---|---|---|---|---|---|
| **1** | yes | **128** | ✅ called | **200** | **26** | **5** | none |
| **2** | yes | **68** | ✅ called | **200** | **21** | **9** | none |
| **3** | yes | **150** | ✅ called | **200** | **21** | **9** | none |

**3/3 pass.** No `QUOTA_EXCEEDED`, no timeout failure, no schema error surfaced in UI.

Visual checks (run 1+): day picker, meal slots, recipe links, loading state OK.

### Signed-out test

| Field | Result |
|---|---|
| Pass | ✅ |
| UI message | *Entre na conta para usar a IA.* |
| `generate-meal-plan` network call | **0** — blocked client-side (expected) |

### Collateral

| Flow | Result |
|---|---|
| **Compras → Do cardápio** | ✅ `generate-shopping-list` called (~4.4 s), **41** shopping items populated |
| **Refeição tab** | ✅ loads (Foto / Análise / Revisar UI present) |
| **Photo analysis** | ⚠️ Not exercised — no test image uploaded in browser session |

### Rollback drill — client fallback preview

| Field | Value |
|---|---|
| Preview URL | https://slainte-7phzaitmb-audiobfs-projects.vercel.app |
| Deployment ID | `dpl_jw6pRFJTz2XS5PJqwsxZxC5u1ogz` |
| Build env | `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=false`, `EXPO_PUBLIC_AI_MOCK=false` |
| Bundle | `entry-0707c25cefc9d9bf1dd88a16e84f1939.js` → `useEdgeMealPlan:!1` |

| Check | Result |
|---|---|
| `generate-meal-plan` Edge calls | **0** |
| Client Gemini (`generativelanguage.googleapis.com`) | **3** calls (main ~50 s) |
| UI generation success | ✅ **28** plannedMeals, **7** recipes |
| Production bundle parity | Production (`slainte-sigma.vercel.app`) uses same `entry-0707c25…` hash → `useEdgeMealPlan:!1` |

### Phase 3B checklist

| # | Requirement | Result |
|---|---|---|
| 1 | Real Vercel preview deploy with Edge flag `true` | ✅ |
| 2 | Login with real user (UI) | ✅ |
| 3 | Dieta → Gerar cardápio ×3 | ✅ **3/3** |
| 4 | Network `generate-meal-plan` each run | ✅ |
| 5 | HTTP 200 each run | ✅ |
| 6 | Duration + meal/recipe counts recorded | ✅ |
| 7 | Signed-out auth gate | ✅ |
| 8 | Collateral shopping + meal tab | ✅ (photo N/A) |
| 9 | Rollback preview `flag=false` + client path UI gen | ✅ |
| 10 | Production flag still off | ✅ |
| 11 | `EXPO_PUBLIC_GEMINI_API_KEY` retained | ✅ |

---

## Go / no-go decisions

### Phase 3B → Phase 4 (production canary)

## ✅ GO for Phase 4

**Criteria met:**

1. ✅ Real Vercel preview deploy with `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=true`
2. ✅ **3/3** successful UI meal-plan generations via Edge on preview URL
3. ✅ No `QUOTA_EXCEEDED` in any run
4. ✅ Rollback validated — preview with flag `false` uses client Gemini path (0 Edge calls, successful UI gen)
5. ✅ Production unchanged — flag off, client key present

### Product follow-up (non-blocking)

Several runs return **21–26 `plannedMeals`** (not always 28 = 4 slots × 7 days). Track as product/AI variance review — not an Edge rollout blocker.

---

## Phase 4 — Production canary (failed, rolled back)

### Enable + deploy

| Field | Value |
|---|---|
| Vercel Production env | `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=true` added |
| Other env | `EXPO_PUBLIC_GEMINI_API_KEY` retained; `EXPO_PUBLIC_AI_MOCK` unchanged |
| Production deploy | `dpl_DgkmLvpJyiPEGRThWXfJscyfZkct` |
| URL | https://slainte-sigma.vercel.app |
| Bundle | `entry-397bcc5679282f52c44c30c2ff4773d9.js` → `useEdgeMealPlan:!0` ✅ |

### Canary UI smoke (signed in)

Account: `slainte.phase3b.ui+1781627000000@example.com` (signed in confirmed on `/account`).

| Run | `generate-meal-plan` | Network duration (s) | plannedMeals | recipes | UI result |
|---|---|---|---|---|---|
| 1 | ✅ called | ~152 | 0 | 0 | ❌ *Não foi possível completar a operação. Tente novamente.* |
| 2 | ✅ called | ~150 | 0 | 0 | ❌ same generic error |

No `QUOTA_EXCEEDED`. No meals persisted despite Edge network completion (~150 s both runs).

**Not completed on Edge production** (canary failed first): signed-out gate, Compras collateral, Refeição tab, photo analysis. These remain validated on Phase 3B preview only.

### Rollback

| Step | Result |
|---|---|
| `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=false` on Production | ✅ |
| `vercel deploy --prod` | `dpl_HeqaB47qbUsNP5Fi9DhQ2bF1UYPh` |
| Bundle after rollback | `entry-0707c25cefc9d9bf1dd88a16e84f1939.js` → `useEdgeMealPlan:!1` ✅ |
| Client fallback UI gen (signed in) | ✅ **28** plannedMeals, **7** recipes; **0** Edge calls; Gemini client calls |

### Phase 4 verdict

## ❌ NO-GO — production canary failed; rolled back

**Follow-up:** Timeout Budget v1 + unavailable retry **deployed and validated** (spaced smoke 5/5). Phase 4 re-canary **deferred** — see post-rollback section below and `MEAL_PLAN_EDGE_TIMEOUT_BUDGET_RESULT.md`.

---

## Artifacts

| Artifact | Disposition |
|---|---|
| Edge preview deploy | https://slainte-fizdawsut-audiobfs-projects.vercel.app (retained on Vercel) |
| Rollback preview deploy | https://slainte-7phzaitmb-audiobfs-projects.vercel.app (retained on Vercel) |
| Failed prod canary deploy | `dpl_DgkmLvpJyiPEGRThWXfJscyfZkct` (superseded) |
| Current production | `dpl_HeqaB47qbUsNP5Fi9DhQ2bF1UYPh` — client fallback |
| `.vercel/project.json` | Created by `vercel link` (local, typically gitignored) |
| App code / Edge / prompts / schemas | **Unchanged** |
| `.env` local | `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=false` (unchanged) |

---

## Timeout Budget v1 + unavailable retry (2026-06-16)

Edge `generate-meal-plan` enforces a **135 s** global wall-clock budget, structured `TIMEOUT` JSON, budget logs, and **1 controlled retry** for transient `503` / overload (only when `remainingBudgetMs ≥ 60 s`). Deployed to Supabase (`vukpkqcelmboqnptyceu`). Details: `docs/private/MEAL_PLAN_EDGE_TIMEOUT_BUDGET_RESULT.md`.

### Smoke — back-to-back (no delay)

```bash
node scripts/smoke-meal-plan-budget.mjs 5
```

| Metric | Result |
|---|---|
| Success | **3/5** |
| P95 | **125.5 s** |
| `QUOTA_EXCEEDED` | **0** |
| Platform 504 (HTML) | **0** |
| Structured `TIMEOUT` | **1** |
| `GEMINI_UNAVAILABLE` | **1** |

Failures correlated with **heavy sequential invokes** (503 after long first call → `retry_skipped` / `INSUFFICIENT_BUDGET` in logs).

### Smoke — spaced (90 s between runs)

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

### Conclusion

**Budget + retry work in realistic usage** (single user, spaced generations). Earlier **503 `GEMINI_UNAVAILABLE`** spikes appear related to **pressure from back-to-back heavy calls**, not a broken Edge path.

### Product decision — Phase 4 re-canary

## ⏸ Do **not** proceed with Phase 4 re-canary now

Production stays **`EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=false`**. Full recipe + meal plan generation remains too heavy for reliable single-shot Edge latency; next sprint targets a lighter payload (see below).

### Next sprint — Meal Plan Lightweight v1

| Goal | Detail |
|---|---|
| Scope | Generate **planned meals only** (slots, names, macros) — **no full recipes** in the initial generation |
| Recipes | **On demand** in a future sprint (user taps meal → generate/fetch recipe) |
| Rationale | Reduce Gemini payload and wall-clock time before re-evaluating production Edge flag |

---

## Phase 4+ (unchanged policy)

- Do **not** remove `EXPO_PUBLIC_GEMINI_API_KEY` until production Edge path is stable + soak criteria in plan §9.
- **Do not** re-enable production flag until **Meal Plan Lightweight v1** is implemented and validated (preview smoke + rollback drill).

---

*Phase 2 complete. Phase 3B complete. Phase 4 canary failed on production UI — rolled back. Timeout Budget + retry validated on Edge; Phase 4 re-canary deferred; Lightweight v1 is next.*
