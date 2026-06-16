# Meal Plan Edge Production Failure — Diagnosis

**Status:** Diagnosis only (no production flag change, no code/schema/prompt changes in this sprint)  
**Date:** 2026-06-16  
**Context:** Phase 4 production canary failed 2/2 UI generations; Phase 3B Vercel preview passed 3/3.  
**Related:** `docs/private/MEAL_PLAN_EDGE_ROLLOUT_RESULT.md` (Phase 4 section)

---

## 1. Symptom summary

| Field | Phase 4 production (failed) | Phase 3B preview (passed) |
|---|---|---|
| URL | https://slainte-sigma.vercel.app | https://slainte-fizdawsut-audiobfs-projects.vercel.app |
| Bundle (Edge on) | `entry-397bcc…` → `useEdgeMealPlan:!0` | Same bundle hash |
| Auth | Signed in (`slainte.phase3b.ui+…`) | Same account pattern |
| Network | `generate-meal-plan` called both runs | 3/3 calls |
| Duration | **~152 s**, **~150 s** | 128 s, 68 s, **150 s** |
| Store after | `plannedMeals: 0`, `recipes: 0` | 21–26 meals populated |
| UI error | *Não foi possível completar a operação. Tente novamente.* | Success |
| `QUOTA_EXCEEDED` | Not observed in Phase 4 | Not observed in Phase 3B |

Production was **rolled back** to `useEdgeMealPlan:!1`; client fallback verified (28 meals / 7 recipes).

---

## 2. What we could not recover from logs

| Item | Result |
|---|---|
| HTTP status + body from the **exact** Phase 4 browser sessions | **Not available** — no HAR/network export was saved during canary |
| Supabase Edge logs at failure time | **Not retrieved** — repo not `supabase link`‑ed; CLI v2.106 has no `functions logs` subcommand; dashboard logs not accessed in this sprint |

Inference below is from **timing**, **code paths**, **live reproduction** (post-incident), and **platform docs**.

---

## 3. Production vs preview comparison

| Dimension | Production canary | Preview (3B) | Same? |
|---|---|---|---|
| Edge flag in bundle | `useEdgeMealPlan:!0` | `useEdgeMealPlan:!0` | ✅ |
| Flag source | Vercel **Production** env + `deploy --prod` | `vercel deploy --build-env` | Different mechanism, same baked value |
| Supabase project | `vukpkqcelmboqnptyceu` | Same | ✅ |
| `EXPO_PUBLIC_GEMINI_API_KEY` | Present | Present | ✅ |
| `EXPO_PUBLIC_AI_MOCK` | Production env (unchanged) | `false` via build-env | Likely same effective value |
| App domain | `slainte-sigma.vercel.app` | `*.vercel.app` preview | Irrelevant to Edge invoke (client → Supabase directly) |
| Client code path | `invokeGenerateMealPlan` → `mealPlanSchema.parse(raw)` | Identical bundle | ✅ |
| Request payload | `{ profile }` from Zustand after onboarding | Same shape | ✅ (`goal`, `restrictions`, `dailyGoals`) |
| SSO / Vercel protection | None on custom prod domain | Bypass cookie on preview | Does not affect Supabase calls |

**Conclusion:** Preview and production canary used the **same JS bundle and same Supabase Edge backend**. Domain/env delivery differed only in how the flag was injected; both resolved to Edge on. Failure is **not** explained by a wrong flag or different Supabase project.

---

## 4. Client error path (where the generic message comes from)

### 4.1 Edge success path

```text
generateMealPlan()
  → invokeGenerateMealPlan({ profile })
  → supabase.functions.invoke('generate-meal-plan')
  → if data.ok: mealPlanSchema.parse(raw)   // ZodError → specific UI message
  → setMealPlan(...)
```

Empty store ⇒ failure **before** `setMealPlan` — either `invoke` threw or `parse` threw.

### 4.2 `toAiUserMessage` mapping gaps

File: `src/services/ai/errors.ts`

| Error type | User-visible message |
|---|---|
| `AiEdgeError` `TIMEOUT` | Specific timeout copy |
| `AiEdgeError` `VALIDATION` / `BAD_REQUEST` | *A IA retornou um formato inválido…* |
| `AiEdgeError` `QUOTA_EXCEEDED` | Quota copy |
| `ZodError` (client `mealPlanSchema.parse`) | *A IA retornou um formato inválido…* |
| `Error` matching `/Invalid meal plan/` | *Resposta da IA incompleta…* |
| **`AiEdgeError` `FUNCTION`** | ❌ **Not mapped** → generic fallback |
| **`AiEdgeError` `INTERNAL`** | ❌ **Not mapped** → generic fallback |
| **`FunctionsHttpError` + non-JSON 504 body** | Envelope unreadable → `FUNCTION` → generic |

Phase 4 UI showed the **generic fallback** (`errors.ts` line 116). That rules out:

- Client `ZodError` after a successful 200 payload (would show validation copy)
- `AiEdgeError` `TIMEOUT` (would show timeout copy)
- `UNAUTHORIZED` (would show *Entre na conta…*)

Most consistent with:

1. **Gateway/platform 504** at ~150 s with a body the client cannot parse as `{ ok, code, error }`, **or**
2. **`AiEdgeError` `INTERNAL`** after a parsed JSON failure envelope (also unmapped → generic).

### 4.3 Invoke error handling

File: `src/services/ai/edge-client.ts`

- Non-2xx with JSON `{ ok: false, code, error }` → `readFunctionErrorEnvelope` → `AiEdgeError(code, …)`.
- Non-2xx **without** parseable envelope (typical platform 504 HTML/empty) → `AiEdgeError('FUNCTION', …)` → **generic UI**.

---

## 5. Edge / platform timing (strongest evidence)

### 5.1 Supabase hosted limits

From [Supabase Edge Functions limits](https://supabase.com/docs/guides/functions/limits):

- **Request idle timeout: 150 s** — if no response before this, **504 Gateway Timeout**.
- **Free plan wall clock: 150 s** (paid: 400 s).

Phase 4 failures cluster at **150–152 s** network duration with **zero** persisted meals — matches **platform timeout** more than quota or schema errors (those fail fast with JSON envelopes).

### 5.2 Edge internal timeouts and retries

File: `supabase/functions/_shared/gemini.ts`

| Setting | Value |
|---|---|
| `MEAL_PLAN_TIMEOUT_MS` | **120 s** per Gemini `requestOnce` |
| Model chain | Up to 4 models × 2 attempts each (meal plan) |
| Variety loop | Up to **3** full plan attempts (`MAX_VARIETY_ATTEMPTS = 2`) |

File: `supabase/functions/generate-meal-plan/index.ts`

- Each variety retry calls Gemini again → **multiple 60–120 s calls in one invocation**.
- Worst case wall clock **exceeds 150 s** even when each Gemini call is “healthy”.

### 5.3 Why preview 3/3 could pass while production 0/2 failed

| Preview run | Duration | Outcome |
|---|---|---|
| 1 | 128 s | ✅ |
| 2 | 68 s | ✅ |
| 3 | **150 s** | ✅ (borderline) |

Production runs at **~150–152 s** failed. Same backend, same bundle — **latency variance** (Gemini + variety retries) determines whether the invocation finishes **just under** or **at/above** the 150 s platform ceiling.

Preview run 3 proves success **at the boundary** is possible; production’s two failures at the same boundary prove it is **not reliable**.

---

## 6. Live reproduction (post-incident, diagnostic only)

Ephemeral script `scripts/diag-meal-plan-edge-prod.mjs` (not committed long-term):

| Run | Duration | HTTP | Body |
|---|---|---|---|
| Invalid profile shape | 234 ms | 400 | `{ ok:false, code:"BAD_REQUEST" }` |
| Correct profile (after fix) | 664 ms | **429** | `{ ok:false, code:"QUOTA_EXCEEDED" }` |

The 429 run reflects **quota pressure after repeated test invocations**, not the Phase 4 symptom (150 s, generic error, no quota UI). It confirms:

- Structured JSON errors **do** return parseable envelopes when the function responds quickly.
- `FunctionsHttpError` + JSON envelope → real app maps `QUOTA_EXCEEDED` correctly via `AiEdgeError` (diagnostic classifier was incomplete; production app code handles `QUOTA_EXCEEDED`).

---

## 7. Hypothesis matrix

| Hypothesis | Evidence for | Evidence against | Verdict |
|---|---|---|---|
| **A. Supabase 150 s platform timeout** | Failure duration ~150 s; empty store; generic UI; docs match | Preview run at 150 s once succeeded | **Primary — most likely** |
| B. Client `mealPlanSchema.parse` on 200 OK | Would show Zod-specific message, not generic | Generic message observed | Unlikely |
| C. Edge `TIMEOUT` JSON (120 s Gemini) | Edge returns `{ code: TIMEOUT }` → specific UI | User saw generic, not timeout copy | Unlikely as sole cause |
| D. `QUOTA_EXCEEDED` in Phase 4 | — | Explicitly not seen; fast 429 when quota hit later | Ruled out for Phase 4 |
| E. Wrong bundle / flag off | Bundle grep `!0` on prod canary | — | Ruled out |
| F. Signed-out / auth | Account confirmed signed in | — | Ruled out |
| G. `toAiUserMessage` hides `FUNCTION`/`INTERNAL` | Code gap proven | Explains **wording**, not root failure | **Contributing** (UX masking) |

---

## 8. Root cause (probable)

**The `generate-meal-plan` Edge invocation intermittently exceeds Supabase’s 150 s request idle / free-tier wall clock limit.** When the platform returns **504 without a parseable `{ ok, code, error }` JSON body**, the client maps it to `AiEdgeError('FUNCTION')`, and `toAiUserMessage` falls through to the **generic** string — leaving the store empty.

Variety retries and multi-model Gemini chains increase wall-clock time without a **global** budget under 150 s. Phase 3B succeeded when total time stayed ≤ ~150 s; Phase 4 failed when latency landed on the wrong side of that cliff.

---

## 9. Minimum fix proposals (for a future implementation sprint — not in scope here)

| Priority | Change | Rationale |
|---|---|---|
| **P0** | **Cap total Edge wall time** under ~140 s (e.g. single Gemini attempt for canary, or skip variety retry when approaching budget) | Stays within free-tier 150 s limit |
| **P0-alt** | **Upgrade Supabase plan** (400 s wall clock) | Buys headroom without algorithm change |
| P1 | Map `AiEdgeError` codes `FUNCTION`, `INTERNAL`, `METHOD_NOT_ALLOWED` in `toAiUserMessage` | Surfaces “servidor demorou / tente novamente” instead of generic |
| P1 | Log + return `504` JSON envelope from Edge on detected budget (`TIMEOUT` code) before platform kill | Client gets mapped timeout message |
| P2 | Background task / async job pattern (Supabase) for meal plan | Long-term if 150 s remains insufficient |

**Explicitly out of scope per rollout rules:** automatic Edge → client fallback, prompt/schema changes in this diagnosis sprint.

---

## 10. New smoke test (before Phase 4 retry)

Run on **preview only** (`EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=true` via build-env, **not** production env):

1. **Capture HAR** or scripted invoke logging: HTTP status, raw body, `performance` duration, `AiEdgeError.code` if thrown.
2. **5 invocations** with production-like profile (`maintain`, default `dailyGoals`, empty restrictions).
3. Record **P95 duration**; **fail gate if P95 ≥ 140 s**.
4. Confirm client parse: `plannedMeals.length > 0` on each success.
5. **Simulate slow path:** if possible, trigger variety retry (mock is out of scope — use real runs and note duration).
6. Verify error mapping: force one `504`/timeout in preview (e.g. temporary low Edge timeout in dev only) and confirm UI message is **specific**, not generic.

Optional: `supabase link` + dashboard logs for one slow invoke to confirm `504` vs `546` in platform metrics.

---

## 11. Criteria to retry Phase 4 (production canary)

All required:

| # | Criterion |
|---|---|
| 1 | Root-cause fix deployed (P0 or P0-alt) and documented |
| 2 | Preview smoke **5/5** success with **P95 duration < 140 s** |
| 3 | No generic-only failures in preview — errors must expose `TIMEOUT`/`VALIDATION`/quota copy when injected |
| 4 | HAR/log artifact attached for at least one **>120 s** success showing HTTP **200** + `{ ok:true, data }` |
| 5 | Rollback drill still valid (`flag=false` → client path) |
| 6 | `EXPO_PUBLIC_GEMINI_API_KEY` still present on production |

---

## 12. Artifacts

| Artifact | Location |
|---|---|
| Phase 4 incident record | `docs/private/MEAL_PLAN_EDGE_ROLLOUT_RESULT.md` § Phase 4 |
| Ephemeral invoke JSON | `docs/private/.diag-meal-plan-edge-prod.json` (local, gitignored pattern) |
| Ephemeral script | `scripts/diag-meal-plan-edge-prod.mjs` — delete after review or keep untracked |

---

*Diagnosis complete. Production remains on client fallback. Do not re-enable `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=true` on production until §11 criteria are met.*
