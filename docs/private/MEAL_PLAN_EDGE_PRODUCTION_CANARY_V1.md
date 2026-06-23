# Meal Plan Edge Production Canary v1 — Result

**Status:** Meal Plan Edge Production Canary v1 ✅ **CANARY ON**  
**Date:** 2026-06-23  
**Sprint:** Meal Plan Edge Production Canary v1  
**Commit base:** `a924308` — `docs(meal-plan): record edge preview canary`  
**Prior:** `docs/private/MEAL_PLAN_EDGE_PREVIEW_CANARY_V1.md`  
**Production URL:** https://slainte-sigma.vercel.app

---

## 1. Objective

Controlled **production canary** of Edge Meal Plan — not permanent rollout without validation:

1. Document rollback before activation  
2. Enable `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=true` on Vercel Production  
3. Deploy production  
4. Validate immediately (3 full core-chain runs)  
5. Keep ON only if gates pass  
6. Rollback immediately on critical failure  

---

## 2. Pre-canary state (Phase 0)

| Check | Result |
|---|---|
| Local `.env` commitável | `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=false` ✅ |
| Branch | `master` synced with `origin/master` at `a924308` ✅ |
| Supabase Edge deploy | **None** this sprint ✅ |
| Production bundle (before) | `entry-d4b3aa9b257722ef3b433fba4c51cec9.js` → `useEdgeMealPlan:!1`, `aiMock:!1` ✅ |
| Vercel Production env (before) | `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN` present, value **not** `true` (empty / false-equivalent at build) ✅ |
| `EXPO_PUBLIC_GEMINI_API_KEY` | Retained on Production (client fallback preserved) ✅ |

---

## 3. Rollback plan (documented before activation)

**Target:** restore client Gemini meal plan path in &lt; 5 minutes.

```bash
# 1. Disable flag on Vercel Production
npx vercel env update EXPO_PUBLIC_USE_EDGE_MEAL_PLAN production --value false -y

# 2. Redeploy production (no code change required)
npx vercel deploy --prod

# 3. Verify bundle
npx vercel curl "https://slainte-sigma.vercel.app/"  # note entry-*.js hash
npx vercel curl "https://slainte-sigma.vercel.app/_expo/static/js/web/entry-<hash>.js" | findstr useEdgeMealPlan
# Expected: useEdgeMealPlan:!1

# 4. Smoke: Dieta → Gerar cardápio → plan via client Gemini (no generate-meal-plan Edge call)
```

**Rollback does not require:** Edge Function undeploy, schema change, store change, or removing `EXPO_PUBLIC_GEMINI_API_KEY`.

---

## 4. Activation (Phase 1)

| Step | Command / result |
|---|---|
| Enable Production env | `npx vercel env update EXPO_PUBLIC_USE_EDGE_MEAL_PLAN production --value true -y` |
| Local `.env` | **Not changed** (stays `false`) |
| Production deploy | `npx vercel deploy --prod` |
| Deployment ID | `dpl_CfPTKXpke9fChNN9LxiBUVNvSuBv` |
| Deploy URL | https://slainte-oq25ex90b-audiobfs-projects.vercel.app |
| Aliased | https://slainte-sigma.vercel.app |
| Bundle (after) | `entry-13fe0f67f6a176f5c9662dd563f43367.js` → `useEdgeMealPlan:!0`, `aiMock:!1` ✅ |

---

## 5. Production env before / after

| Variable | Before | After |
|---|---|---|
| `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN` (Production) | empty / false-equivalent | **`true`** |
| `EXPO_PUBLIC_GEMINI_API_KEY` | present | present (unchanged) |
| `EXPO_PUBLIC_AI_MOCK` | false-equivalent | false-equivalent |
| Local `.env` | `false` | `false` (unchanged) |

---

## 6. Bundle before / after

| | Hash | `useEdgeMealPlan` | `aiMock` |
|---|---|---|---|
| **Before** | `entry-d4b3aa9b…` | `!1` | `!1` |
| **After** | `entry-13fe0f67…` | `!0` | `!1` |

---

## 7. Canary runs (Phase 2–3)

**Script (ephemeral):** `scripts/.meal-plan-edge-production-canary.mjs`  
**Account:** `slainte.phase3b.ui+1781627000000@example.com`  
**Raw JSON (local, not committed):** `scripts/.meal-plan-edge-production-canary-results.json`  
**Timestamp:** 2026-06-23T14:46:52Z

### Automation note

First automation attempt aborted on run 1 (`waitForURL` recipe timeout — unhandled exception). Manual debug on production confirmed meal plan **HTTP 200** (21 meals) and recipe **HTTP 200** (~12 s). Script hardened (try/catch + 120 s recipe timeout); **second suite: 3/3 functional pass**.

### Summary table

| Run | OK | Plan (ms) | HTTP plan | Meals | Recipes | Shop items | HTTP shop | Recipe | Hoje | Refresh |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | ✅ | 36 270 | 200 | 21 | 0 | 38 | 200 | 200 | ✅ | ✅ |
| 2 | ✅ | 69 627 | 200 | 21 | 0 | 41 | 200 | 200 | ✅ | ✅ |
| 3 | ✅ | 49 875 | 200 | 21 | 0 | 40 | 200 | 200 | ✅ | ✅ |

### Per-step detail

| Run | Recipe polish | Shopping from plan | loggedMeals | Refresh plan / shop / recipe |
|---|---|---|---|---|
| 1 | all v1.1 ✅ | ✅ | 1 | 21 / 38 / 1 |
| 2 | all v1.1 ✅ | ✅ | 1 | 21 / 41 / 1 |
| 3 | all v1.1 ✅ | ✅ | 1 | 21 / 40 / 1 |

### Critical gates (3/3)

| Gate | Result |
|---|---|
| TIMEOUT | none |
| QUOTA_EXCEEDED | none |
| 504 HTML | none |
| GEMINI_UNAVAILABLE | none |
| Meal plan HTTP 200 | 3/3 |
| plannedMeals ≥ 21 | 3/3 (all 21) |
| recipes in plan = 0 | 3/3 |
| Shopping HTTP 200 | 3/3 |
| Shopping 400/500 | none |
| Recipe OK | 3/3 |
| Hoje OK | 3/3 |
| Refresh plan persists | 3/3 |

Shopping item count: **38–41** (within 30–50). No warnings.

---

## 8. Errors / warnings

| Item | Severity | Notes |
|---|---|---|
| First automation run recipe `waitForURL` timeout | Automation only | Production recipe verified OK on manual debug; not a prod gate failure |
| Recipe latency run 1 | Info | ~30 s (within acceptable range) |
| Plan latency run 2 | Info | ~70 s (within 240 s gate) |

---

## 9. Decision

### **CANARY ON** ✅

Edge Meal Plan remains **enabled** on Vercel Production (`EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=true`).

This is a **controlled canary**, not declared permanent rollout. Client Gemini fallback remains in codebase and `EXPO_PUBLIC_GEMINI_API_KEY` remains on Vercel for rollback.

### Rollback was **not** required.

---

## 10. Final production state

| Item | Value |
|---|---|
| URL | https://slainte-sigma.vercel.app |
| Deployment | `dpl_CfPTKXpke9fChNN9LxiBUVNvSuBv` |
| `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN` (Production) | **`true`** |
| Bundle | `entry-13fe0f67…` → `useEdgeMealPlan:!0` |
| Local `.env` | `false` (unchanged) |
| Supabase Edge deploy | **None** |

---

## 11. Risks & monitoring (post-canary)

| Risk | Mitigation |
|---|---|
| Gemini quota | Monitor Edge logs; rollback via flag if spike |
| Latency variance (36–70 s plan) | User copy already mentions 15–30 s; watch P95 |
| Shopping item count &gt; 50 | Preview saw 54 once; monitor; not a rollback trigger alone |
| Multi-user / peak load | Not validated this sprint — recommend Production Stabilization sprint |
| Cross-device refresh / login | Single test account only |

---

## 12. Recommendation — next sprint

**Meal Plan Edge Production Stabilization v1:**

- 48–72 h spot-check on real usage  
- Optional spaced smoke (5/5) on production  
- Dashboard / alert on `generate-meal-plan` error rate  
- Document go/no-go for **permanent** rollout vs keeping canary with rollback drill quarterly  

---

## 13. Validation (local, post-sprint)

| Command | Result |
|---|---|
| `npx.cmd tsc --noEmit` | ✅ |
| `npm run build:web` | ✅ |
| `Select-String -Path .env -Pattern '^EXPO_PUBLIC_USE_EDGE_MEAL_PLAN='` | `false` ✅ |

---

## 14. Out of scope (honored)

- Supabase Edge Function deploy  
- Prompt / schema / store changes  
- Removing client fallback or feature flag  
- Shopping item count optimization  
- Recipe / Hoje code changes  

---

## 15. Commands executed (reference)

```bash
git status
Select-String -Path .env -Pattern '^EXPO_PUBLIC_USE_EDGE_MEAL_PLAN='
npx vercel env ls
npx vercel env pull .env.vercel.check --environment=production --yes   # pre-check

# Activation
npx vercel env update EXPO_PUBLIC_USE_EDGE_MEAL_PLAN production --value true -y
npx vercel deploy --prod

# Bundle verify
npx vercel curl "https://slainte-sigma.vercel.app/_expo/static/js/web/entry-13fe0f67f6a176f5c9662dd563f43367.js"

# Canary
node scripts/.meal-plan-edge-production-canary.mjs 3

# Local validation
npx.cmd tsc --noEmit
npm run build:web
```

---

## 16. Files not for commit

- `dist/`, `dist-preview-edge/`
- `.meal-plan-*.json`, smoke JSON
- `scripts/.meal-plan-edge-production-canary*`, `scripts/.prod-debug-recipe.mjs`
- `.env`, `.env.vercel.*`
- `docs/private/SMALL_UX_SWEEP_V1_RESULT.md`
- `assets/expo-go-qr.png`
