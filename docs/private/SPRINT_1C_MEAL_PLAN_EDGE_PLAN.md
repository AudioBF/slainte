# Sprint 1C — Meal Plan Edge Function Implementation Plan

**Status:** Planning only. No app code changed.  
**Goal:** Move `generate-meal-plan` from client-side Gemini to a Supabase Edge Function, then remove client-side Gemini only after the migration is proven safe.  
**Current state:** `analyze-meal` and `generate-shopping-list` already run through Supabase Edge Functions. `generate-meal-plan` is the only remaining Gemini flow that still uses `EXPO_PUBLIC_GEMINI_API_KEY`.

---

## 1. Current `generate-meal-plan` flow

Current runtime path:

```text
useMealPlanGenerator.generate(restrictions?)
  -> updateProfile({ restrictions }) when provided
  -> generateMealPlan(profile)
      -> if env.aiMock || !hasGeminiKey(): mockMealPlan()
      -> requestMealPlan(profile)
          -> buildMealPlanPrompt(profile)
          -> generateStructuredJson({ task: 'mealPlan', responseSchema, useProFallback })
          -> mealPlanSchema.safeParse(raw)
      -> validateMealPlanVariety(plan)
      -> retry with buildMealPlanRetryPrompt(profile, issues) when variety fails
  -> setMealPlan(result.plannedMeals, result.recipes, result.summary)
```

Hook contract today:

| Caller | Public API | Store side effect |
|---|---|---|
| `src/features/diet/hooks/useMealPlanGenerator.ts` | `generateMealPlan(profile)` | `setMealPlan(plannedMeals, recipes, summary)` |

Sprint 1C should keep `generateMealPlan(profile, options?)` unchanged so hooks and UI screens do not change.

---

## 2. What logic currently exists client-side

`src/services/ai/generate-meal-plan.ts` owns these responsibilities:

- Mock mode: if `env.aiMock || !hasGeminiKey()`, return `mockMealPlan()` after a 1200ms delay.
- Prompt selection:
  - first attempt: `buildMealPlanPrompt(profile)`
  - retry attempts: `buildMealPlanRetryPrompt(profile, issues)`
- Gemini invocation via `src/services/ai/client.ts`.
- Long restrictions heuristic: `useProFallback: profile.restrictions.length > 120`.
- Zod validation with `mealPlanSchema.safeParse(raw)`.
- Variety validation with `validateMealPlanVariety(plan)`.
- Full variety retry loop:
  - `MAX_VARIETY_ATTEMPTS = 2`
  - total possible plan attempts: 3
  - if final attempt is valid enough by schema but fails variety, soft-accept and append:
    `Plano gerado com algumas repetições — você pode gerar novamente para outra versão.`
- Throws `Invalid meal plan: ...` on schema failure after final attempt.

`src/services/ai/client.ts` owns lower-level Gemini behavior:

| Concern | Current client behavior |
|---|---|
| API key | `env.geminiApiKey` from `EXPO_PUBLIC_GEMINI_API_KEY` |
| Model | `gemini-2.5-flash`, or `gemini-2.5-pro` when `useProFallback` is true |
| Fallback chain | `gemini-3.5-flash`, `gemini-2.5-pro`, `gemini-2.5-flash-lite` |
| Temperature | `0.85` for `mealPlan` |
| Request timeout | `AI_LIMITS.mealPlanTimeoutMs = 120_000` |
| Per-model retries | `AI_LIMITS.mealPlanMaxRetries = 1` |
| Retry behavior | Retry-after support and 503 backoff |
| Abort behavior | Quota errors abort all model attempts |

---

## 3. Proposed Supabase Edge Function architecture

Add a third AI Edge Function:

```text
src/features/diet/hooks/useMealPlanGenerator.ts
  -> generateMealPlan(profile)
      -> if env.aiMock: mockMealPlan()
      -> if feature flag disabled: temporary client rollback path
      -> invokeGenerateMealPlan({ profile })
          -> supabase.functions.invoke('generate-meal-plan')
              -> validate JWT
              -> validate request body
              -> build prompt
              -> Gemini via Deno helper using GEMINI_API_KEY secret
              -> Zod parse
              -> validateMealPlanVariety
              -> retry with correction prompt when needed
              -> return { ok: true, data: MealPlanResult }
      -> client-side mealPlanSchema.parse(raw) as defense in depth
```

Function contract:

```ts
// Request
{
  profile: {
    goal: 'lose' | 'maintain' | 'gain';
    restrictions: string;
    dailyGoals: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    };
  };
}

// Success
{ ok: true, data: MealPlanResult }

// Failure
{ ok: false, code: EdgeErrorCode, error: string }
```

`generate-meal-plan` must read Gemini credentials only from:

```ts
Deno.env.get('GEMINI_API_KEY')
```

It must not read, receive, log, or depend on `EXPO_PUBLIC_GEMINI_API_KEY`.

---

## 4. Exact files to create

Create these files:

| File | Purpose |
|---|---|
| `supabase/functions/_shared/meal-plan.ts` | Deno-safe copy/adaptation of meal plan request validation, prompt builders, response schema, Zod schema, and variety validation helpers |
| `supabase/functions/generate-meal-plan/index.ts` | Edge Function handler for `POST /functions/v1/generate-meal-plan` |
| `docs/private/SPRINT_1C_MEAL_PLAN_EDGE_RESULT.md` | Result/deploy/test document after implementation |

Optional but recommended if feature flag is added:

| File | Purpose |
|---|---|
| No new file; update `src/lib/env.ts` | Add `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN` or similar public rollback flag |

---

## 5. Exact files to modify

Modify these files during implementation:

| File | Required change |
|---|---|
| `supabase/config.toml` | Add `[functions.generate-meal-plan] verify_jwt = true`; document timeout settings if supported by Supabase CLI/project tier |
| `supabase/functions/_shared/gemini.ts` | Add `mealPlan` task, meal plan model chain, task-specific timeout, task-specific retry count, and `useProFallback` support |
| `src/services/ai/edge-client.ts` | Add `GenerateMealPlanBody`, `'generate-meal-plan'` in `AiFunctionBodyMap`, and `invokeGenerateMealPlan()` |
| `src/services/ai/generate-meal-plan.ts` | Keep mock behavior; call Edge Function for real AI; keep client-side `mealPlanSchema.parse` defense; optionally keep direct Gemini fallback behind feature flag |
| `src/services/ai/errors.ts` | No major change expected; verify `TIMEOUT`, `QUOTA_EXCEEDED`, `GEMINI_UNAVAILABLE`, `VALIDATION`, and `UNAUTHORIZED` copy remains correct for meal plan |
| `src/lib/env.ts` | Add feature flag only if rollback flag is approved |
| `.env.example` | Mark `EXPO_PUBLIC_GEMINI_API_KEY` removable after Sprint 1C verification; add optional feature flag docs if used |
| `docs/private/PROJECT_BRIEFING.md` | Mark all Gemini flows as Edge Function-backed after implementation |
| `docs/private/SPRINT_1_EDGE_FUNCTIONS_PLAN.md` | Optional update noting Sprint 1A/1B complete and 1C in progress/completed |

Do not modify these unless requirements change:

| File | Reason |
|---|---|
| `src/features/diet/hooks/useMealPlanGenerator.ts` | Public service API should remain stable |
| UI screens under `app/` | No UI changes in Sprint 1C |
| `src/services/ai/client.ts` | Keep until post-Sprint cleanup/rollback window closes |
| `package.json` | Keep `@google/generative-ai` until client Gemini is fully removed and verified |

---

## 6. Shared helpers reusable from Sprint 1A/1B

Reuse as-is:

| Helper | How Sprint 1C uses it |
|---|---|
| `supabase/functions/_shared/cors.ts` | `handleCors(req)` for OPTIONS and CORS headers |
| `supabase/functions/_shared/http.ts` | `readJson`, `jsonOk`, `jsonError`, shared response envelope |
| `src/services/ai/edge-client.ts` pattern | Session check + `supabase.functions.invoke()` + typed Edge errors |
| `src/services/ai/errors.ts` Edge code mapping | Existing user-facing PT messages for unauthorized, timeout, quota, unavailable, validation |

Reuse with extension:

| Helper | Required extension |
|---|---|
| `supabase/functions/_shared/gemini.ts` | Add `mealPlan` to task union; add meal plan model chain; support `useProFallback`; support `mealPlanTimeoutMs = 120_000`; support `mealPlanMaxRetries = 1` |

Adapt/copy into new `meal-plan.ts`:

| Source | Destination |
|---|---|
| `src/services/ai/prompts/meal-plan.prompt.ts` | `supabase/functions/_shared/meal-plan.ts` |
| `src/services/ai/schemas/meal-plan.schema.ts` | `supabase/functions/_shared/meal-plan.ts` |
| `src/services/ai/validate-meal-plan.ts` | `supabase/functions/_shared/meal-plan.ts` |
| `src/types/index.ts` `UserProfile` shape | Deno local Zod request schema |
| `src/lib/macros.ts` `roundMacro` behavior | Local helper in `meal-plan.ts` |

---

## 7. Timeout and latency risks

This is the main Sprint 1C risk.

Current client-side meal plan timeout:

| Layer | Value |
|---|---|
| One Gemini meal plan request | `120_000ms` |
| Gemini retries per model for meal plan | `1` |
| Variety attempts in `generate-meal-plan.ts` | `MAX_VARIETY_ATTEMPTS = 2` |
| Total possible meal plan generations | Up to 3 |

Worst-case synchronous time can exceed one Edge Function invocation budget:

```text
3 variety attempts * up to 120s per Gemini request = 360s theoretical upper bound
```

That excludes model fallback and retry-after delays. Even if typical real-world latency is 30-90s, the current full loop can exceed common hosted Edge Function limits.

Risks:

- Hosted Supabase Edge Function max duration may be lower than the current worst-case loop.
- If the function is killed mid-request, the client receives a generic function/network failure.
- Moving the loop server-side removes client visibility into intermediate attempts.
- Cold starts add extra latency.
- Pro fallback for long restrictions may be slower and more expensive.
- Large prompt/response JSON may increase latency and validation cost.

Mitigations:

- Before implementation, confirm actual Supabase Edge Function max duration for project `vukpkqcelmboqnptyceu`.
- Add explicit function timeout config only if supported by current Supabase CLI/runtime.
- Preserve client timeout at or above function budget while testing.
- Log only non-sensitive metadata: `task`, `attempt`, `model`, `durationMs`, `validationIssueCount`, never full profile restrictions or generated plan.
- Keep feature flag/client fallback for one release.
- Start with signed-in manual tests using normal profile and long restrictions profile.

---

## 8. Should the full variety retry loop move server-side?

Recommendation: **yes, move the full loop server-side**, but only behind a rollback flag and only after timeout validation.

Reasons to move it:

- It keeps all Gemini prompt/retry behavior behind `GEMINI_API_KEY`.
- It prevents prompt internals and retry correction prompts from living in the client bundle.
- It preserves the public `generateMealPlan()` API.
- It makes Edge Function logs the single place to inspect model/validation failures.
- It enables future server-side rate limiting per user.

Implementation detail:

```text
Edge handler:
  for attempt 0..MAX_VARIETY_ATTEMPTS:
    prompt = attempt === 0 ? buildMealPlanPrompt(profile) : buildMealPlanRetryPrompt(profile, lastIssues)
    raw = generateStructuredJson({ task: 'mealPlan', useProFallback })
    parsed = mealPlanSchema.safeParse(raw)
    if !parsed.success: throw/retry according to current behavior
    validation = validateMealPlanVariety(parsed.data)
    if validation.ok: return parsed.data
    if final attempt: return soft-accepted plan with warning summary
    lastIssues = validation.issues
```

Do not split the variety loop between client and server. A split loop would require sending validation issues back to the client and re-invoking the function multiple times, which exposes more prompt orchestration and creates more failure states.

Exception:

If Supabase timeout is too low for the full loop, postpone full migration or implement an async job pattern instead of a synchronous Edge Function.

---

## 9. Do we need a feature flag for rollback?

Recommendation: **yes**.

Use a short-lived public flag for Sprint 1C rollout:

```env
EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=true
```

Planned behavior:

| Flag / mode | Behavior |
|---|---|
| `EXPO_PUBLIC_AI_MOCK=true` | Mock meal plan, unchanged |
| `EXPO_PUBLIC_AI_MOCK=false` and `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=true` | Use `generate-meal-plan` Edge Function |
| `EXPO_PUBLIC_AI_MOCK=false` and `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=false` | Temporary direct Gemini fallback via `src/services/ai/client.ts` |

Why a flag is worth it:

- Meal plan is the highest latency AI flow.
- It has the most complex retry loop.
- It controls the main Dieta user journey.
- Rollback without code revert is useful if Supabase function duration or Gemini latency causes failures in production.

After production stability is confirmed:

1. Remove fallback flag.
2. Remove `EXPO_PUBLIC_GEMINI_API_KEY` from Vercel/Expo env.
3. Remove client `geminiApiKey` / `hasGeminiKey()` dependency if unused.
4. Remove `src/services/ai/client.ts` if no scripts still need it.
5. Remove `@google/generative-ai` from app dependencies if no client imports remain.

---

## 10. Testing checklist

Pre-implementation:

- [ ] Confirm Supabase Edge Function max duration for project/tier.
- [ ] Confirm `GEMINI_API_KEY` secret exists in project `vukpkqcelmboqnptyceu`.
- [ ] Confirm `analyze-meal` and `generate-shopping-list` still deploy after shared `gemini.ts` changes.

Local/static validation:

- [ ] `npx.cmd tsc --noEmit`
- [ ] `npm run build:web`
- [ ] `ReadLints` on changed client files.
- [ ] Confirm no app code imports Edge Deno files.
- [ ] Confirm `supabase/functions` remains excluded from Expo `tsconfig.json`.

Edge Function deploy:

- [ ] `npx.cmd supabase functions deploy generate-meal-plan --project-ref vukpkqcelmboqnptyceu`
- [ ] Dashboard shows `generate-meal-plan` alongside `analyze-meal` and `generate-shopping-list`.
- [ ] Function uses `verify_jwt = true`.

Signed-in behavior:

- [ ] `EXPO_PUBLIC_AI_MOCK=false`
- [ ] `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=true`
- [ ] Signed-in user generates meal plan from default profile.
- [ ] Store receives `plannedMeals`, `recipes`, and `summary`.
- [ ] Dieta tab renders the new plan.
- [ ] Generated plan has 7 days.
- [ ] At least breakfast/lunch/dinner exist for each day.
- [ ] Recipes count stays within accepted range or soft warning is appended.

Long restriction behavior:

- [ ] Use restrictions longer than 120 chars.
- [ ] Confirm Pro fallback path is selected in Edge logs without logging raw restrictions.
- [ ] Confirm response still validates.

Retry/variety behavior:

- [ ] Force or simulate variety validation failure.
- [ ] Confirm retry prompt is used server-side.
- [ ] Confirm final soft-accept warning is preserved when variety still fails after final attempt.

Signed-out behavior:

- [ ] Signed-out user with `EXPO_PUBLIC_AI_MOCK=false` tries generating a meal plan.
- [ ] Client fails before invocation with `UNAUTHORIZED`.
- [ ] User sees `Entre na conta para usar a IA.`

Rollback behavior:

- [ ] Set `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=false`.
- [ ] Confirm direct client Gemini path still works with `EXPO_PUBLIC_GEMINI_API_KEY`.
- [ ] Confirm no UI/hook changes are required.

Security:

- [ ] No API keys in function logs.
- [ ] No raw profile restrictions in logs.
- [ ] No `EXPO_PUBLIC_GEMINI_API_KEY` usage inside `supabase/functions`.
- [ ] After final cleanup, production bundle contains no `AIza` string.

Regression:

- [ ] `analyze-meal` still works.
- [ ] `generate-shopping-list` still works.
- [ ] Cloud sync still works after generated plan is stored.

---

## 11. Rollback plan

Preferred rollback: feature flag.

1. Keep `src/services/ai/client.ts`, `@google/generative-ai`, and `EXPO_PUBLIC_GEMINI_API_KEY` during the Sprint 1C rollout.
2. If Edge meal plan fails in production, set:

```env
EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=false
```

3. Redeploy the app.
4. `generateMealPlan()` uses the current direct Gemini path again.

Code rollback:

1. Revert changes to `src/services/ai/generate-meal-plan.ts` and `src/services/ai/edge-client.ts`.
2. Leave deployed `generate-meal-plan` unused.
3. Redeploy the app.

Supabase rollback:

```bash
npx.cmd supabase functions deploy generate-meal-plan --project-ref vukpkqcelmboqnptyceu
```

from the last known good commit, or temporarily stop using the function via feature flag.

Secret/key rollback:

- Do not remove `EXPO_PUBLIC_GEMINI_API_KEY` until Edge meal plan is stable.
- If `GEMINI_API_KEY` is rotated, run:

```bash
npx.cmd supabase secrets set GEMINI_API_KEY=AIza... --project-ref vukpkqcelmboqnptyceu
```

---

## 12. Recommendation: implement now or postpone

Recommendation: **implement Sprint 1C next, but keep it feature-flagged and do not remove client Gemini in the same commit.**

Rationale:

- This is the final remaining client-side Gemini exposure.
- The existing Edge helper foundation is ready after Sprint 1A/1B.
- The service boundary is already clean: hooks can remain unchanged.
- Security benefit is high once the public Gemini key is removed.

However, full removal should be postponed until after production verification because meal plan has the highest timeout risk.

Suggested delivery sequence:

1. Implement `generate-meal-plan` Edge Function with full server-side variety loop.
2. Add `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=true` default for staging/local testing.
3. Keep direct client Gemini fallback for one release.
4. Deploy and test signed-in, signed-out, default profile, and long restrictions.
5. If stable, commit and push.
6. After Vercel/Supabase production is stable, run a follow-up cleanup sprint:
   - remove `EXPO_PUBLIC_GEMINI_API_KEY`
   - remove `src/services/ai/client.ts`
   - remove `@google/generative-ai` from app dependencies if unused
   - update docs to mark all AI fully server-side

If Supabase hosted timeout cannot support the current synchronous full loop, postpone Sprint 1C implementation and design an async meal plan job flow instead.
