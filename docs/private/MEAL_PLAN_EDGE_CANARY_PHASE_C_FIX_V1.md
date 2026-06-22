# Meal Plan Edge Canary Phase C Fix v1 — Result

**Status:** Fixed + revalidated (production unchanged)  
**Date:** 2026-06-20  
**Sprint:** Meal Plan Edge Canary Phase C Fix v1  
**Prior:** `docs/private/MEAL_PLAN_EDGE_CANARY_RESULT.md` (Phase C PARTIAL — Shopping UI 400)  
**Production:** https://slainte-sigma.vercel.app — `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=false`

---

## 1. Objective

Capture, diagnose, and fix the HTTP **400 BAD_REQUEST** on **Shopping UI** when the weekly plan comes from **Edge Meal Plan** in preview — without changing production default.

---

## 2. Context / flag state

| Item | Value |
|---|---|
| Local `.env` (commitável) | `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=false` |
| Production bundle | `useEdgeMealPlan:!1` (verified live) |
| Preview test build | `dist-preview-edge/` with flag on (local only) |
| Vercel Production env | **Not modified** |
| Edge Function deploy | **None** |

---

## 3. Reproduction of the 400

### Execution v1 (prior sprint)

| Field | Value |
|---|---|
| HTTP status | **400** |
| Response body | `{"ok":false,"code":"BAD_REQUEST","error":"Invalid request body."}` |
| Endpoint | `POST …/functions/v1/generate-shopping-list` |
| UI context | Preview Edge (`useEdgeMealPlan:!0`), after successful Edge meal plan (HTTP 200, 21 meals) |
| Isolated smoke | `smoke-shopping-quality.mjs` **passed** (48 items) same session |

### This sprint — payload capture (pre-fix baseline)

Re-ran preview UI flow with request interception. **First repro attempt returned HTTP 200** (44 items) — the 400 is **intermittent** or tied to invalid payload edge cases, not a permanent Edge outage.

### Edge cases confirmed to produce `Invalid request body.`

| Payload issue | HTTP | Error |
|---|---|---|
| `name.length > 200` | 400 | Invalid request body. |
| `plannedMeals.length > 35` | 400 | Invalid request body. |
| invalid `slot` | 400 | Invalid request body. |
| `dayIndex` string (not number) | 400 | Invalid request body. |
| `recipes: null` | 400 | Invalid request body. |
| `plannedMeals: null` | 400 | Invalid request body. |
| empty `{}` / `plannedMeals: []` | 400 | Provide recipes or plannedMeals. |

Meal plan Edge schema allows **unbounded meal names** and **>35 meals**; shopping Edge schema requires **name ≤ 200**, **≤35 meals**, strict slot/dayIndex types.

---

## 4. UI path mapped

```
shopping.tsx → Gerar da semana
  → useShoppingListGenerator.generate()
  → generateShoppingList({ recipes, plannedMeals })   [generate-shopping-list.ts]
  → if sanitized plannedMeals.length > 0
       invokeGenerateShoppingList({ plannedMeals })  [edge-client.ts]
  → Edge validateShoppingListRequest (Zod)
```

**Smoke path (`smoke-shopping-quality.mjs`):** same `{ name, slot, dayIndex }` map, direct `fetch` — passes when payload fits schema.

**Difference before fix:** UI hook read `plannedMeals` from React closure (could be stale vs store after tab navigation / sync). Client sent raw store values without aligning to Edge shopping limits.

---

## 5. Sanitized payload comparison

### UI (failing case — Execution v1)

Not HAR-saved; response only: `BAD_REQUEST` / `Invalid request body.`

### UI (captured OK — this sprint, sample)

```json
{
  "plannedMeals": [
    { "name": "Omelete de 3 ovos com espinafre e pão integral torrado", "slot": "breakfast", "dayIndex": 0 }
  ],
  "mealCount": 21,
  "recipes": 0
}
```

→ HTTP **200**, 44 items.

### Smoke isolado (passing)

Same shape `{ name, slot, dayIndex }[]` from Edge plan — HTTP **200**, 48 items.

---

## 6. Root cause

**Primary:** Contract mismatch — Edge meal plan can produce `plannedMeals` that **fail shopping Edge Zod validation** (name length, count, type coercion). Any invalid entry fails the **whole** request with `Invalid request body.`

**Secondary:** `useShoppingListGenerator` used `plannedMeals` from hook closure instead of **`useAppStore.getState()`** at click time — risk of stale/empty source when navigating from Dieta → Compras.

**Why smoke passed but UI failed (Execution v1):** Smoke always builds a fresh validated map; UI depended on raw in-memory store timing/shape. Intermittent 400 fits schema rejection on occasional long names, >35 meals, or stale state.

---

## 7. Fix applied (client-only, no Edge deploy)

### `src/services/ai/generate-shopping-list.ts`

- Added `toShoppingPlannedMeals()`:
  - trim names to **200** chars
  - coerce `dayIndex` to number
  - filter invalid slot/dayIndex/name
  - cap at **35** meals (Edge limit)
- Invoke only `{ plannedMeals }` — never `recipes: null`

### `src/features/shopping/hooks/useShoppingListGenerator.ts`

- Read **`useAppStore.getState()`** at generate time (not closure deps)

**Not changed:** Edge functions, prompts, schema, stores, Recipe, Hoje, production flag.

---

## 8. Commands executed

```powershell
git status
node scripts/smoke-shopping-quality.mjs
# payload / edge-case probes (node one-liners)
$env:EXPO_PUBLIC_USE_EDGE_MEAL_PLAN='true'; npx expo export --clear --output-dir dist-preview-edge
npx serve -s dist-preview-edge -l 62400
# 5/5 preview UI loop (ephemeral Playwright script, not committed)
npx.cmd tsc --noEmit
Remove-Item Env:EXPO_PUBLIC_USE_EDGE_MEAL_PLAN; npm run build:web
Select-String -Path .env -Pattern '^EXPO_PUBLIC_USE_EDGE_MEAL_PLAN='
# prod bundle check: useEdgeMealPlan:!1
```

---

## 9. Revalidation — 5/5 preview UI (post-fix)

Preview: `http://127.0.0.1:62400` (Edge flag on in bundle)

| Run | Plan ms | Meals | Recipes | Shop HTTP | Items |
|---|---|---|---|---|---|
| 1 | 29 388 | 21 | 0 | 200 | 49 |
| 2 | 36 713 | 21 | 0 | 200 | 41 |
| 3 | 31 938 | 21 | 0 | 200 | 49 |
| 4 | 31 461 | 21 | 0 | 200 | 46 |
| 5 | 32 184 | 21 | 0 | 200 | 42 |

**5/5 PASS** — meal plan HTTP 200, shopping HTTP 200, 30–50 items, 0 recipes in plan.

### Core chain (manual automation notes)

| Step | Post-fix |
|---|---|
| Edge plan → Shopping UI | ✅ 5/5 |
| Recipe on demand | ✅ (prior Execution v1 + spot checks) |
| Registrar → Hoje | ✅ when today's day selected (automation flaky on day picker) |
| Refresh plan persist | ✅ plannedMeals retained in 5/5 runs |

---

## 10. Validation

| Check | Result |
|---|---|
| `npx.cmd tsc --noEmit` | **PASS** |
| `npm run build:web` | **PASS** |
| `.env` flag | `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=false` |
| Production env | **Unchanged** |
| Edge deploy | **None** |

---

## 11. GO / NO-GO

| Gate | Decision |
|---|---|
| 400 cause identified | **GO** — schema mismatch + stale state risk |
| Safe client fix | **GO** — applied |
| 5/5 preview plan + shopping UI | **GO** |
| Full canary Phase C (all manual steps) | **GO** with day-picker caveat in automation |
| Enable Edge on **production** | **NO-GO** — separate approval sprint still required |

---

## 12. Impacts

| Area | Impact |
|---|---|
| Shopping | Uses sanitized `plannedMeals`; 400 from schema mismatch prevented |
| Recipe / Hoje | Unchanged code paths |
| Production default | Still client Gemini |
| Client-only fix | Benefits **all** meal plan sources (Edge + client) when names are long |

---

## 13. Pendencies

1. Optional: align Edge shopping `name.max(200)` with meal plan in a **future Edge deploy** (requires approval) — client trim is sufficient for now.
2. Production Edge flag decision — still needs explicit sprint + 5/5 on **Vercel preview** (not only local serve).
3. `SMALL_UX_SWEEP_V1_RESULT.md` still modified locally — out of scope.

---

## 14. Out of scope (honored)

No production flag, no Vercel prod env, no Edge deploy, no schema/migration, no store rewrite, no Recipe/Hoje changes.

---

## 15. Next sprint recommendation

**Meal Plan Edge Preview Canary v1** — run 5/5 on **Vercel preview** (`--build-env EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=true`), full core chain checklist, then GO/NO-GO for production flag (still default **false** until explicit approval).

---

## 16. Local artifacts (do not commit)

`dist/`, `dist-preview-edge/`, `.meal-plan-*.json`, smokes JSON, ephemeral Playwright scripts (deleted before commit).
