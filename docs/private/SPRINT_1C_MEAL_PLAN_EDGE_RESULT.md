# Sprint 1C — Meal Plan Edge Function Result

## Scope completed

Sprint 1C implements `generate-meal-plan` as a Supabase Edge Function behind a feature flag.

The client-side Gemini meal plan path remains in place for rollback.

Deployment status: **completed** for project `vukpkqcelmboqnptyceu`.

Validation status: **partially validated**. Auth and rollback behavior passed; signed-in Edge generation reached Gemini but is blocked by quota (`QUOTA_EXCEEDED`).

Auth hardening status: **deployed for all AI Edge Functions**.

Not removed:
- `src/services/ai/client.ts`
- `@google/generative-ai`
- `EXPO_PUBLIC_GEMINI_API_KEY`

Not changed:
- UI screens
- feature hooks
- public API of `generateMealPlan()`

## Files changed

- `supabase/config.toml` — added JWT verification for `generate-meal-plan`.
- `supabase/functions/_shared/gemini.ts` — added `mealPlan` support with model chain, 120s timeout, task temperature, meal plan retry count, and Pro fallback support.
- `supabase/functions/_shared/meal-plan.ts` — added Deno-side request validation, prompt builders, response schema, Zod parsing, variety validation, and retry prompt support.
- `supabase/functions/_shared/auth.ts` — added authenticated-user role check so anon JWT cannot invoke AI functions.
- `supabase/functions/analyze-meal/index.ts` — now uses the shared authenticated-user role check before reading request body or calling Gemini.
- `supabase/functions/generate-shopping-list/index.ts` — now uses the shared authenticated-user role check before reading request body or calling Gemini.
- `supabase/functions/generate-meal-plan/index.ts` — new Edge Function handler with full meal plan generation loop.
- `src/lib/env.ts` — added `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN` as a public rollout flag.
- `src/services/ai/edge-client.ts` — added typed support for `generate-meal-plan` and parses non-2xx Edge Function envelopes so quota/auth/validation errors are not masked as generic function errors.
- `src/services/ai/generate-meal-plan.ts` — uses Edge Function only when the flag is true; keeps mock and client Gemini rollback behavior.
- `.env.example` — documents the feature flag and temporary public Gemini key.
- `docs/private/PROJECT_BRIEFING.md` — documents the feature-flagged meal plan Edge path.
- `docs/private/SPRINT_1C_MEAL_PLAN_EDGE_RESULT.md` — this result document.

## Feature flag behavior

| Environment | Behavior |
|---|---|
| `EXPO_PUBLIC_AI_MOCK=true` | Mock meal plan, unchanged |
| `EXPO_PUBLIC_AI_MOCK=false` + `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=true` | Calls `supabase.functions.invoke('generate-meal-plan')` |
| `EXPO_PUBLIC_AI_MOCK=false` + `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN` unset/`false` | Uses existing client-side Gemini path |

Important: if the Edge Function path fails, the app does **not** silently fallback to client Gemini. Rollback is explicit by setting:

```env
EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=false
```

## Deploy `generate-meal-plan`

Project ref used in Sprint 1A/1B:

```bash
vukpkqcelmboqnptyceu
```

Deploy only Sprint 1C:

```bash
npx.cmd supabase functions deploy generate-meal-plan --project-ref vukpkqcelmboqnptyceu
```

Deploy completed successfully.

Auth hardening redeploy:

```bash
npx.cmd supabase functions deploy analyze-meal --project-ref vukpkqcelmboqnptyceu
npx.cmd supabase functions deploy generate-shopping-list --project-ref vukpkqcelmboqnptyceu
npx.cmd supabase functions deploy generate-meal-plan --project-ref vukpkqcelmboqnptyceu
```

Result: blocked by Supabase API `403` because the current CLI account does not have access to project `vukpkqcelmboqnptyceu`. `npx.cmd supabase projects list` showed only `finflow` and `nexo`, not `Sláinte`. Re-login to the correct Supabase account is required before redeploying the hardened functions.

After logging into the correct Supabase account, redeploy completed for:

- `analyze-meal` → version 2
- `generate-shopping-list` → version 3
- `generate-meal-plan` → version 3

`supabase/config.toml` sets:

```toml
[functions.generate-meal-plan]
verify_jwt = true
```

This means the Edge path requires a valid Supabase user session.

## Test with feature flag off

Expected rollback behavior and result: **passed**.

1. Set:
   ```env
   EXPO_PUBLIC_AI_MOCK=false
   EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=false
   EXPO_PUBLIC_GEMINI_API_KEY=AIza...
   ```
2. Generate a meal plan.
3. App uses the existing client-side Gemini path in `src/services/ai/client.ts`.
4. `generate-meal-plan` Edge Function is not invoked.
5. Existing retry/variety behavior remains unchanged.

Observed: Dieta remained functional with the button returning to `Gerar cardápio da semana` and the existing plan visible. This confirms the local rollback path exists.

## Test with feature flag on

Expected Edge behavior:

1. Set:
   ```env
   EXPO_PUBLIC_AI_MOCK=false
   EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=true
   ```
2. Ensure Supabase has the secret:
   ```bash
   npx.cmd supabase secrets set GEMINI_API_KEY=AIza... --project-ref vukpkqcelmboqnptyceu
   ```
3. Sign in with Supabase auth.
4. Generate a meal plan.
5. Client calls `supabase.functions.invoke('generate-meal-plan')`.
6. Edge Function runs prompt building, Gemini call, schema validation, variety validation, retry loop, and soft accept behavior.
7. Client validates the returned result with `mealPlanSchema.parse()`.
8. `useMealPlanGenerator` stores `plannedMeals`, `recipes`, and `summary` unchanged.

Observed: request reached `generate-meal-plan`, but Gemini returned quota exhaustion:

```json
{ "ok": false, "code": "QUOTA_EXCEEDED", "error": "Gemini quota exceeded." }
```

After client error-envelope parsing was fixed, the app showed:

```text
Cota da API esgotada. Aguarde o reset ou verifique billing no Google AI Studio.
```

Signed-in Edge generation remains blocked until Gemini quota/billing is available.

## Signed-in behavior

Expected:

- Signed-in user can generate a real meal plan when `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=true`.
- Long restrictions (`> 120` chars) use the Pro-first model chain on the Edge Function.
- If final variety validation fails after all attempts, the function returns the plan with the same warning summary used by the old client path.

Observed: authenticated request was accepted by the Edge Function, then failed at Gemini with `QUOTA_EXCEEDED`. No successful meal plan result yet.

## Signed-out behavior

Expected and result: **passed**.

1. Set `EXPO_PUBLIC_AI_MOCK=false`.
2. Set `EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=true`.
3. Sign out.
4. Try generating a meal plan.
5. `edge-client.ts` fails before network invocation because no Supabase session exists.
6. `toAiUserMessage()` maps this to: `Entre na conta para usar a IA.`

Additional HTTP checks:

- No `Authorization` header: `401`.
- Supabase anon key JWT: `401 {"ok":false,"code":"UNAUTHORIZED","error":"Authentication required."}`.

Important finding: Supabase `verify_jwt = true` accepts the project anon JWT. The shared `requireAuthenticatedUser()` helper was added to enforce `role=authenticated` server-side. This hardening has now been deployed to all three AI functions:

- `analyze-meal`
- `generate-shopping-list`
- `generate-meal-plan`

Production anon JWT verification after redeploy:

```text
analyze-meal STATUS=401 BODY={"ok":false,"code":"UNAUTHORIZED","error":"Authentication required."}
generate-shopping-list STATUS=401 BODY={"ok":false,"code":"UNAUTHORIZED","error":"Authentication required."}
generate-meal-plan STATUS=401 BODY={"ok":false,"code":"UNAUTHORIZED","error":"Authentication required."}
```

## Timeout observations

Static implementation matches the old client timeout values:

- Normal AI request timeout: `50_000ms`.
- Meal plan request timeout: `120_000ms`.
- Meal plan model retry count: `1`.
- Variety attempts: up to `3` total plan attempts.

Live timeout observation: no timeout was observed before the quota response. The Edge request returned `429 QUOTA_EXCEEDED`.

Risk remains: the full server-side variety loop can exceed one Edge Function invocation budget in worst-case scenarios. Keep the feature flag and client rollback path until real production latency is acceptable.

## Rollback steps

Fast rollback:

1. Set:
   ```env
   EXPO_PUBLIC_USE_EDGE_MEAL_PLAN=false
   ```
2. Redeploy the app.
3. The app uses the existing client-side Gemini path.

Code rollback:

1. Revert changes to `src/services/ai/generate-meal-plan.ts`.
2. Revert `src/services/ai/edge-client.ts` meal plan additions if desired.
3. Leave the deployed Edge Function unused.

Supabase rollback:

```bash
npx.cmd supabase functions deploy generate-meal-plan --project-ref vukpkqcelmboqnptyceu
```

from the last known good commit, or disable usage by feature flag.

## Temporary public Gemini key

`EXPO_PUBLIC_GEMINI_API_KEY` is still temporary and should only be removed after the Edge meal plan path is validated in production.

Do not remove yet:
- `EXPO_PUBLIC_GEMINI_API_KEY`
- `src/services/ai/client.ts`
- `@google/generative-ai`

## Validation

Required commands and results:

```bash
npx.cmd tsc --noEmit  # passed
npm run build:web      # passed
```
