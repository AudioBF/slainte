# Sprint 1 — Migrate Gemini AI to Supabase Edge Functions

**Status:** Planning only (no code changes in this sprint doc)  
**Goal:** Remove `EXPO_PUBLIC_GEMINI_API_KEY` from the client bundle and route all Gemini calls through authenticated Supabase Edge Functions.  
**Scope:** Three existing AI tasks — meal photo analysis, meal plan generation, shopping list generation.

---

## Executive summary

Today every Gemini request runs in the Expo/React Native client via `@google/generative-ai` in `src/services/ai/client.ts`. The API key is bundled into the web PWA and any native build, which is a production security blocker.

Sprint 1 introduces a Supabase Edge Functions layer that owns the Gemini key, retry/fallback logic, and structured JSON generation. The React Native app keeps the same hook and store contracts; only the service layer changes from direct Gemini calls to `supabase.functions.invoke()`.

The `supabase/` folder currently contains only `schema.sql` (profiles + user_sync). No `config.toml`, no Edge Functions, and no local Supabase CLI setup exist yet.

> **Note on paths:** There is no `src/services/ai/generators/` directory. Generators live as top-level service files: `analyze-meal-photo.ts`, `generate-meal-plan.ts`, and `generate-shopping-list.ts`.

---

## 1. Current AI call flow

### 1.1 End-to-end diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│ UI screens: meal.tsx, diet.tsx, shopping.tsx                            │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Feature hooks (unchanged API surface today)                             │
│   useMealAnalysis        → analyze(imageBase64, mimeType)               │
│   useMealPlanGenerator   → generate(restrictions?)                      │
│   useShoppingListGenerator → generate()                                 │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Service layer (src/services/ai/)                                        │
│   analyze-meal-photo.ts    → generateStructuredJson({ task: vision }) │
│   generate-meal-plan.ts    → generateStructuredJson({ task: mealPlan }) │
│   generate-shopping-list.ts→ generateStructuredJson({ task: shoppingList})│
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
              ┌─────────────────┴─────────────────┐
              │ env.aiMock || !hasGeminiKey()    │
              ▼                                   ▼
     Mock data + artificial delay          client.ts
     (src/data/mock.ts)                         │
                                                ▼
                                    GoogleGenerativeAI (browser/device)
                                    EXPO_PUBLIC_GEMINI_API_KEY
                                                │
                                                ▼
                                    Gemini API (generateContent + JSON schema)
                                                │
                                                ▼
                                    Zod parse / validate-meal-plan (client)
                                                │
                                                ▼
                                    Zustand store update (via hooks)
```

### 1.2 Hook → service mapping

| Hook | File | Service function | Input | Store side-effect |
|---|---|---|---|---|
| `useMealAnalysis` | `src/features/meal/hooks/useMealAnalysis.ts` | `analyzeMealPhoto()` | `imageBase64`, `mimeType` | `setPhotoDraft(mapAnalysisToComponents(...))` |
| `useMealPlanGenerator` | `src/features/diet/hooks/useMealPlanGenerator.ts` | `generateMealPlan(profile)` | `UserProfile` (+ optional restrictions) | `setMealPlan(...)`, maybe `updateProfile({ restrictions })` |
| `useShoppingListGenerator` | `src/features/shopping/hooks/useShoppingListGenerator.ts` | `generateShoppingList(recipes)` | `Recipe[]` | `setShopping(mapShoppingListToItems(...))` |

Hooks do **not** import Gemini directly. They call service exports from `src/services/ai/index.ts` and map errors with `toAiUserMessage()` from `errors.ts`.

### 1.3 Core client (`src/services/ai/client.ts`)

Responsibilities today:

| Concern | Implementation |
|---|---|
| SDK init | Singleton `GoogleGenerativeAI(env.geminiApiKey)` |
| Structured output | `responseMimeType: 'application/json'` + Gemini `responseSchema` |
| Task temperatures | vision 0.2, mealPlan 0.85, shoppingList 0.4 |
| Timeouts | 50s default; 120s for `mealPlan` |
| Retries | Up to 2 (1 for meal plan); exponential backoff on 503; `retry-after` parsing on 429 |
| Model fallback | Primary + `AI_MODEL_FALLBACKS` chain per task |
| Vision | Optional `imageBase64` + `mimeType` as first `inlineData` part |
| Abort chain | Quota errors stop all model attempts |

### 1.4 Generator services (detailed)

#### `analyze-meal-photo.ts`

1. Mock branch if `EXPO_PUBLIC_AI_MOCK !== 'false'` or no API key.
2. Calls `generateStructuredJson` with `ANALYZE_MEAL_PROMPT` and `mealAnalysisResponseSchema`.
3. Validates response with `mealAnalysisSchema` (Zod + macro rounding).
4. `mapAnalysisToComponents()` adds client-side IDs via `createId('comp')`.

#### `generate-meal-plan.ts`

1. Mock branch under same conditions.
2. Builds prompt via `buildMealPlanPrompt(profile)` or `buildMealPlanRetryPrompt(profile, issues)`.
3. Uses `useProFallback: profile.restrictions.length > 120` for Pro model chain.
4. Up to **3 attempts** (`MAX_VARIETY_ATTEMPTS = 2`): Gemini call → Zod `safeParse` → `validateMealPlanVariety()` → retry with issue feedback.
5. On final variety failure, returns plan with appended summary warning (soft accept).

#### `generate-shopping-list.ts`

1. Mock branch under same conditions.
2. Early return `{ items: [] }` if no recipes.
3. Single Gemini call with `buildShoppingListPrompt(recipes)`.
4. `mapShoppingListToItems()` adds IDs client-side.

### 1.5 Supporting modules (stay relevant post-migration)

| Module | Role |
|---|---|
| `src/constants/ai.ts` | Model names, fallback chains, limits (`maxPhotoSizeMb: 4`, timeouts) |
| `src/services/ai/config.ts` | `AiTask` type, `getModelForTask()`, `isAiAvailable()` → `hasGeminiKey()` |
| `src/services/ai/errors.ts` | Error classification + Portuguese `toAiUserMessage()` |
| `src/services/ai/prompts/*.ts` | Prompt builders (profile/recipes → string) |
| `src/services/ai/schemas/*.ts` | Gemini JSON schemas (`SchemaType`) + Zod parsers |
| `src/services/ai/validate-meal-plan.ts` | Post-generation variety rules (7 days, min distinct meals, recipe count) |
| `src/lib/env.ts` | `EXPO_PUBLIC_GEMINI_API_KEY`, `EXPO_PUBLIC_AI_MOCK`, Supabase URL/anon key |

### 1.6 Existing Supabase integration

| Asset | State |
|---|---|
| `supabase/schema.sql` | `profiles`, `user_sync`, RLS, signup trigger |
| `src/services/supabase/client.ts` | `createClient` with AsyncStorage auth persistence |
| `src/services/supabase/sync.ts` | Cloud pull/push for profile + sync blobs |
| Edge Functions | **None** |
| `supabase/config.toml` | **Missing** |
| Supabase CLI scripts in `package.json` | **Missing** |

Auth exists (`useAuth`, email/password) but AI works **without** login today because the Gemini key is client-side. Migration must define whether AI requires authentication.

### 1.7 Security gap (motivation)

```ts
// src/lib/env.ts — ships in every web/native bundle
geminiApiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '',
```

Anyone can extract the key from the Vercel PWA bundle or React Native Hermes bytecode. Sprint 1 closes this by moving the key to Supabase secrets.

---

## 2. Proposed Edge Function architecture

### 2.1 Recommended layout: three functions + shared Deno module

```
supabase/
├── config.toml
├── schema.sql                          (existing)
└── functions/
    ├── _shared/
    │   ├── cors.ts                     CORS headers + OPTIONS handler
    │   ├── auth.ts                     JWT verification via Supabase client
    │   ├── gemini-client.ts            Port of generateStructuredJson (Deno)
    │   ├── errors.ts                   Port of error helpers (no Zod user messages)
    │   ├── constants.ts                AI_MODELS, AI_LIMITS, AI_MODEL_FALLBACKS
    │   ├── prompts/
    │   │   ├── analyze-meal.prompt.ts
    │   │   ├── meal-plan.prompt.ts
    │   │   └── shopping-list.prompt.ts
    │   ├── schemas/
    │   │   ├── meal-analysis.schema.ts
    │   │   ├── meal-plan.schema.ts
    │   │   └── shopping-list.schema.ts
    │   └── validate-meal-plan.ts
    ├── analyze-meal/
    │   └── index.ts                    POST { imageBase64, mimeType }
    ├── generate-meal-plan/
    │   └── index.ts                    POST { profile }
    └── generate-shopping-list/
        └── index.ts                    POST { recipes }
```

**Why three functions (not one router):**

- Independent timeout configuration (`generate-meal-plan` needs up to 120s).
- Clearer logs, metrics, and rate limits per task.
- Matches existing service boundaries — minimal refactor in client generators.
- Smaller blast radius if one handler needs a hotfix.

**Alternative (deferred):** Single `ai-proxy` function with `{ task, payload }` body. Simpler deploy surface but harder timeout tuning and logging.

### 2.2 Request flow (target state)

```
Hook → Service (analyze-meal-photo | generate-meal-plan | generate-shopping-list)
         │
         ├── mock branch (dev / no Supabase) → unchanged
         │
         └── edge branch
                │
                ▼
         src/services/ai/edge-client.ts
         supabase.functions.invoke('<function-name>', { body })
         Authorization: Bearer <user access_token>
                │
                ▼
         Edge Function
           1. CORS preflight (OPTIONS)
           2. Verify JWT (reject 401 if missing/invalid)
           3. Validate request body (Zod)
           4. Build prompt (shared prompts)
           5. generateStructuredJson (shared gemini-client)
           6. Task-specific post-processing (variety validation for meal plan)
           7. Return JSON { ok: true, data } or { ok: false, error, code }
                │
                ▼
         Client: Zod parse (defense in depth) + existing mappers (createId, etc.)
                │
                ▼
         Hook → Zustand
```

### 2.3 Authentication strategy

**Recommended for Sprint 1:** Require a valid Supabase session for real AI calls.

| Scenario | Behavior |
|---|---|
| `EXPO_PUBLIC_AI_MOCK=true` | Mock data (no network) — unchanged |
| Supabase not configured | Mock or “configure Supabase” message — unchanged local-first UX |
| Supabase configured, user signed in | Invoke Edge Function with session JWT |
| Supabase configured, user **not** signed in | Return friendly PT error: “Entre na conta para usar IA” (no client-side Gemini fallback) |

Rationale: Without JWT, anon-key-only invocation is abusable (quota drain, cost). Requiring auth aligns AI with cloud sync and enables per-user rate limiting later.

**Optional Sprint 1.1:** Guest mode with strict IP/user rate limits — out of scope unless product requires AI before signup.

### 2.4 Edge Function handler contract

All functions follow the same response envelope:

```ts
// Success
{ "ok": true, "data": { /* task-specific result */ } }

// Failure
{ "ok": false, "error": "Human-readable message", "code": "QUOTA_EXCEEDED" | "TIMEOUT" | "VALIDATION" | "UNAUTHORIZED" | "INTERNAL" }
```

Client maps `code` + `error` through existing `toAiUserMessage()` (extend with network/401 cases).

#### `analyze-meal` request/response

```ts
// Request
{ imageBase64: string; mimeType: string }  // max ~4 MB decoded (AI_LIMITS.maxPhotoSizeMb)

// Response data
MealAnalysisResult  // same shape as mealAnalysisSchema output (no client IDs)
```

#### `generate-meal-plan` request/response

```ts
// Request
{ profile: UserProfile }

// Response data
{ recipes, plannedMeals, summary }  // MealPlanResult
```

Server runs the full variety retry loop currently in `generate-meal-plan.ts` (up to 3 Gemini attempts).

#### `generate-shopping-list` request/response

```ts
// Request
{ recipes: Recipe[] }

// Response data
{ items: { name: string; quantity: string }[] }
```

### 2.5 Shared code strategy (prompts, schemas, client)

Deno Edge Functions cannot import from `src/` at runtime. Options:

| Approach | Sprint 1 recommendation |
|---|---|
| Duplicate into `_shared/` | **Yes** — fastest path; document drift risk |
| npm workspace package `@slainte/ai-core` | Defer to Sprint 2 if duplication hurts |
| Pre-build copy script (`scripts/sync-ai-shared.mjs`) | **Yes** — optional automation to copy from `src/services/ai/` |

Minimal duplication rule: copy prompts, schemas, validate-meal-plan, errors, constants. Keep ID generation (`createId`) and Zustand mapping on the client only.

### 2.6 Gemini SDK on Deno

Use npm specifier in Edge Functions:

```ts
import { GoogleGenerativeAI, SchemaType } from 'npm:@google/generative-ai@^0.24.1';
```

Read API key from `Deno.env.get('GEMINI_API_KEY')` — never from request body or client env.

### 2.7 `config.toml` essentials

```toml
[project]
# id set by supabase link

[functions.analyze-meal]
verify_jwt = true

[functions.generate-meal-plan]
verify_jwt = true
# Increase timeout — meal plan can run 30–90s; client timeout is 120s
# Confirm hosted limit for project tier (see Risks)

[functions.generate-shopping-list]
verify_jwt = true
```

Initialize via `supabase init` + `supabase link --project-ref <ref>`.

### 2.8 Client-side service changes (conceptual)

| File | Change |
|---|---|
| **New** `src/services/ai/edge-client.ts` | `invokeAiFunction(name, body)` wrapping `getSupabase().functions.invoke` |
| `analyze-meal-photo.ts` | Replace `generateStructuredJson` with edge invoke; keep mock + Zod |
| `generate-meal-plan.ts` | Replace direct Gemini; **remove** client-side variety loop if moved server-side entirely |
| `generate-shopping-list.ts` | Replace direct Gemini with edge invoke |
| `client.ts` | Remove from app bundle OR keep only for `scripts/test-gemini.mjs` |
| `config.ts` | `isAiAvailable()` → `hasSupabase() && !env.aiMock` (+ optionally session check) |

**Hooks:** No changes expected if service function signatures stay identical.

---

## 3. Required environment variables

### 3.1 Supabase secrets (server-only)

Set via Dashboard → Project Settings → Edge Functions → Secrets, or CLI:

```bash
supabase secrets set GEMINI_API_KEY=AIza...
```

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Google AI Studio key; replaces client `EXPO_PUBLIC_GEMINI_API_KEY` |
| `SUPABASE_URL` | Auto | Injected by Supabase runtime |
| `SUPABASE_ANON_KEY` | Auto | For JWT validation inside function |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional | Only if using service-role pattern (not recommended for Sprint 1) |

Optional future secrets:

| Variable | Purpose |
|---|---|
| `AI_RATE_LIMIT_PER_HOUR` | Per-user throttle |
| `AI_ALLOW_ANON` | Feature flag for guest access |

### 3.2 Client / Expo (`.env`, Vercel)

| Variable | Sprint 1 change |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Keep — required for edge invoke |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Keep — required for auth + invoke |
| `EXPO_PUBLIC_AI_MOCK` | Keep — dev mock mode (`true` default) |
| `EXPO_PUBLIC_GEMINI_API_KEY` | **Remove** after migration verified |
| `EXPO_PUBLIC_USE_EDGE_AI` | **Add (optional)** — feature flag for staged rollout |

### 3.3 Local development

```env
# .env.local (Expo)
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=<local anon key>
EXPO_PUBLIC_AI_MOCK=false

# Supabase CLI secrets (local functions serve)
GEMINI_API_KEY=AIza...
```

Run stack:

```bash
supabase start
supabase functions serve --env-file supabase/.env.local
npx expo start
```

### 3.4 CI / Vercel production

| Location | Variables |
|---|---|
| Vercel (Expo web build) | Remove `EXPO_PUBLIC_GEMINI_API_KEY`; keep Supabase public vars |
| Supabase hosted | `GEMINI_API_KEY` secret only |
| GitHub Actions (if added) | `SUPABASE_ACCESS_TOKEN` for `supabase functions deploy` |

---

## 4. Files to create

### 4.1 Supabase infrastructure

| File | Purpose |
|---|---|
| `supabase/config.toml` | Project config, JWT verification, function timeouts |
| `supabase/.env.local.example` | Local secrets template (gitignored) |
| `supabase/functions/_shared/cors.ts` | CORS + OPTIONS |
| `supabase/functions/_shared/auth.ts` | Extract user from JWT; 401 helper |
| `supabase/functions/_shared/gemini-client.ts` | Port of `client.ts` for Deno |
| `supabase/functions/_shared/errors.ts` | Error classification (shared with client mapping) |
| `supabase/functions/_shared/constants.ts` | Port of `src/constants/ai.ts` |
| `supabase/functions/_shared/prompts/*.ts` | Copy from `src/services/ai/prompts/` |
| `supabase/functions/_shared/schemas/*.ts` | Copy from `src/services/ai/schemas/` (adapt imports) |
| `supabase/functions/_shared/validate-meal-plan.ts` | Copy from `src/services/ai/` |
| `supabase/functions/analyze-meal/index.ts` | Vision handler |
| `supabase/functions/generate-meal-plan/index.ts` | Meal plan handler + variety loop |
| `supabase/functions/generate-shopping-list/index.ts` | Shopping list handler |

### 4.2 Client

| File | Purpose |
|---|---|
| `src/services/ai/edge-client.ts` | Typed wrapper around `functions.invoke` |
| `scripts/sync-ai-shared.mjs` | Optional — copy shared AI modules into `_shared/` |

### 4.3 Tooling / docs

| File | Purpose |
|---|---|
| `scripts/test-edge-ai.mjs` | Invoke functions locally with test JWT |
| `docs/private/SPRINT_1_EDGE_FUNCTIONS_PLAN.md` | This document |

### 4.4 Dev dependencies (optional)

| Package | Purpose |
|---|---|
| `supabase` CLI | Local dev + deploy (global or devDependency) |

---

## 5. Files to modify

| File | Changes |
|---|---|
| `src/services/ai/analyze-meal-photo.ts` | Edge invoke instead of `generateStructuredJson`; mock guard uses `hasSupabase()` / session |
| `src/services/ai/generate-meal-plan.ts` | Edge invoke; remove client-side Gemini variety loop if server owns it |
| `src/services/ai/generate-shopping-list.ts` | Edge invoke |
| `src/services/ai/config.ts` | `isAiAvailable()` checks Supabase + mock flag, not Gemini key |
| `src/services/ai/errors.ts` | Map edge `{ code, error }`, 401 unauthorized, FunctionsHttpError |
| `src/services/ai/index.ts` | Export edge client helpers if needed |
| `src/lib/env.ts` | Remove `geminiApiKey` / `hasGeminiKey()`; add optional `useEdgeAi` flag |
| `.env.example` | Remove Gemini key; document Supabase-only AI path |
| `.gitignore` | Ignore `supabase/.env.local` |
| `package.json` | Add `supabase:*` scripts; remove `@google/generative-ai` from dependencies when client no longer imports it |
| `docs/private/PROJECT_BRIEFING.md` | Update §9 AI architecture (post-implementation) |

### 5.1 Files explicitly NOT modified (Sprint 1)

| File | Reason |
|---|---|
| `src/features/meal/hooks/useMealAnalysis.ts` | Stable service API |
| `src/features/diet/hooks/useMealPlanGenerator.ts` | Stable service API |
| `src/features/shopping/hooks/useShoppingListGenerator.ts` | Stable service API |
| `supabase/schema.sql` | No DB schema change required for AI proxy |
| UI screens (`app/(tabs)/*.tsx`) | Hooks unchanged |

### 5.2 Files to deprecate / remove (final migration step)

| File | Action |
|---|---|
| `src/services/ai/client.ts` | Delete from app bundle after edge path verified; keep logic only in `_shared/gemini-client.ts` |
| `scripts/test-gemini.mjs` | Update to hit edge function or keep direct Gemini for ops debugging |
| Client imports of `@google/generative-ai` in schemas | Replace `SchemaType` with const enums or duplicate schema objects without SDK import |

---

## 6. Migration steps

### Phase 0 — Prerequisites (Day 1)

1. Install Supabase CLI; run `supabase init` in repo root.
2. `supabase link` to hosted project (or use local `supabase start`).
3. Set `GEMINI_API_KEY` secret on hosted project.
4. Confirm Expo app already has working Supabase auth (`EXPO_PUBLIC_SUPABASE_*`).
5. Fix duplicate RLS policy in `schema.sql` (`user_sync_update_own` listed twice) — unrelated but safe cleanup.

### Phase 1 — Edge Function scaffold (Day 1–2)

1. Create `_shared/` modules: cors, auth, constants, errors, gemini-client.
2. Copy prompts, schemas, validate-meal-plan into `_shared/` (or run sync script).
3. Implement `analyze-meal` function — smallest payload, validates pipeline.
4. Configure `config.toml` with `verify_jwt = true`.
5. Deploy: `supabase functions deploy analyze-meal`.
6. Manual test with curl + real user JWT.

### Phase 2 — Client edge wrapper (Day 2)

1. Add `src/services/ai/edge-client.ts`.
2. Update `analyze-meal-photo.ts` to call edge when `!env.aiMock && hasSupabase()`.
3. Keep mock path and Zod validation on client.
4. Extend `toAiUserMessage()` for 401 / Functions errors.
5. Test meal photo flow on web PWA + Android dev build.

### Phase 3 — Remaining functions (Day 3–4)

1. Implement `generate-shopping-list` (simplest JSON payload).
2. Implement `generate-meal-plan` with full variety retry loop server-side.
3. Wire client services.
4. Deploy both functions.
5. End-to-end test Dieta + Compras tabs.

### Phase 4 — Remove client key (Day 4–5)

1. Remove `EXPO_PUBLIC_GEMINI_API_KEY` from Vercel env and `.env`.
2. Remove `@google/generative-ai` from client `package.json` if no remaining imports.
3. Delete or gut `src/services/ai/client.ts`.
4. Update `.env.example` and PROJECT_BRIEFING.
5. Verify production bundle contains no `AIza` strings (`grep` built web output).

### Phase 5 — Feature flag rollout (optional)

1. Ship with `EXPO_PUBLIC_USE_EDGE_AI=true` default when Supabase present.
2. Monitor error rates and latency in Supabase function logs.
3. Remove flag once stable.

### Phase 6 — Hardening (Sprint 1 stretch or Sprint 2)

1. Per-user rate limiting (DB counter or Upstash).
2. Request size validation (image base64 length).
3. Structured logging (task, model used, latency, user id hash).
4. Fix `schema.ts` duplicate `SchemaType` dependency — pure JSON schema objects.

---

## 7. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| **Edge Function timeout < meal plan duration** | High | Default Supabase limit is often 60s; client expects 120s. Set function timeout in `config.toml`; test Pro/Flash latency; consider reducing client timeout to match platform max or splitting generation (Sprint 2). |
| **Large base64 image payloads** | Medium | Enforce `AI_LIMITS.maxPhotoSizeMb` on client before invoke; validate body size in function; reject with 413. |
| **Auth required breaks AI for logged-out users** | Medium | Product decision documented above; show sign-in CTA on AI screens. Mock mode still works in dev. |
| **Shared code drift** (`src/` vs `_shared/`) | Medium | Sync script in CI; or extract `@slainte/ai-core` package. |
| **Gemini quota / cost abuse** | Medium | JWT required; add rate limits; monitor Supabase logs. |
| **Cold start latency** | Low–Medium | First request +30s possible; show existing skeleton UI; consider keep-warm cron (Sprint 2). |
| **Deno npm compatibility** | Low | Pin `@google/generative-ai@0.24.1`; test in `supabase functions serve` early. |
| **CORS on web PWA** | Low | Use `_shared/cors.ts`; Supabase client handles auth headers. |
| **Zod v4 in Deno** | Low | Import `npm:zod@^4.4.3` in functions; match client version. |
| **Error message regression** | Low | Extend `toAiUserMessage` with tests for new codes; preserve Portuguese copy. |
| **Local dev friction** | Low | Document `supabase start` + `functions serve` workflow; keep mock mode default. |

---

## 8. Rollback plan

### 8.1 Feature-flag rollback (preferred, &lt; 5 minutes)

If `EXPO_PUBLIC_USE_EDGE_AI` was shipped:

1. Set `EXPO_PUBLIC_USE_EDGE_AI=false` in Vercel.
2. Redeploy web PWA (or rebuild native).
3. Client falls back to direct Gemini **only if** `EXPO_PUBLIC_GEMINI_API_KEY` still exists in env.

Keep the old Gemini key in Vercel **hidden** for one release cycle during rollout, then delete after edge stability confirmed.

### 8.2 Code rollback

1. Revert client commits that switch services to `edge-client.ts`.
2. Restore `src/services/ai/client.ts` and `EXPO_PUBLIC_GEMINI_API_KEY` in env.
3. Redeploy app. Edge Functions can remain deployed (unused).

### 8.3 Edge Function rollback

1. `supabase functions deploy <name> --project-ref <ref>` from last known good git tag.
2. Or disable functions in Dashboard (returns 404; client shows network error).

### 8.4 Secret compromise

If `GEMINI_API_KEY` leaked: rotate in Google AI Studio → `supabase secrets set GEMINI_API_KEY=new` → redeploy functions. No app store release needed.

### 8.5 Rollback verification

- [ ] Meal photo analysis works (mock + live)
- [ ] Meal plan generates within acceptable time
- [ ] Shopping list generates
- [ ] No API key in client bundle (`grep -r AIza dist/`)

---

## 9. Testing checklist

### 9.1 Local Edge Functions

- [ ] `supabase start` succeeds
- [ ] `supabase functions serve` loads `GEMINI_API_KEY`
- [ ] OPTIONS preflight returns CORS headers for all three functions
- [ ] POST without JWT returns 401
- [ ] POST with valid JWT returns `{ ok: true, data }`

### 9.2 `analyze-meal`

- [ ] Valid JPEG/PNG base64 → parsed components with macros
- [ ] Invalid mime type → 400 validation error
- [ ] Oversized image (&gt; 4 MB) → rejected before invoke
- [ ] Empty Gemini response → structured error
- [ ] Quota exceeded → Portuguese quota message via `toAiUserMessage`
- [ ] Mock mode (`EXPO_PUBLIC_AI_MOCK=true`) skips network

### 9.3 `generate-meal-plan`

- [ ] Standard profile → 7 days, recipes, summary
- [ ] Long restrictions (&gt; 120 chars) → Pro model path (check logs)
- [ ] Variety validation triggers retry (inspect logs for 2nd prompt with issues)
- [ ] Schema invalid response → retry then user-facing error
- [ ] Completes within configured function timeout
- [ ] Soft accept on final variety failure (warning in summary)

### 9.4 `generate-shopping-list`

- [ ] Empty recipes → `{ items: [] }` without Gemini call
- [ ] Multiple recipes → consolidated PT items
- [ ] Valid JSON schema compliance

### 9.5 Client integration (hooks unchanged)

- [ ] `useMealAnalysis`: loading/error states; `setPhotoDraft` populated
- [ ] `useMealPlanGenerator`: `setMealPlan` updates store; restrictions saved
- [ ] `useShoppingListGenerator`: `setShopping` with `fromPlan: true` items

### 9.6 Auth scenarios

- [ ] Signed-in user → AI works
- [ ] Signed-out user → clear PT message, no silent failure
- [ ] Expired session → refresh or re-login prompt
- [ ] Supabase not configured → mock/local behavior unchanged

### 9.7 Platforms

- [ ] Web PWA (Vercel)
- [ ] Android dev client / emulator
- [ ] iOS (if applicable)

### 9.8 Security

- [ ] Production web bundle: no `EXPO_PUBLIC_GEMINI_API_KEY`, no `AIza` substring
- [ ] Edge Function logs do not print full API key or base64 image
- [ ] JWT verified (`verify_jwt = true` or manual check)

### 9.9 Regression

- [ ] Cloud sync still works (profiles + user_sync unaffected)
- [ ] `npm run build:web` succeeds
- [ ] TypeScript compile clean (`npx tsc --noEmit`)
- [ ] Existing scripts updated: `test:gemini` → edge or renamed `test:edge-ai`

### 9.10 Production smoke test (post-deploy)

- [ ] Sign up → sign in → analyze photo → generate plan → generate shopping list
- [ ] Monitor Supabase Edge Function invocations + error rate for 24h

---

## Appendix A — Task/model reference (unchanged logic)

| Task | Primary model | Fallback chain | Timeout | Retries |
|---|---|---|---|---|
| `vision` | `gemini-2.5-flash` | 3.5-flash, 2.5-flash-lite, 3.1-flash-lite | 50s | 2 |
| `mealPlan` | `gemini-2.5-flash` (Pro if long restrictions) | 3.5-flash, 2.5-pro, 2.5-flash-lite | 120s | 1 |
| `shoppingList` | `gemini-2.5-flash-lite` | 3.1-flash-lite, 2.5-flash | 50s | 2 |

Source: `src/constants/ai.ts`, `src/services/ai/client.ts`.

---

## Appendix B — Estimated effort

| Phase | Estimate |
|---|---|
| Supabase scaffold + shared modules | 1–1.5 days |
| Three Edge Functions + deploy | 1.5–2 days |
| Client edge-client + service wiring | 1 day |
| Testing + timeout tuning + docs | 1 day |
| **Total** | **~4–5 dev days** |

---

## Appendix C — Out of scope (Sprint 2+)

- Supabase Storage for meal photos
- Rate limiting DB table
- `@slainte/ai-core` shared npm package
- Streaming responses / partial UI updates
- Admin dashboard for AI usage
- Moving mock data server-side
