# Sprint 1B — Shopping List Edge Function Result

## Scope completed

Sprint 1B migrates only the shopping list generation Gemini call to a Supabase Edge Function.

Not included:
- Meal plan generation migration
- Analyze meal changes beyond shared Gemini helper reuse
- UI screen changes
- Hook contract changes
- Removal of `src/services/ai/client.ts`
- Removal of `@google/generative-ai` from `package.json`
- Removal of `EXPO_PUBLIC_GEMINI_API_KEY`

## Files changed

- `supabase/config.toml` — added JWT verification for `generate-shopping-list`.
- `supabase/functions/_shared/gemini.ts` — generalized the Deno Gemini wrapper for `vision` and `shoppingList`, while preserving `generateVisionJson()` for `analyze-meal`.
- `supabase/functions/_shared/shopping-list.ts` — request validation, shopping prompt, Gemini response schema, and Edge-side Zod parsing.
- `supabase/functions/generate-shopping-list/index.ts` — new Edge Function handler.
- `src/services/ai/edge-client.ts` — typed support for both `analyze-meal` and `generate-shopping-list`, with signed-in session requirement.
- `src/services/ai/generate-shopping-list.ts` — real shopping generation now calls the Edge Function; mock mode, empty recipes behavior, client-side Zod validation, and client-side ID mapping stay unchanged.
- `src/services/ai/errors.ts` — unauthorized Edge Function copy is now generic for AI flows.
- `.env.example` — clarifies that `EXPO_PUBLIC_GEMINI_API_KEY` remains only for meal plan until Sprint 1C.
- `docs/private/PROJECT_BRIEFING.md` — marks shopping list as Edge Function-backed and meal plan as still client-side.
- `docs/private/SPRINT_1B_SHOPPING_LIST_EDGE_RESULT.md` — this result document.

## Deploy `generate-shopping-list`

Project ref used for Sprint 1A:

```bash
vukpkqcelmboqnptyceu
```

Deploy only Sprint 1B:

```bash
npx.cmd supabase functions deploy generate-shopping-list --project-ref vukpkqcelmboqnptyceu
```

`supabase/config.toml` sets:

```toml
[functions.generate-shopping-list]
verify_jwt = true
```

This means real calls require a valid Supabase user session.

## `GEMINI_API_KEY`

`generate-shopping-list` reads Gemini credentials only from the existing Supabase secret:

```bash
npx.cmd supabase secrets set GEMINI_API_KEY=AIza... --project-ref vukpkqcelmboqnptyceu
```

The function must not receive API keys in request bodies and must not log recipe payloads, API keys, or user data.

## Signed-in behavior test

Expected result:

1. Set `EXPO_PUBLIC_AI_MOCK=false`.
2. Sign in with Supabase auth.
3. Generate shopping list from recipes.
4. `generateShoppingList(recipes)` returns `{ items }` from `supabase.functions.invoke('generate-shopping-list')`.
5. The client validates the response with `shoppingListSchema`.
6. `mapShoppingListToItems()` still creates client-side IDs and `fromPlan: true` items.

## Signed-out behavior test

Expected result:

1. Set `EXPO_PUBLIC_AI_MOCK=false`.
2. Sign out.
3. Try to generate a shopping list with recipes.
4. `edge-client.ts` fails before network invocation because no Supabase session exists.
5. `toAiUserMessage()` maps this to: `Entre na conta para usar a IA.`

## Empty recipes behavior

`generateShoppingList([])` still returns:

```json
{ "items": [] }
```

without invoking the Edge Function.

## Rollback steps

Fast rollback for shopping list generation:

1. Revert `src/services/ai/generate-shopping-list.ts` to use `generateStructuredJson()` with `buildShoppingListPrompt()` and `shoppingListResponseSchema`.
2. Ensure `EXPO_PUBLIC_GEMINI_API_KEY` is available in the client environment.
3. Keep `src/services/ai/client.ts` and `@google/generative-ai` as-is.
4. Redeploy the app.

Edge Function rollback:

```bash
npx.cmd supabase functions deploy generate-shopping-list --project-ref vukpkqcelmboqnptyceu
```

from the last known good commit, or leave the deployed function unused while the client rollback is active.

## Meal plan status

`generate-meal-plan` is still client-side Gemini after Sprint 1B.

Do not remove:
- `src/services/ai/client.ts`
- `@google/generative-ai`
- `EXPO_PUBLIC_GEMINI_API_KEY`

until the meal plan migration is implemented.

## Validation

Requested validation commands:

```bash
npx.cmd tsc --noEmit
npm run build:web
```
