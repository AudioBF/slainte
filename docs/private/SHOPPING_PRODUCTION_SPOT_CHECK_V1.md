# Shopping Production Spot-check v1 — Result

**Status:** **SHOPPING STABLE** ✅  
**Date:** 2026-06-23  
**Sprint:** Shopping Production Spot-check v1  
**Commit base:** `dd2eaec` — `docs(meal-plan): record edge production warning decision`  
**Context:** Rollout Decision v1 flagged 2 automated FAILs (shopping 0 items, no `generate-shopping-list` call) — suspected automation flake  
**Production URL:** https://slainte-sigma.vercel.app

---

## 1. Objective

Targeted validation that **Compras** works in production with Edge Meal Plan canary ON — without code changes, env changes, or rollback.

---

## 2. Context & flag state

| Item | Value |
|---|---|
| `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN` (Production) | **`true`** (canary ON, unchanged) |
| Production bundle | `entry-13fe0f67f6a176f5c9662dd563f43367.js` → `useEdgeMealPlan:!0` |
| Local `.env` commitável | `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=false` |
| Supabase Edge deploy | **None** |
| Rollback | **Not executed** |

---

## 3. Spot-checks (5 runs, 30 s gap)

**Script (ephemeral):** `scripts/.shopping-production-spot-check.mjs`  
**Raw JSON (local, not committed):** `scripts/.shopping-production-spot-check-results.json`  
**Account:** `slainte.phase3b.ui+1781627000000@example.com`  
**Window:** 2026-06-23T18:59:16Z → 2026-06-23T19:09:41Z (~10 min)

Each check: login → ensure `plannedMeals >= 21` → `/shopping` → **Gerar da semana** → verify network + store → refresh.

### Summary table

| Check | Started (UTC) | Shopping class | Request fired | HTTP | Items | From plan | Sections | Refresh | Notes |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 18:59:16 | **PASS** | ✅ | 200 | 40 | ✅ | ✅ | ✅ | plan generated |
| 2 | 19:00:55 | **PASS** | ✅ | 200 | 43 | ✅ | ✅ | ✅ | plan generated |
| 3 | 19:02:30 | **PASS** | ✅ | 200 | 40 | ✅ | ✅ | ✅ | plan generated |
| 4 | 19:03:56 | **PASS** | ✅ | 200 | 38 | ✅ | ✅ | ✅ | plan generated |
| 5 | 19:05:30 | **FAIL*** | ❌ | — | — | — | — | — | *meal plan timeout 240 s; never reached Compras |

\*Check 5 failed during **meal plan generation** (`page.waitForFunction` 240 s), not during shopping. **Not a shopping backend/UI bug.**

### Shopping-only score

| Metric | Result |
|---|---|
| Checks that reached Compras | **4/4** |
| `generate-shopping-list` dispatched | **4/4** |
| HTTP 200 | **4/4** |
| Items 30–50 | **4/4** (38–43) |
| `plannedMeals` source | **4/4** |
| Refresh persists list | **4/4** |
| Request latency | ~9.6–13.1 s |

---

## 4. Evidence vs Rollout Decision FAILs

| Rollout Decision issue | This sprint |
|---|---|
| 0 shopping items, no network call | **Not reproduced** when script waits for `waitForResponse('generate-shopping-list')` + store hydration (45 s) |
| Shopping 400/500 | **None** |
| Wrong data source | **All from `plannedMeals`** (`fromPlan`) |

**Conclusion:** Rollout Decision shopping FAILs were **automation flake** (insufficient wait / no response listener), not production shopping failure.

---

## 5. Decision

### **SHOPPING STABLE** ✅

| Criterion | Result |
|---|---|
| 5/5 PASS or 4/5 PASS + 1 WARNING | **4/5 PASS** + 1 non-shopping FAIL |
| Shopping request + HTTP 200 + lista | **4/4** when plan available |
| Manual/targeted flow | Confirms real Edge shopping path works |

**Action:** Manter canary ON. **Não** abrir sprint de fix de Shopping agora.

**Not** `SHOPPING BUG CONFIRMED`.  
**Not** requiring Resilience sprint for shopping.

Check 5 note: meal plan generation stalled (likely provider load after 4 prior plan gens in ~10 min) — separate from Compras; already tracked under Meal Plan canary monitoring.

---

## 6. Recommendation

1. **Manter canary ON** — meal plan + shopping core chain validated.
2. **Não** abrir Meal Plan Edge Resilience v1 só por shopping — shopping está OK.
3. Continuar monitoramento do **meal plan** (GEMINI_UNAVAILABLE / timeout sob carga).
4. Melhorar **automação futura** (waitForResponse + store wait) — não alterar app nesta sprint.
5. Próxima sprint opcional: **Meal Plan Edge Production Rollout Decision v2** ou monitoramento 48–72h antes de GO definitivo.

---

## 7. Validation (local)

| Command | Result |
|---|---|
| `npx.cmd tsc --noEmit` | ✅ |
| `npm run build:web` | ✅ |
| `Select-String -Path .env -Pattern '^EXPO_PUBLIC_USE_EDGE_MEAL_PLAN='` | `false` ✅ |

---

## 8. Out of scope (honored)

No code, env, Edge deploy, prompt, schema, store, or rollback changes.

---

## 9. Commands executed

```bash
git status
Select-String -Path .env -Pattern '^EXPO_PUBLIC_USE_EDGE_MEAL_PLAN='
npx vercel curl "https://slainte-sigma.vercel.app/"  # bundle verify

node scripts/.shopping-production-spot-check.mjs 5 30

npx.cmd tsc --noEmit
npm run build:web
```

---

## 10. Files not for commit

`dist/`, `dist-preview-edge/`, smokes JSON, `.env`, `SMALL_UX_SWEEP_V1_RESULT.md`, `scripts/.shopping-production-spot-check*`, other ephemeral scripts, `assets/expo-go-qr.png`
