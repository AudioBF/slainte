# Meal Plan Edge Resilience v1 — Result

**Status:** Implemented ✅ (minimal UX/copy resilience)  
**Date:** 2026-06-23  
**Sprint:** Meal Plan Edge Resilience v1  
**Commit base:** `815005e` — `docs(shopping): record production spot check`  
**Production:** https://slainte-sigma.vercel.app — canary ON (`useEdgeMealPlan:!0`, unchanged)

---

## 1. Objective

Improve user experience when Edge Meal Plan fails (`GEMINI_UNAVAILABLE`, TIMEOUT, quota, 503) — clear, recoverable, safe — **without** schema/store/prompt changes, automatic client fallback, or Edge deploy.

---

## 2. Problem observed

| Symptom | Context |
|---|---|
| `GEMINI_UNAVAILABLE` HTTP 503 | Stabilization run 3; rollout check 5 meal-plan timeout |
| Meal plan timeout ~240 s | Provider overload under burst testing |
| Shopping/Receita/Hoje OK | Failures isolated to `generate-meal-plan` |

Users need: clear message, wait guidance, preserved plan, retry without hammering Gemini.

---

## 3. Files inspected

| File | Role |
|---|---|
| `src/services/ai/generate-meal-plan.ts` | Edge vs client routing; no auto-fallback |
| `src/services/ai/edge-client.ts` | `AiEdgeError` with typed `code`; 503/504 mapping |
| `src/services/ai/errors.ts` | User messages (`toAiUserMessage`, `toRecipeUserMessage`) |
| `src/features/diet/hooks/useMealPlanGenerator.ts` | Loading/error; `setMealPlan` only on success |
| `app/(tabs)/diet.tsx` | Button disabled while generating; error display |

---

## 4. Diagnosis (Phase 1)

| Question | Finding |
|---|---|
| Error typed to UI? | **Yes** — `AiEdgeError.code` → `toMealPlanUserMessage` (was generic `toAiUserMessage`) |
| Message clear? | **Partial** — GEMINI/TIMEOUT said "segundos" / "15–30 s"; misaligned with real Edge latency |
| User can retry? | **Yes** — button re-enabled after `finally`; no state wipe |
| Multi-click risk? | **Low** — `disabled={generating}` on button |
| Client fallback? | **Code exists** when `useEdgeMealPlan=false`; **not** auto-invoked on Edge failure |
| App state on failure? | **Recoverable** — `setMealPlan` only on success; existing `plannedMeals` kept |

---

## 5. Solution implemented (Phase 3)

**Scope:** copy + UX only. **No** automatic Edge → client fallback. **No** retry loop. **No** store/schema/Edge deploy.

### `src/services/ai/errors.ts`

- Added `toMealPlanUserMessage()` — meal-plan-specific copy:
  - **GEMINI_UNAVAILABLE:** *O serviço de IA ficou sobrecarregado agora. Espere alguns minutos e tente novamente.*
  - **TIMEOUT:** *A geração demorou mais que o esperado. Tente novamente em alguns minutos.*
- Added `isTransientMealPlanError()` for future UI hints.

### `src/services/ai/edge-client.ts`

- Aligned `messageForEdgeFailure` GEMINI/TIMEOUT copy.
- Map bare HTTP **503** → `GEMINI_UNAVAILABLE` (when envelope not parsed).

### `src/features/diet/hooks/useMealPlanGenerator.ts`

- Uses `toMealPlanUserMessage` instead of `toAiUserMessage`.

### `app/(tabs)/diet.tsx`

- `handleGenerate`: try/catch — success toast only on success (no false positive).
- On error + existing plan: *Seu plano atual foi mantido.*

### Explicitly NOT implemented

- Automatic Edge → client Gemini fallback
- Extra retries / aggressive polling
- Store/schema/prompt/timeout budget changes
- Supabase Edge Function deploy

---

## 6. Validation (Phase 4)

| Check | Result |
|---|---|
| `npx.cmd tsc --noEmit` | ✅ |
| `npm run build:web` | ✅ |
| `.env` commitável | `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=false` ✅ |
| Vercel Production env | **Not changed** |
| Supabase Edge deploy | **None** |
| Canary production | **Still ON** |
| Plan preserved on failure | **Yes** — `setMealPlan` only on success (unchanged behavior, now surfaced in UI) |

### Message mapping (code review)

| Error | User message |
|---|---|
| `GEMINI_UNAVAILABLE` | Espere alguns minutos… |
| `TIMEOUT` / 504 | Tente novamente em alguns minutos |
| `QUOTA_EXCEEDED` | Cota esgotada + billing hint |
| `NETWORK` | Sem conexão estável |

---

## 7. Risks remaining

| Risk | Mitigation |
|---|---|
| Provider overload under peak | User copy advises wait; no auto-retry |
| Long Edge latency (60–120 s+) | Button shows "até 2 min"; TIMEOUT message sets minutes expectation |
| No automatic client fallback | Documented for future sprint if approved |
| Burst testing still stresses Gemini | Operational — space checks 15+ min |

---

## 8. Recommendation

1. **Continue canary ON** — meal plan stable when spaced; shopping confirmed.
2. **Monitor** production for GEMINI_UNAVAILABLE rate over 48–72h.
3. **Repeat rollout decision** after monitoring — not GO definitivo yet.
4. **Do not** implement automatic Edge → client fallback without explicit approval sprint.
5. **Rollback** only if >2/5 spaced failures recur with provider errors.

---

## 9. Out of scope (honored)

Schema, store, prompts, Edge deploy, Vercel env, `.env`, Shopping/Recipe/Hoje changes, rollout definitivo.

---

## 10. Commands executed

```bash
git status
Select-String -Path .env -Pattern '^EXPO_PUBLIC_USE_EDGE_MEAL_PLAN='
npx.cmd tsc --noEmit
npm run build:web
```
