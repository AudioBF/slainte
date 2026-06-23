# Meal Plan Edge Production Rollout Decision v1 — Result

**Status:** **CANARY WARNING** ⚠️ — manter canary ON; **não** declarar rollout definitivo  
**Date:** 2026-06-23  
**Sprint:** Meal Plan Edge Production Rollout Decision v1  
**Commit base:** `ec64629` — `docs(meal-plan): record edge production stabilization`  
**Prior:** `docs/private/MEAL_PLAN_EDGE_PRODUCTION_STABILIZATION_V1.md`  
**Production URL:** https://slainte-sigma.vercel.app

---

## 1. Objective

Spaced production spot-checks and a controlled decision: **GO definitivo**, **CANARY WARNING**, or **ROLLBACK** — without code changes.

---

## 2. Initial state (Phase 0)

| Check | Result |
|---|---|
| Local `.env` commitável | `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=false` ✅ |
| Vercel Production env | `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=true` (Production) ✅ |
| Production bundle | `entry-13fe0f67f6a176f5c9662dd563f43367.js` → `useEdgeMealPlan:!0`, `aiMock:!1` ✅ |
| Supabase Edge deploy | **None** ✅ |
| Rollback plan | `MEAL_PLAN_EDGE_PRODUCTION_CANARY_V1.md` §3 ✅ |
| Branch | `master` at `ec64629`, synced with `origin/master` ✅ |

### Rollback plan (reference)

```bash
npx vercel env update EXPO_PUBLIC_USE_EDGE_MEAL_PLAN production --value false -y
npx vercel deploy --prod
# verify bundle useEdgeMealPlan:!1
```

**Rollback executed:** **No**

---

## 3. Spaced spot-checks (Phase 1)

**Script (ephemeral):** `scripts/.meal-plan-edge-rollout-decision.mjs`  
**Raw JSON (local, not committed):** `scripts/.meal-plan-edge-rollout-decision-results.json`  
**Account:** `slainte.phase3b.ui+1781627000000@example.com`  
**Runs:** 5  
**Gap between runs:** **15 min** (~900 s each)  
**Total window:** 2026-06-23T15:18:35Z → 2026-06-23T16:26:34Z (~68 min)

### Schedule

| Interval | Gap (ms) |
|---|---|
| Run 1 → 2 | 900 008 (~15.0 min) |
| Run 2 → 3 | 900 014 (~15.0 min) |
| Run 3 → 4 | 897 501 (~15.0 min) |
| Run 4 → 5 | 900 007 (~15.0 min) |

### Summary table

| Run | Class | Started (UTC) | Plan (ms) | HTTP plan | Meals | Recipes | Shop items | HTTP shop | Recipe | Hoje | Refresh |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **FAIL** | 15:18:35 | 49 593 | 200 | 21 | 0 | **0** | — | 200 | ✅ | plan✅ shop❌ |
| 2 | **PASS** | 15:35:16 | 46 841 | 200 | 21 | 0 | 42 | 200 | 200 | ✅ | ✅ |
| 3 | **WARN** | 15:51:44 | 47 868 | 200 | 21 | 0 | **53** | 200 | 200 | ✅ | ✅ |
| 4 | **FAIL** | 16:08:17 | 69 108 | 200 | 21 | 0 | **0** | — | 200 | ✅ | plan✅ shop❌ |
| 5 | **PASS** | 16:25:07 | 36 098 | 200 | 21 | 0 | 38 | 200 | 200 | ✅ | ✅ |

### Classification counts

| Class | Count |
|---|---|
| PASS | 2 |
| WARNING | 1 |
| FAIL | 2 |

---

## 4. Per-run analysis

### Meal plan (all 5 runs)

| Signal | Result |
|---|---|
| HTTP 200 | **5/5** |
| plannedMeals ≥ 21 | **5/5** (all 21) |
| recipes in plan | **5/5** (all 0) |
| GEMINI_UNAVAILABLE | **0** |
| TIMEOUT / quota / 504 | **0** |

**Edge Meal Plan em produção estável nos 5 checks espaçados** — melhora vs Stabilization v1 (GEMINI_UNAVAILABLE sob burst).

### FAIL runs 1 e 4 — shopping

| Field | Run 1 | Run 4 |
|---|---|---|
| `generate-shopping-list` network call | **none** | **none** |
| `shoppingItems` | 0 | 0 |
| Meal plan | ✅ 200 | ✅ 200 |
| Recipe | ✅ 200 | ✅ 200 |
| Hoje / loggedMeals | ✅ | ✅ |

**Interpretação:** falha de **automação/UI** no passo Compras (lista não gerada no store em ~18 s; sem 400/500). **Não** é regressão do Edge meal plan nem `GEMINI_UNAVAILABLE`. Runs 2, 3, 5 shopping OK (HTTP 200, 38–53 itens).

### WARNING run 3

Shopping **53 itens** (+3 acima da faixa 30–50) — variação aceitável, mesma faixa vista no preview canary.

---

## 5. Stability signals (Phase 2–4)

| Signal | Observed |
|---|---|
| GEMINI_UNAVAILABLE | none (5 spaced runs) |
| TIMEOUT / quota / 504 HTML | none |
| Meal plan failure | none |
| Shopping 400/500 | none |
| Recipe / Hoje / Refresh (when chain ran) | OK |
| Logs dashboard | not available in repo — network capture only |

---

## 6. Decision (Phase 3)

### **CANARY WARNING** ⚠️

| Criterion | Assessment |
|---|---|
| GO definitivo (5/5 PASS or 4/5 PASS + 1 WARN) | **No** — 2 PASS, 1 WARN, 2 FAIL |
| ROLLBACK (>2/5 FAIL or padrão provider) | **No** — 2 FAIL ≤ threshold; **0** provider fails |
| Meal plan stability | **Strong** — 5/5 HTTP 200 |
| Shopping reliability | **Mixed** — 3/5 full chain; 2 shopping automation misses |
| Production usable | **Yes** — meal plan + recipe + hoje work; shopping works when invoked |

**Action:** Manter **`EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=true`**. **Não** declarar rollout definitivo.

**Rollback:** **Not executed.**

---

## 7. Final production state

| Item | Value |
|---|---|
| URL | https://slainte-sigma.vercel.app |
| `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN` | **`true`** |
| Bundle | `entry-13fe0f67…` → `useEdgeMealPlan:!0` |
| Local `.env` | `false` |
| Supabase Edge deploy | **None** |

---

## 8. Recommendation — next sprint

1. **Manter canary ON** — meal plan Edge provou estável em 5 checks espaçados sem `GEMINI_UNAVAILABLE`.
2. **Não** GO definitivo ainda — 2/5 runs sem shopping completo na automação; validar se é flake de teste ou UX real.
3. **Sugerida:** **Meal Plan Edge Resilience v1** — retry/mensagem/fallback **ou** investigação shopping UI (separada; fora desta sprint).
4. Opcional: 3 spot-checks manuais de **só Compras** em produção antes de GO definitivo.
5. Se **>2/5** falhas de meal plan com `GEMINI_UNAVAILABLE`/TIMEOUT em checks espaçados → **rollback**.

---

## 9. Validation (local)

| Command | Result |
|---|---|
| `npx.cmd tsc --noEmit` | ✅ |
| `npm run build:web` | ✅ |
| `Select-String -Path .env -Pattern '^EXPO_PUBLIC_USE_EDGE_MEAL_PLAN='` | `false` ✅ |

---

## 10. Out of scope (honored)

No code, Edge deploy, prompt, schema, or store changes.

---

## 11. Commands executed

```bash
git status
Select-String -Path .env -Pattern '^EXPO_PUBLIC_USE_EDGE_MEAL_PLAN='
npx vercel env ls
npx vercel curl "https://slainte-sigma.vercel.app/"  # bundle verify

node scripts/.meal-plan-edge-rollout-decision.mjs 5 15

npx.cmd tsc --noEmit
npm run build:web
```

---

## 12. Files not for commit

`dist/`, `dist-preview-edge/`, smokes JSON, `.env`, `SMALL_UX_SWEEP_V1_RESULT.md`, `scripts/.meal-plan-edge-*`, `scripts/.rollout-*`, `assets/expo-go-qr.png`
