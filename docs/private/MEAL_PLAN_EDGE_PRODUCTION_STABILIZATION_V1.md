# Meal Plan Edge Production Stabilization v1 — Result

**Status:** **CANARY WARNING** — manter canary ON; monitorar 48–72h  
**Date:** 2026-06-23  
**Sprint:** Meal Plan Edge Production Stabilization v1  
**Commit base:** `03a896d` — `docs(meal-plan): record edge production canary`  
**Prior:** `docs/private/MEAL_PLAN_EDGE_PRODUCTION_CANARY_V1.md`  
**Production URL:** https://slainte-sigma.vercel.app

---

## 1. Objective

Monitor and stabilize Edge Meal Plan in production during the **controlled canary** period — spot-checks, stability signals, GO/WARNING/ROLLBACK decision. No code changes.

---

## 2. Initial state (Phase 0)

| Check | Result |
|---|---|
| Production bundle | `entry-13fe0f67f6a176f5c9662dd563f43367.js` → `useEdgeMealPlan:!0`, `aiMock:!1` ✅ |
| Local `.env` commitável | `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=false` ✅ |
| Vercel Production env | `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN` on **Production** (encrypted, updated 7d ago) ✅ |
| Supabase Edge deploy | **None** this sprint ✅ |
| Rollback plan | Documented in `MEAL_PLAN_EDGE_PRODUCTION_CANARY_V1.md` §3 ✅ |
| Branch | `master` at `03a896d`, synced with `origin/master` ✅ |

### Rollback plan (reference)

```bash
npx vercel env update EXPO_PUBLIC_USE_EDGE_MEAL_PLAN production --value false -y
npx vercel deploy --prod
# verify bundle useEdgeMealPlan:!1
```

**Rollback executed this sprint:** **No**

---

## 3. Spot-checks (Phase 1)

**Script (ephemeral):** `scripts/.meal-plan-edge-production-canary.mjs`  
**Raw JSON (local, not committed):** `scripts/.meal-plan-edge-stabilization-results.json`  
**Account:** `slainte.phase3b.ui+1781627000000@example.com`  
**Timestamp:** 2026-06-23T15:03:38Z  
**Note:** 3 runs sequenciais (~9 min total) — carga concentrada no Gemini.

### Summary table

| Run | Result | Plan (ms) | HTTP plan | Meals | Recipes | Shop items | HTTP shop | Recipe | Hoje | Refresh |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | ✅ | 75 707 | 200 | 21 | 0 | 44 | 200 | 200 | ✅ | ✅ |
| 2 | ✅ | 67 251 | 200 | 21 | 0 | 37 | 200 | 200 | ✅ | ✅ |
| 3 | ❌ | >240 000 | — | 0 | — | — | — | — | — | — |

### Run 3 failure analysis

| Field | Value |
|---|---|
| Automation error | `meal-plan-timeout` — 240 s wait, 0 `plannedMeals` in store |
| Follow-up debug (same session window) | `generate-meal-plan` **HTTP 503** — `GEMINI_UNAVAILABLE` |
| UI copy | *O Gemini está sobrecarregado no momento…* |
| Interpretation | **Transient Gemini overload**, not Shopping/auth/refresh regression |

Runs 1–2 completed full core chain with recipe polish v1.1 ✅ on all checks.

---

## 4. Stability signals (Phase 2)

| Signal | Observed |
|---|---|
| TIMEOUT (Edge code) | none on successful runs |
| QUOTA_EXCEEDED | none |
| 504 HTML | none |
| GEMINI_UNAVAILABLE | **yes** — run 3 + debug (503, isolated) |
| Shopping 400/500 | none |
| Invalid JSON | none |
| plannedMeals &lt; 21 (on success) | none |
| recipes &gt; 0 in plan | none |
| Shopping item count | 37–44 (within 30–50) |
| Refresh data loss | none on runs 1–2 |
| Auth/session | stable on runs 1–2 |

### Logs / observability

No dedicated Vercel/Supabase log dashboard wired in repo. Light inference from Playwright network capture only. **No extended observability pass** (per sprint scope).

### Warnings

| Warning | Severity |
|---|---|
| Plan latency 67–76 s (runs 1–2) | Info — above UI copy “15–30 s” but within 240 s gate |
| Recipe latency run 2 ~40 s | Info |
| Run 3 `GEMINI_UNAVAILABLE` after 2 rapid successes | **Relevant** — external capacity, not app regression |
| Sequential 3× full chain in ~9 min | May amplify Gemini rate pressure |

---

## 5. Decision (Phase 3)

### **CANARY WARNING** ⚠️

| Criterion | Assessment |
|---|---|
| Spot-checks pass | **2/3** full pass |
| Critical app regression | **None** on successful runs |
| Transient external failure | **Yes** — `GEMINI_UNAVAILABLE` on run 3 |
| Production usable | **Yes** (runs 1–2; failure is retryable overload message) |
| Rollback required | **No** — not persistent TIMEOUT/quota/504/shopping break |

**Action:** **Keep canary ON** (`EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=true`). Continue monitoring toward **48–72h** before definitive rollout decision.

**Not classified as CANARY STABLE** because 1/3 spot-check failed with `GEMINI_UNAVAILABLE`.

**Not classified as ROLLBACK** because failure is isolated, transient, and core chain passed 2/3 including shopping/receita/hoje/refresh.

---

## 6. Final production state

| Item | Value |
|---|---|
| URL | https://slainte-sigma.vercel.app |
| `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN` (Production) | **`true`** (unchanged) |
| Bundle | `entry-13fe0f67…` → `useEdgeMealPlan:!0` |
| Local `.env` | `false` (unchanged) |
| Supabase Edge deploy | **None** |
| Rollback | **Not executed** |

---

## 7. Recommendation

1. **Manter canary ON** por 48–72h com spot-checks **espaçados** (≥15 min entre runs; evitar burst).
2. **Repetir spot-check** após janela de monitoramento antes de GO definitivo.
3. Se `GEMINI_UNAVAILABLE` ou meal-plan failure **&gt;2/5** em checks espaçados → considerar rollback ou sprint de resiliência (retry UX já existe; não alterar nesta sprint).
4. **Próxima sprint sugerida:** Meal Plan Edge Production Rollout Decision v1 (GO definitivo vs rollback) após 48–72h.

---

## 8. Validation (local)

| Command | Result |
|---|---|
| `npx.cmd tsc --noEmit` | ✅ |
| `npm run build:web` | ✅ |
| `Select-String -Path .env -Pattern '^EXPO_PUBLIC_USE_EDGE_MEAL_PLAN='` | `false` ✅ |

---

## 9. Out of scope (honored)

- Code / Edge Function / prompt / schema / store changes  
- Rollback (not triggered)  
- Client fallback removal  

---

## 10. Commands executed (reference)

```bash
git status
Select-String -Path .env -Pattern '^EXPO_PUBLIC_USE_EDGE_MEAL_PLAN='
npx vercel env ls
npx vercel curl "https://slainte-sigma.vercel.app/"  # bundle hash
npx vercel curl ".../entry-13fe0f67f6a176f5c9662dd563f43367.js"  # useEdgeMealPlan:!0

node scripts/.meal-plan-edge-production-canary.mjs 3
node scripts/.prod-stab-debug-run3.mjs   # post run-3 debug

npx.cmd tsc --noEmit
npm run build:web
```

---

## 11. Files not for commit

- `dist/`, `dist-preview-edge/`
- `.meal-plan-*.json`, smoke JSON
- `scripts/.meal-plan-edge-*`, `scripts/.prod-stab-*`
- `.env`
- `docs/private/SMALL_UX_SWEEP_V1_RESULT.md`
- `assets/expo-go-qr.png`
