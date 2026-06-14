# Sprint 1A — Analyze Meal Edge Function Result

## Scope completed

Sprint 1A migrated only the meal photo analysis Gemini call to a Supabase Edge Function.

Deployment status: **completed**.

Supabase project ref: `vukpkqcelmboqnptyceu`.

Not included:
- Meal plan generation migration
- Shopping list generation migration
- UI screen changes
- Hook contract changes
- Removal of `src/services/ai/client.ts`
- Removal of `@google/generative-ai` from `package.json`

## Files changed

- `supabase/config.toml` — added Supabase function config with JWT verification for `analyze-meal`.
- `supabase/schema.sql` — removed the duplicated `user_sync_update_own` policy only.
- `supabase/functions/_shared/cors.ts` — shared CORS/preflight helper.
- `supabase/functions/_shared/http.ts` — shared `{ ok: true, data }` / `{ ok: false, code, error }` JSON envelope helpers.
- `supabase/functions/_shared/analyze-meal.ts` — request validation, prompt, Gemini response schema, and Edge-side Zod parsing.
- `supabase/functions/_shared/gemini.ts` — Deno Gemini wrapper using `Deno.env.get('GEMINI_API_KEY')`, model fallback, retries, and timeouts.
- `supabase/functions/analyze-meal/index.ts` — Edge Function handler.
- `src/services/ai/edge-client.ts` — typed Supabase Functions client with session requirement.
- `src/services/ai/analyze-meal-photo.ts` — real analysis now calls `analyze-meal`; mock mode remains local.
- `src/services/ai/errors.ts` — maps Edge Function errors to existing Portuguese user messages.
- `tsconfig.json` — excludes Deno Edge Function files from the Expo TypeScript compile.
- `.env.example` — marks `EXPO_PUBLIC_GEMINI_API_KEY` as deprecated and documents `GEMINI_API_KEY` as a Supabase secret.
- `docs/private/SPRINT_1A_ANALYZE_MEAL_EDGE_RESULT.md` — this result document.

## Deploy the function

Prerequisites:

```bash
supabase login
supabase link --project-ref <your-project-ref>
```

Deploy only Sprint 1A:

```bash
supabase functions deploy analyze-meal --project-ref vukpkqcelmboqnptyceu
```

Deployment completed successfully for `analyze-meal` on project `vukpkqcelmboqnptyceu`.

`supabase/config.toml` sets:

```toml
[functions.analyze-meal]
verify_jwt = true
```

This means real calls require a valid Supabase user session.

## Set `GEMINI_API_KEY`

Set the Gemini key as a Supabase secret, not an Expo/Vercel public variable:

```bash
supabase secrets set GEMINI_API_KEY=AIza... --project-ref vukpkqcelmboqnptyceu
```

Secret setup completed for `GEMINI_API_KEY` on project `vukpkqcelmboqnptyceu`.

Do not add `GEMINI_API_KEY` or `EXPO_PUBLIC_GEMINI_API_KEY` to the Edge Function request body, logs, or client bundle.

## Local testing

Serve the function locally:

```bash
supabase functions serve analyze-meal --env-file supabase/.env.local
```

Example `supabase/.env.local`:

```env
GEMINI_API_KEY=AIza...
```

Run the app with real AI:

```env
EXPO_PUBLIC_AI_MOCK=false
EXPO_PUBLIC_SUPABASE_URL=<your-supabase-url>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

## Signed-in behavior

Expected result and test outcome: **passed**.

1. Sign in with Supabase auth.
2. Take/select a meal photo.
3. `analyzeMealPhoto({ imageBase64, mimeType })` calls `supabase.functions.invoke('analyze-meal', { body })`.
4. The Edge Function verifies JWT, calls Gemini server-side, returns `{ ok: true, data }`.
5. The client validates the result with `mealAnalysisSchema`.
6. Existing hook/store behavior remains unchanged: `setPhotoDraft(mapAnalysisToComponents(result))`.

## Signed-out behavior

Expected result and test outcome: **passed**.

1. Set `EXPO_PUBLIC_AI_MOCK=false`.
2. Sign out.
3. Try meal photo analysis.
4. `edge-client.ts` fails before network invocation because no Supabase session exists.
5. `toAiUserMessage()` maps this to: `Entre na conta para usar a análise por IA.`

## Rollback steps

Fast rollback for meal photo analysis:

1. Revert `src/services/ai/analyze-meal-photo.ts` to use `generateStructuredJson()` with `ANALYZE_MEAL_PROMPT` and `mealAnalysisResponseSchema`.
2. Ensure `EXPO_PUBLIC_GEMINI_API_KEY` is available in the client environment.
3. Keep `src/services/ai/client.ts` and `@google/generative-ai` as-is.
4. Redeploy the app.

Edge Function rollback:

```bash
supabase functions deploy analyze-meal
```

from the last known good commit, or leave the deployed function unused while the client rollback is active.

## Validation

Requested validation commands and results:

```bash
npx tsc --noEmit      # passed
npm run build:web     # passed
```

Build result: **passed**.
