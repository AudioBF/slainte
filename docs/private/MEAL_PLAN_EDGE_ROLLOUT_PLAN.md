# Meal Plan Edge Rollout — Plan

**Status:** Planning only. No app code changed.  
**Goal:** Validate safely that `generate-meal-plan` via Supabase Edge Function is production-ready behind `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=true`, while keeping the client Gemini fallback (`EXPO_PUBLIC_GEMINI_API_KEY`) until the Edge path is proven.  
**Context:** Sprint 1C implemented the Edge Function and feature flag. Production today still uses the client fallback (flag `false`/absent). Edge auth hardening is deployed; signed-in Edge calls reached Gemini but were blocked by `QUOTA_EXCEEDED` — no successful end-to-end meal plan via Edge yet.  
**Prerequisite:** Shopping 3D closed; `analyze-meal` and `generate-shopping-list` already on Edge in production.

---

## 1. Contexto atual

### O que já existe (Sprint 1C)

| Piece | Status |
|---|---|
| `supabase/functions/generate-meal-plan/index.ts` | Deployed (project `vukpkqcelmboqnptyceu`) |
| `verify_jwt = true` + `requireAuthenticatedUser()` | Deployed on all three AI functions |
| `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN` | Read in `src/lib/env.ts`; `true` → Edge, else client |
| Client routing | `src/services/ai/generate-meal-plan.ts` |
| Error envelopes | `src/services/ai/edge-client.ts` + `toAiUserMessage()` |
| Variety loop + schema | Server-side in Edge (`_shared/meal-plan.ts`, `_shared/gemini.ts`) |
| UI / hook | `useMealPlanGenerator` → `generateMealPlan()` — unchanged public API |

### Produção hoje (Vercel PWA)

```env
EXPO_PUBLIC_AI_MOCK=false          # real AI for photo/shopping (Edge)
EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=false  # or unset → meal plan uses client key
EXPO_PUBLIC_GEMINI_API_KEY=AIza...   # still required for meal plan
```

| Flow | Runtime |
|---|---|
| Meal photo | Edge `analyze-meal` |
| Shopping list | Edge `generate-shopping-list` |
| **Meal plan** | **Client** `generateStructuredJson()` via `EXPO_PUBLIC_GEMINI_API_KEY` |

### Validação Sprint 1C (parcial)

| Test | Result |
|---|---|
| Flag off → client path | ✅ Passed (production smoke) |
| Flag on + signed out | ✅ `UNAUTHORIZED` before invoke |
| Flag on + anon JWT to Edge | ✅ `401 UNAUTHORIZED` after auth hardening |
| Flag on + signed in | ⚠️ Request reached Edge; Gemini returned `QUOTA_EXCEEDED` |
| Successful meal plan via Edge | ❌ Not yet observed |

### Decisão arquitetural crítica (manter)

**Não há fallback automático Edge → client.** Se `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=true` e o Edge falha, o usuário vê erro — o app **não** chama `EXPO_PUBLIC_GEMINI_API_KEY` em silêncio.

Rollback é **explícito**: desligar a flag e redeploy Vercel. Isso é intencional para não mascarar falhas do Edge em produção. **Não propor remover esse modelo nesta sprint.**

---

## 2. Objetivo da sprint

Validar operacionalmente o caminho Edge do meal plan em condições reais, com rollout controlado por flag, antes de qualquer remoção da chave pública.

**Entregáveis desta sprint (planejamento + execução futura):**

1. Checklist de smoke test reproduzível (local + produção).
2. Matriz de falhas com mensagem PT-BR esperada e ação operacional.
3. Critérios objetivos de go/no-go para ligar `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=true` em produção.
4. Plano de rollback em &lt; 5 minutos (flag off + redeploy).
5. Critérios para **só então** planejar remoção de `EXPO_PUBLIC_GEMINI_API_KEY` (sprint separada).

**Não é objetivo desta sprint:** remover chave pública, mudar schemas/prompts, redesign de UI, ou observabilidade pesada.

---

## 3. Caminho atual: client fallback vs Edge Function

### Diagrama

```
useMealPlanGenerator (Dieta tab)
        │
        ▼
generateMealPlan(profile)          ← public API unchanged
        │
        ├── env.aiMock === true
        │       └── mock delay + mockPlannedMeals / mockRecipes
        │
        ├── env.useEdgeMealPlan === true          ← ROLLOUT PATH
        │       └── invokeGenerateMealPlan({ profile })
        │               └── edge-client.ts
        │                       ├── no Supabase client → CONFIGURATION
        │                       ├── no session token → UNAUTHORIZED (client, pre-flight)
        │                       └── supabase.functions.invoke('generate-meal-plan')
        │                               └── Edge: auth → validate body → variety loop
        │                                       └── GEMINI_API_KEY (Supabase secret)
        │               └── mealPlanSchema.parse(raw)  ← client defense
        │
        └── else (PRODUCTION TODAY)
                ├── !hasGeminiKey() → mock fallback
                └── client variety loop (MAX_VARIETY_ATTEMPTS = 2)
                        └── generateStructuredJson({ task: 'mealPlan' })
                                └── EXPO_PUBLIC_GEMINI_API_KEY (client bundle)
```

### Paridade esperada Edge vs client

| Concern | Client path | Edge path |
|---|---|---|
| Prompt builders | `meal-plan.prompt.ts` | `_shared/meal-plan.ts` (Deno copy) |
| Response schema | `mealPlanResponseSchema` | Same (shared module) |
| Variety validation | `validateMealPlanVariety()` | Same logic server-side |
| Max attempts | `MAX_VARIETY_ATTEMPTS = 2` | Same |
| Long restrictions (`> 120` chars) | Pro-first model chain | Same (`useProFallback`) |
| Timeout | `mealPlanTimeoutMs = 120_000` | Same in `_shared/gemini.ts` |
| Soft accept on variety fail | Warning in `summary` | Same copy |
| Final client parse | N/A (in-loop) | `mealPlanSchema.parse()` after invoke |

### Diferenças operacionais (não de produto)

| | Client | Edge |
|---|---|---|
| Auth required | No (key in bundle) | Yes — Supabase session |
| Gemini credential | `EXPO_PUBLIC_GEMINI_API_KEY` | `GEMINI_API_KEY` secret |
| Quota bucket | Project tied to public key | Project tied to Edge secret (may differ) |
| Logs | Browser console only | Supabase Functions logs + browser network |

---

## 4. Estratégia de rollout por flag

### Princípios

1. **Flag off = safe default** — produção continua no client até go explícito.
2. **Um ambiente de cada vez** — local → preview/staging → produção.
3. **Nunca ligar flag e remover chave no mesmo deploy.**
4. **Quota estável antes do go** — `QUOTA_EXCEEDED` no smoke Edge é no-go.
5. **Rollback = flag off**, não hotfix de código (salvo bug crítico).

### Fases

| Phase | Where | `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN` | `EXPO_PUBLIC_GEMINI_API_KEY` | Purpose |
|---|---|---|---|---|
| **0 — Baseline** | Production (now) | `false` / unset | Set | Confirm Dieta works; document baseline |
| **1 — Local dev** | `npm run web` + `.env` | `true` | Keep set (unused when flag on) | E2E Edge with signed-in user |
| **2 — Quota gate** | Google AI Studio + Supabase secrets | `true` (local) | Keep | Confirm `GEMINI_API_KEY` secret has quota; successful generation |
| **3 — Preview** | Vercel preview deploy | `true` | Keep | Same smoke on preview URL; no user impact |
| **4 — Production canary** | Vercel production | `true` | **Keep** | Real users on Edge; rollback ready |
| **5 — Soak** | Production | `true` | Keep | 48–72h without P0; manual spot checks |
| **6 — Decommission** | Future sprint | `true` | Remove | Only after §9 criteria met |

### Vercel env checklist (Phase 3+)

| Variable | Production value during rollout |
|---|---|
| `EXPO_PUBLIC_AI_MOCK` | `false` |
| `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN` | `false` until Phase 4 go |
| `EXPO_PUBLIC_GEMINI_API_KEY` | **Remain set** until Phase 6 |
| `EXPO_PUBLIC_SUPABASE_URL` | Set |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Set |

Supabase secret (dashboard / CLI, **not** Vercel):

```bash
npx supabase secrets set GEMINI_API_KEY=AIza... --project-ref vukpkqcelmboqnptyceu
```

### O que **não** fazer

| Anti-pattern | Why |
|---|---|
| Set flag `true` and delete client key same day | No rollback without redeploy + key restore |
| Auto-fallback Edge → client on error | Masks Edge failures; violates 1C design |
| Enable flag globally while quota exhausted | 100% failure rate on Dieta |
| Change prompts/schemas during rollout | Confounds validation |

---

## 5. Matriz de falhas

Expected user message via `toAiUserMessage()` unless noted. Operational action for on-call / dev.

| Failure | Origin | HTTP / code | User message (PT-BR) | Operational action |
|---|---|---|---|---|
| **QUOTA_EXCEEDED** | Gemini 429 / free tier 0 | 429, `QUOTA_EXCEEDED` | *Cota da API esgotada. Aguarde o reset ou verifique billing no Google AI Studio.* | Check [Google AI Studio](https://aistudio.google.com/) quota for **Edge secret key**; enable billing or wait reset; **do not enable production flag** until resolved |
| **UNAUTHORIZED** (no session) | `edge-client.ts` pre-flight | 401, `UNAUTHORIZED` | *Entre na conta para usar a IA.* | Expected when signed out; prompt user to Account modal — not a rollout blocker |
| **UNAUTHORIZED** (anon JWT) | Edge `requireAuthenticatedUser` | 401, `UNAUTHORIZED` | *Entre na conta para usar a IA.* | Expected; verify auth hardening still deployed |
| **UNAUTHORIZED** (expired session) | Edge or client session | 401 | Same | Re-login; check Supabase auth persistence |
| **timeout** | `REQUEST_TIMEOUT` / 504 | `TIMEOUT` | *A IA demorou demais para responder. Tente novamente — costuma levar 15–30 segundos.* | Normal occasionally (meal plan 30–90s); retry; if frequent, check Supabase function duration limits |
| **5xx / GEMINI_UNAVAILABLE** | Gemini overload / model 503 | 503, `GEMINI_UNAVAILABLE` | *O Gemini está sobrecarregado no momento. Aguarde alguns segundos e tente de novo.* | Retry; check Gemini status; consider delaying flag go |
| **5xx / INTERNAL** | Unhandled Edge error | 500, `INTERNAL` | *Não foi possível completar a operação. Tente novamente.* | Supabase function logs; inspect stack; rollback if widespread |
| **5xx / FUNCTION** | Invoke transport error | varies, `FUNCTION` | Generic or function message | Network tab; Supabase status; CORS unlikely (same pattern as shopping) |
| **schema inválido** | Zod parse fail (client or Edge) | 502, `VALIDATION` | *A IA retornou um formato inválido. Toque em gerar novamente.* | Retry; if persistent, compare Edge vs client output; **do not** change schema during rollout |
| **resposta vazia/parcial** | `!data` from invoke | `FUNCTION` | *A função de IA não retornou dados.* or generic | Logs; timeout vs truncated response; retry |
| **usuário não autenticado** | Client blocks before invoke | `UNAUTHORIZED` | *Entre na conta para usar a IA.* | Product expectation for Edge path; document in support copy |
| **Supabase/env ausente** | `getSupabase()` null | `CONFIGURATION` | *Supabase não configurado para usar a IA.* | Verify Vercel env vars; rebuild |
| **GEMINI_API_KEY missing on Edge** | Secret not set | 500, `CONFIGURATION` | *Supabase não configurado…* or internal | `supabase secrets list`; set `GEMINI_API_KEY` |
| **NETWORK** | Fetch failed | `NETWORK` | *Sem conexão estável. Verifique a internet e tente novamente.* | User connectivity; not Edge-specific |
| **BAD_REQUEST** | Invalid profile body | 400 | Validation message | Client bug sending profile; check request payload |

### Edge vs client quota independence

`QUOTA_EXCEEDED` on Edge does **not** prove client path is down (and vice versa). Smoke both keys separately before go/no-go.

---

## 6. Observabilidade mínima

No Sentry, no analytics pagos, no new infra. Manual signals only.

### Logs necessários

| Signal | Where | What to capture |
|---|---|---|
| Invoke request | Browser DevTools → Network | `generate-meal-plan` status, duration, response body `{ ok, code, error }` |
| Client error | Browser console | `AiEdgeError` code + message before `toAiUserMessage` |
| Edge execution | Supabase Dashboard → Edge Functions → `generate-meal-plan` → Logs | Invocations, errors, duration, Gemini errors |
| Secret presence | Supabase Dashboard → Project Settings → Edge Functions → Secrets | `GEMINI_API_KEY` exists (not value) |
| Vercel env | Vercel project → Settings → Environment Variables | Flag value at deploy time |
| Auth state | App → Account modal | Signed in / signed out during test |

### Onde verificar

| Tool | URL / path |
|---|---|
| Live PWA | https://slainte-sigma.vercel.app |
| Supabase project | Dashboard → project `vukpkqcelmboqnptyceu` |
| Function logs | Edge Functions → `generate-meal-plan` |
| Gemini quota | [Google AI Studio](https://aistudio.google.com/) → API keys used by Edge secret |
| Vercel deploys | Deploy log confirms env at build time |

### Sinais manuais no smoke test (registrar em RESULT doc)

For each run, record:

| Field | Example |
|---|---|
| Date / env | `2026-06-16, local web` |
| `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN` | `true` |
| Signed in? | yes |
| Restrictions length | `0` / `150` (Pro path) |
| Network status | `200` |
| Response `ok` | `true` |
| Duration (s) | `45` |
| `plannedMeals.length` | `28` |
| `recipes.length` | `≥ 1` |
| Error `code` if fail | `QUOTA_EXCEEDED` |
| User-visible message | Portuguese string |
| Rollback needed? | yes/no |

---

## 7. Critérios de go/no-go

### NO-GO (keep flag `false` in production)

- Any mandatory smoke test fails on preview with flag `true`.
- `QUOTA_EXCEEDED` on Edge secret during Phase 2.
- Successful generation rate &lt; 100% in **5 consecutive** signed-in manual runs (Phase 2–3).
- `UNAUTHORIZED` for signed-in user (regression vs 1C hardening).
- Systematic `VALIDATION` / `INTERNAL` without retry success.
- Supabase `GEMINI_API_KEY` secret missing or wrong project.
- No documented rollback tested at least once.

### GO (Phase 4 — enable `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=true` on Vercel production)

All required:

1. **5/5** successful meal plan generations via Edge on preview (or local pointing to prod Supabase), signed in, `EXPO_PUBLIC_AI_MOCK=false`.
2. At least **1** run with restrictions `> 120` chars (Pro chain).
3. Signed-out attempt shows *Entre na conta para usar a IA.* — no plan written.
4. Flag-off rollback tested: set `false`, redeploy, confirm client path still generates.
5. Edge quota healthy (no `QUOTA_EXCEEDED` in last 5 runs).
6. `analyze-meal` and `generate-shopping-list` still work (no collateral).
7. Duration acceptable: most runs complete &lt; 120s; UI skeleton + copy already set (*até 2 min*).

### POST-GO soak (Phase 5)

- Spot-check Dieta daily for 48–72h.
- Zero P0 (“cannot generate any plan while signed in”).
- If failure spike → rollback immediately (§8).

---

## 8. Plano de rollback rápido

**Target: &lt; 5 minutes to restore client meal plan path.**

### Step 1 — Disable flag (preferred)

1. Vercel → Environment Variables → Production:
   ```env
   EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=false
   ```
2. Redeploy production (or trigger redeploy of latest).
3. Confirm `EXPO_PUBLIC_GEMINI_API_KEY` **still set** on Vercel.
4. Smoke: Dieta → **Gerar cardápio da semana** → plan appears.

### Step 2 — Verify

| Check | Expected |
|---|---|
| Network tab | No call to `generate-meal-plan` |
| Meal plan generates | Yes (client Gemini) |
| Photo / shopping | Unchanged (still Edge) |

### Step 3 — If client path also broken

- Verify `EXPO_PUBLIC_GEMINI_API_KEY` not accidentally removed.
- Verify key quota in AI Studio (client key).
- Last resort: `EXPO_PUBLIC_AI_MOCK=true` temporarily (mock plan) — **not** for production long-term.

### What rollback does **not** require

- Reverting `generate-meal-plan.ts` code (flag off is sufficient).
- Undeploying Edge Function (can remain idle).
- Database migration or store changes.

### Rollback drill (before production go)

Run once in Phase 3:

1. Flag `true` → confirm Edge invoke.
2. Flag `false` + redeploy → confirm client invoke.
3. Document timestamps in `MEAL_PLAN_EDGE_ROLLOUT_RESULT.md`.

---

## 9. Critérios objetivos para remover `EXPO_PUBLIC_GEMINI_API_KEY` (sprint futura)

**Not in this sprint.** Removal only when **all** are true:

| # | Criterion |
|---|---|
| 1 | `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=true` in production for **≥ 14 days** without rollback |
| 2 | **≥ 20** successful production meal plan generations via Edge (manual log or support tickets — no analytics required) |
| 3 | Zero dependency on client path in code paths users can hit (`generate-meal-plan.ts` client branch unreachable in prod) |
| 4 | Quota/billing stable on Edge `GEMINI_API_KEY` for 14 days |
| 5 | Rollback drill documented; team agrees client removal is acceptable risk |
| 6 | `npm run test:gemini` / meal plan smoke updated to test Edge only |
| 7 | `PROJECT_BRIEFING` + `.env.example` updated; security note closed |
| 8 | Code removal PR: delete or gate `src/services/ai/client.ts` meal plan usage; remove `@google/generative-ai` **only if** no other client usage remains |

**Until then:** keep `EXPO_PUBLIC_GEMINI_API_KEY` in Vercel production env.

---

## 10. Arquivos provavelmente afetados na futura implementação

Rollout sprint (mostly operational; minimal code):

| File / surface | Likely change |
|---|---|
| Vercel env (dashboard) | `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=true` when go |
| `docs/private/MEAL_PLAN_EDGE_ROLLOUT_RESULT.md` | Smoke results, go/no-go decision |
| `docs/private/PROJECT_BRIEFING.md` | Sprint status, limitations, env table |

**Unchanged in rollout sprint (unless bug found):**

| File | Notes |
|---|---|
| `supabase/functions/generate-meal-plan/index.ts` | No deploy unless bugfix |
| `src/services/ai/generate-meal-plan.ts` | Routing already implemented |
| `src/services/ai/edge-client.ts` | Error parsing already implemented |
| `src/services/ai/errors.ts` | Copy already covers Edge codes |
| `src/services/ai/prompts/meal-plan.prompt.ts` | No prompt changes |
| `src/services/ai/schemas/meal-plan.schema.ts` | No schema changes |
| `src/store/useAppStore.ts` | `setMealPlan` unchanged |
| `app/(tabs)/diet.tsx` | UI already has loading copy |

**Future decommission sprint (after §9):**

| File | Change |
|---|---|
| `src/services/ai/generate-meal-plan.ts` | Remove client branch |
| `src/services/ai/client.ts` | Remove or shrink if unused |
| `src/lib/env.ts` | Remove `geminiApiKey` / `hasGeminiKey` if unused |
| `.env.example` | Remove `EXPO_PUBLIC_GEMINI_API_KEY` |
| `package.json` | Possibly remove `@google/generative-ai` |
| `scripts/test-meal-plan.mjs` | Point at Edge or delete |

---

## 11. Riscos

| Risk | Severity | Mitigation |
|---|---|---|
| **Quota exhausted on Edge secret** | High | Resolve before flag go; Sprint 1C already hit this |
| **Flag on without client key backup** | High | Never remove key in same deploy as flag on |
| **Silent expectation of auto-fallback** | Medium | Document: rollback = flag off; support copy |
| **Signed-out users cannot generate plan** | Medium | Expected on Edge; client path allowed anonymous-ish before — confirm product OK before go |
| **Edge/client prompt drift** | Low | No prompt edits during rollout; shared `_shared/meal-plan.ts` |
| **120s timeout on slow Gemini** | Medium | UI already warns *até 2 min*; retry |
| **Vercel env cache / stale build** | Medium | Redeploy after env change; verify in built bundle if unsure |
| **Removing fallback too early** | High | §9 gates; explicit team sign-off |
| **Quota on client key rots while on Edge** | Low | Keep key valid until decommission sprint |
| **Supabase function cold start** | Low | Accept; meal plan already slow |

---

## 12. Smoke test compacto

### A — Baseline (flag off, production today)

| # | Step | Expected |
|---|---|---|
| A1 | Open Dieta, signed in | Screen loads |
| A2 | **Gerar cardápio da semana** | Plan in ~30–90s |
| A3 | Network | No `generate-meal-plan` call |
| A4 | Hoje / Compras / Refeição | Unchanged |

### B — Edge local (flag on)

Prep: `.env` → `EXPO_PUBLIC_AI_MOCK=false`, `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=true`, Supabase vars set, signed in.

| # | Step | Expected |
|---|---|---|
| B1 | Generate plan | `200`, `{ ok: true, data: { plannedMeals, recipes, summary } }` |
| B2 | Dieta UI | Day picker + meals visible |
| B3 | Sign out → generate | Error: *Entre na conta para usar a IA.* |
| B4 | Long restrictions (`>120`) | Succeeds (Pro chain) |
| B5 | Repeat ×5 | 5/5 success |

### C — Error paths (flag on)

| # | Step | Expected |
|---|---|---|
| C1 | Signed out | `UNAUTHORIZED` message |
| C2 | (If quota hit) | `QUOTA_EXCEEDED` message — **no-go** |
| C3 | Double-tap generate while loading | No corrupt state; single plan or error |

### D — Rollback drill

| # | Step | Expected |
|---|---|---|
| D1 | Flag `false`, redeploy | Client path works |
| D2 | Flag `true` again | Edge works (if quota OK) |

### E — Collateral (flag on, production go)

| # | Step | Expected |
|---|---|---|
| E1 | Refeição → photo analyze | Edge `analyze-meal` OK |
| E2 | Compras → Do cardápio | Edge `generate-shopping-list` OK |

---

## 13. Fora do escopo

- Code changes in this planning phase  
- Supabase Edge Function deploys (unless critical bugfix)  
- Removing `EXPO_PUBLIC_GEMINI_API_KEY`  
- Renaming env vars  
- Schema, prompt, or variety rule changes  
- Auto-fallback Edge → client on failure  
- UI redesign, Design System, new Dieta copy  
- Sentry, Datadog, paid analytics  
- Per-user or % canary (Vercel env is global — acceptable for this app size)  
- `EXPO_PUBLIC_AI_MOCK` behavior change  
- Persist / sync shape changes  
- Commit in planning phase  

---

## 14. Success criteria

- Rollout plan approved; team agrees **no client key removal** until §9 met.  
- Edge path achieves **5/5** successful signed-in generations in preview/local with flag `true`.  
- Failure matrix validated for at least: `UNAUTHORIZED`, `QUOTA_EXCEEDED` (or quota resolved), and success path.  
- Rollback drill completed: flag `false` restores client meal plan in &lt; 5 min.  
- Production go/no-go decision recorded in `MEAL_PLAN_EDGE_ROLLOUT_RESULT.md`.  
- If go: production runs with `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=true` and **client key still present**.  
- If no-go: production stays flag `false`; blockers documented (likely quota).  
- No regression to `analyze-meal` or `generate-shopping-list`.  
- `PROJECT_BRIEFING` updated after execution (not in this planning-only step).

---

## Smallest execution slice (after plan approval)

1. Resolve Edge `GEMINI_API_KEY` quota (Phase 2 gate).  
2. Run smoke tests B + C + D locally.  
3. Vercel preview with flag `true`; repeat B + E.  
4. Record results in `MEAL_PLAN_EDGE_ROLLOUT_RESULT.md`.  
5. Go/no-go meeting → production flag flip or stay on client.  
6. If go: 48–72h soak; keep client key on Vercel.

**Explicitly not in rollout v1:** remove public Gemini key, runtime auto-fallback, prompt/schema edits.

---

*Planning doc only. Implementation and env changes start after review and quota gate.*
