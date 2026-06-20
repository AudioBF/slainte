# Meal Plan Edge Canary Prep v1

**Status:** Prepared / documented (no production change)  
**Date:** 2026-06-16  
**Sprint:** Meal Plan Edge Canary Prep v1  
**Production default:** `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=false` (unchanged)

---

## 1. Context

The Sláinte core flow is stable in production:

**Generate lightweight meal plan → Recipe on demand → Weekly shopping list → Log planned meal → Today updates macros → Data persists after refresh/login.**

Meal plan generation in production still uses **client-side Gemini** (Lightweight v1: `plannedMeals` + `summary`, `recipes: []`). The Supabase Edge Function `generate-meal-plan` exists and has passed preview smoke (3B: 3/3), but **Phase 4 production canary failed 0/2** (~150 s timeouts / generic UI errors). Timeout budget work was done; reliability is still insufficient for production default.

**This sprint:** inspection, documentation, smoke plan, GO/NO-GO checklist, rollback — **no flag change, no Edge deploy, no app logic change.**

Related history:

| Doc | Topic |
|---|---|
| `MEAL_PLAN_EDGE_ROLLOUT_RESULT.md` | Phases 1–4, rollback |
| `MEAL_PLAN_EDGE_PROD_FAILURE_DIAGNOSIS.md` | Phase 4 failure analysis |
| `MEAL_PLAN_EDGE_TIMEOUT_BUDGET_RESULT.md` | 135 s budget, structured TIMEOUT |
| `MEAL_PLAN_LIGHTWEIGHT_RESULT.md` | Lightweight schema, client path |
| `MEAL_PLAN_EDGE_ROLLOUT_PLAN.md` | Original rollout phases |

---

## 2. Current state

| Item | Value |
|---|---|
| `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN` (local `.env`) | `false` |
| Production Vercel env | `false` / empty (rolled back 2026-06-16) |
| Meal plan path in prod | Client Gemini via `generateStructuredJson` |
| Recipe path | Edge `generate-recipe` (unchanged) |
| Shopping path | Edge `generate-shopping-list` from `plannedMeals` (unchanged) |
| Edge `generate-meal-plan` deploy | Exists on project `vukpkqcelmboqnptyceu`; **not activated in prod** |

**Key asymmetry (client vs Edge):**

| | Client | Edge |
|---|---|---|
| Variety retries | Up to 2 attempts (`MAX_VARIETY_ATTEMPTS = 2`) | Up to 1 retry (`MAX_VARIETY_ATTEMPTS = 1`) |
| Execution budget | None (browser / Gemini client timeout) | 135 s global (`MEAL_PLAN_GLOBAL_BUDGET_MS`) |
| Gemini key | `EXPO_PUBLIC_GEMINI_API_KEY` | Supabase secret `GEMINI_API_KEY` |
| Edge failure fallback | N/A (not on Edge path) | **No auto fallback to client** |

---

## 3. Files inspected

### App / client

| File | Role |
|---|---|
| `src/lib/env.ts` | Reads `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN === 'true'` → `env.useEdgeMealPlan` |
| `src/services/ai/generate-meal-plan.ts` | Routes Edge vs client; mock; variety validation (client only) |
| `src/services/ai/edge-client.ts` | `invokeGenerateMealPlan` → `supabase.functions.invoke('generate-meal-plan')` |
| `src/services/ai/errors.ts` | `toAiUserMessage` for Edge codes (TIMEOUT, GEMINI_UNAVAILABLE, etc.) |
| `src/services/ai/client.ts` | Client Gemini structured JSON (meal plan task) |
| `src/services/ai/prompts/meal-plan.prompt.ts` | Client prompts (mirror Edge shared prompts) |
| `src/services/ai/schemas/meal-plan.schema.ts` | Zod parse after generation |
| `src/services/ai/validate-meal-plan.ts` | Variety validation |
| `src/features/diet/hooks/useMealPlanGenerator.ts` | UI hook → `generateMealPlan` → `setMealPlan` |
| `.env.example` | Documents flag default `false` |

### Edge

| File | Role |
|---|---|
| `supabase/functions/generate-meal-plan/index.ts` | Auth, budget, generate, error mapping |
| `supabase/functions/_shared/meal-plan.ts` | Prompts, schema, `normalizeLightweightMealPlan`, variety |
| `supabase/functions/_shared/execution-budget.ts` | 135 s budget, per-call caps |
| `supabase/functions/_shared/gemini.ts` | Structured JSON, retries, quota/unavailable handling |

### Smoke scripts

| Script | Purpose |
|---|---|
| `scripts/smoke-meal-plan-client.mjs` | Client path; **requires flag false** |
| `scripts/smoke-meal-plan-budget.mjs` | Direct Edge invoke; N runs, P95, shopping chain |
| `scripts/fixtures/lightweight-meal-plan.mjs` | Shared fixture shape |

### Docs (prior sprints)

All `MEAL_PLAN_EDGE_*`, `MEAL_PLAN_LIGHTWEIGHT_*`, `CORE_FLOW_RELEASE_CHECKPOINT_RESULT.md`, `PROJECT_BRIEFING.md`.

**No functional app or Edge code was modified in this sprint.**

---

## 4. Flow map

### 4.1 Decision point (build-time flag)

```
EXPO_PUBLIC_USE_EDGE_MEAL_PLAN
  └── src/lib/env.ts → env.useEdgeMealPlan (boolean, baked at build)
```

Only the string `'true'` enables Edge. Unset, `false`, or empty → client path.

### 4.2 End-to-end (Dieta → store)

```
useMealPlanGenerator.generate()
  └── generateMealPlan(profile)                    [generate-meal-plan.ts]
        ├── env.aiMock → mockPlannedMeals
        ├── env.useEdgeMealPlan === true
        │     └── invokeGenerateMealPlan({ profile }) [edge-client.ts]
        │           └── supabase.functions.invoke('generate-meal-plan')
        │           └── mealPlanSchema.parse(raw)   ← no client fallback on error
        └── else (production default)
              └── requestMealPlan() via generateStructuredJson [client.ts]
              └── validateMealPlanVariety (max 2 attempts)
              └── mealPlanSchema
        └── setMealPlan(plannedMeals, recipes, summary) [useAppStore]
```

### 4.3 Edge Function `generate-meal-plan`

```
POST + Authorization Bearer
  └── requireAuthenticatedUser
  └── ExecutionBudget(135s)
  └── validateMealPlanRequest({ profile })
  └── generateMealPlan(profile, budget)
        └── generateStructuredJson (Gemini, server secret)
        └── parseMealPlanResult / normalizeLightweightMealPlan
        └── validateMealPlanVariety (max 1 retry if budget ≥ 45s)
  └── jsonOk(plan) | jsonError(code, message, status)
```

**Structured errors (client-visible via `AiEdgeError`):**

| Code | Typical HTTP | User message (PT) |
|---|---|---|
| `TIMEOUT` | 504 | IA demorou demais… |
| `GEMINI_UNAVAILABLE` | 503 | Gemini sobrecarregado… |
| `QUOTA_EXCEEDED` | 429 | Cota esgotada… |
| `VALIDATION` / `BAD_REQUEST` | 400 | Formato inválido… |
| `UNAUTHORIZED` | 401 | Entre na conta… |
| Platform idle timeout | 504 HTML (no JSON) | Generic FUNCTION/INTERNAL in UI |

### 4.4 Downstream (unchanged by meal plan source)

```
plannedMeals in Zustand (+ cloud sync)
  ├── Shopping: generate-shopping-list({ plannedMeals }) when plan exists
  ├── Recipe on demand: generate-recipe({ plannedMeal }) per CTA
  └── Hoje: log planned meal → macros from plannedMeal fields
```

Shopping does **not** depend on meal plan being Edge vs client — only on `plannedMeals` shape in store.

### 4.5 Expected lightweight plan shape

```json
{
  "plannedMeals": [ /* ≥21 items typical: 7 days × 3+ slots */ ],
  "recipes": [],
  "summary": "string"
}
```

Each `PlannedMeal`: `id`, `dayIndex` (0–6), `slot`, `time`, `name`, macros. No embedded full recipes in lightweight mode.

---

## 5. Risks

| Risk | Description | Mitigation in canary |
|---|---|---|
| Supabase ~150 s idle limit | Platform 504 HTML if function runs too long | Edge budget 135 s; monitor P95; fail structured TIMEOUT before platform kill when possible |
| Quota / rate limit | `QUOTA_EXCEEDED`, 429 | Run canary off-peak; space runs (`--delay`); check Google AI Studio |
| `GEMINI_UNAVAILABLE` / 503 | Transient overload; Edge may retry once if budget ≥ 60 s | Count failures; NO-GO if persistent |
| Structured `TIMEOUT` (504 JSON) | Budget exceeded mid-generation | Target P95 < 120 s in canary; 5/5 success required |
| Platform 504 HTML | No JSON envelope → generic UI error | Track `is504Html` in budget smoke |
| Invalid JSON / schema drift | Zod/parse failure → VALIDATION | Assert `ok: true` + schema fields in smoke |
| Partial plan (< 21 meals) | Under-filled week | Assert `plannedMeals.length >= 21` |
| Recipes in lightweight plan | Should be `recipes: []` | Assert `recipes === 0` on every success |
| Accidental batch recipes | Old full-plan behavior | Lightweight normalize strips recipes on Edge |
| No Edge → client fallback | Flag on + Edge fail = user error only | Keep flag false in prod; canary only preview/local |
| Shopping regression | Bad meal names → poor list | Chain smoke: shopping 30–50 items from sample plan |
| Hoje / persistence | Unrelated to Edge but must not break | Manual checklist after canary UI run |
| Wrong bundle in prod | Vercel env `true` bakes Edge on | Verify bundle `useEdgeMealPlan:!1` before/after any deploy |
| Accidental Edge deploy | New function version without approval | No `supabase functions deploy` in this sprint |

---

## 6. Safe Canary plan

**Principle:** validate Edge meal plan in **controlled environments only**; production default stays client Gemini.

### 6.1 Environments (allowed)

| Environment | Flag | How |
|---|---|---|
| Local `.env` | `true` only for manual test session | Revert to `false` after |
| Vercel **preview** | `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=true` via `--build-env` | **Never** production env dashboard |
| CLI Edge smoke | No app flag; direct `fetch` to function | `smoke-meal-plan-budget.mjs` |

**Forbidden in this phase:** Vercel Production env `true`, permanent `.env` commit with `true`, removing client path.

### 6.2 Canary phases (recommended next sprint)

| Phase | Action | Gate |
|---|---|---|
| **A — Technical smoke** | `node scripts/smoke-meal-plan-budget.mjs 5 --delay 10000` | 5/5 OK, P95 < 120 s, recipes 0, meals ≥ 21 |
| **B — Preview UI** | Preview deploy + flag on; 5 manual UI generations | Same + no generic error; store populated |
| **C — Core chain** | One preview session: plan → shopping → recipe CTA → Hoje → refresh → optional re-login | Core flow checklist |
| **D — Production decision** | **Separate sprint + explicit approval** | All GO criteria; rollback doc ready |

### 6.3 Success criteria (canary session)

- HTTP 200, `ok: true`
- `plannedMeals.length >= 21`
- `recipes.length === 0`
- `summary` non-empty
- Duration P95 < **120 000 ms** (stricter than 135 s budget headroom)
- Shopping from same plan: **30–50 items**
- No structured `TIMEOUT`, `QUOTA_EXCEEDED`, or final `GEMINI_UNAVAILABLE`
- Production still `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=false`

### 6.4 Rollback triggers (immediate)

- Any production deploy with flag `true` without approval
- Preview canary < 5/5 success
- P95 ≥ 135 s or platform 504 HTML on ≥ 1 run
- Shopping < 25 or > 60 items from standard profile
- Recipes > 0 in plan payload
- Hoje or persistence regression
- User-facing generic error on majority of attempts

---

## 7. GO / NO-GO criteria

### GO (proceed to **next** sprint: controlled preview canary execution)

All of:

- [ ] This prep doc reviewed and approved
- [ ] `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=false` in local `.env` and Vercel Production
- [ ] Edge function version unchanged **or** any deploy explicitly approved and smoke re-run
- [ ] Team agrees preview-only flag mechanism (`vercel deploy --build-env`, not prod env)

### GO (future: enable Edge on production — **not this sprint**)

All of:

- [ ] **5/5** successful generations on **Vercel preview** with flag on (UI or budget script equivalent)
- [ ] HTTP 200, no `TIMEOUT`, no final `GEMINI_UNAVAILABLE`
- [ ] ≥ 21 `plannedMeals`, **0** required recipes in plan
- [ ] Shopping generates **30–50** items from `plannedMeals`
- [ ] Hoje logs planned meals; refresh keeps data; sign-out/sign-in sync OK
- [ ] P95 latency **< 120 s** (target; hard fail at 135 s)
- [ ] Production default verified `useEdgeMealPlan:!1` before and after any prod deploy
- [ ] Rollback owner and window defined (see §8)

### NO-GO (stop / stay on client)

- Preview or smoke **< 5/5** success
- Any platform 504 HTML without JSON envelope in canary set
- P95 ≥ 135 s or repeated ~150 s UI failures (Phase 4 pattern)
- `QUOTA_EXCEEDED` during canary window
- `recipes.length > 0` on lightweight path
- `plannedMeals < 21` on success responses
- Shopping chain fails or item count outside 30–50
- Core flow regression on Hoje or persistence

---

## 8. Smoke checklist

### 8.1 Pre-flight (every session)

```powershell
Select-String -Path .env -Pattern '^EXPO_PUBLIC_USE_EDGE_MEAL_PLAN='
# Expect: EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=false (unless intentional local canary)

npx.cmd tsc --noEmit
npm run build:web
# If flag false: grep dist for useEdgeMealPlan:!1
```

Confirm **no** `supabase functions deploy` unless explicitly approved.

### 8.2 Client path regression (production config)

```bash
node scripts/smoke-meal-plan-client.mjs
```

Requires `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=false` and `EXPO_PUBLIC_GEMINI_API_KEY`.

### 8.3 Edge technical smoke (canary — no app flag)

```bash
node scripts/smoke-meal-plan-budget.mjs 5 --delay 10000
```

Output: `docs/private/.meal-plan-budget-smoke.json`

Verify:

- [ ] `successCount === 5`
- [ ] `lightweightOk === true`
- [ ] `timeoutStructured === 0`
- [ ] `platform504 === 0`
- [ ] `quotaExceeded === 0`
- [ ] `p95DurationMs < 120000`
- [ ] `shoppingItems` between 30 and 50

### 8.4 Preview UI smoke (manual — next sprint)

Only on preview URL with `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=true` in **build** env:

- [ ] Sign in (diag account or test user)
- [ ] Dieta → generate meal plan × **5** (note duration and errors)
- [ ] Store: `plannedMeals >= 21`, `recipes === 0`
- [ ] Compras → generate list → 30–50 items, badge/source from plan
- [ ] Open one meal → Gerar receita → recipe loads (on demand, not in plan)
- [ ] Hoje → register planned meal → macros update
- [ ] Hard refresh → data remains
- [ ] Optional: sign out / sign in → cloud sync

### 8.5 Production sanity (after any deploy)

- [ ] https://slainte-sigma.vercel.app bundle contains `useEdgeMealPlan:!1`
- [ ] Vercel Production env: `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN` not `true`
- [ ] One client-path meal plan generation succeeds

---

## 9. Rollback

### 9.1 Confirm production on client lightweight

1. **Vercel dashboard → Production env:** `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN` = `false` or empty.
2. Redeploy production if env was ever `true`.
3. Open prod app → DevTools → Sources → search bundle for `useEdgeMealPlan:!1` (must **not** be `!0`).
4. Generate meal plan in UI → should hit client Gemini (network: no `generate-meal-plan` invoke, or verify timing/behavior vs Edge).
5. Local: `Select-String -Path .env -Pattern '^EXPO_PUBLIC_USE_EDGE_MEAL_PLAN='` → `false`.

### 9.2 If flag was enabled by mistake

1. Set Vercel Production env to `false` immediately.
2. Trigger production redeploy (`vercel --prod` or push to main).
3. Verify bundle `useEdgeMealPlan:!1`.
4. Run `node scripts/smoke-meal-plan-client.mjs` locally.
5. Document incident in `MEAL_PLAN_EDGE_ROLLOUT_RESULT.md` (new section).

### 9.3 Git revert

If a commit wrongly changed flag defaults or routing:

```bash
git revert <commit-sha>
# or restore specific files: src/lib/env.ts, generate-meal-plan.ts — only if changed
```

Do **not** remove Edge function or feature flag; rollback is **flag off**, not code deletion.

### 9.4 Avoid accidental Edge deploy

- Do not run `supabase functions deploy generate-meal-plan` without explicit approval.
- CI should not deploy Supabase functions on app-only merges.
- Pre-deploy checklist: smoke budget script + preview canary pass.

---

## 10. Out of scope (this sprint)

- Enabling `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN` in production
- Changing `.env` to `true` (committed or Vercel prod)
- Modifying client lightweight prompts/logic
- Changing Shopping, Recipe, Hoje, Zustand stores, schema, auth, sync
- Supabase Edge deploy
- Removing client fallback or feature flag
- New UI or user flows
- Large refactors

---

## 11. Recommended next sprint

**Meal Plan Edge Canary Execution v1** (or similar):

1. Run Phase A (`smoke-meal-plan-budget.mjs` 5×) and record in `MEAL_PLAN_EDGE_CANARY_RESULT.md`.
2. If 5/5 pass, Phase B preview UI (5×) with `--build-env EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=true`.
3. Phase C core chain on preview only.
4. If all GO criteria met, **separate decision** for production flag (with owner sign-off).
5. Optional: compare Edge logs (`requestId` from budget logs) vs Phase 4 timings.

**Do not** enable production flag until Execution sprint GO + explicit approval.

---

## 12. Validation (prep sprint)

Commands run after doc-only changes:

```powershell
npx.cmd tsc --noEmit
npm run build:web
Select-String -Path .env -Pattern '^EXPO_PUBLIC_USE_EDGE_MEAL_PLAN='
```

Expected: TypeScript clean, web build OK, flag `false`.

**Edge deploy:** none in this sprint.  
**Functional code changes:** none in this sprint.
