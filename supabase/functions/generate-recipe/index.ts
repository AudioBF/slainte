import { requireAuthenticatedUser } from '../_shared/auth.ts';
import { handleCors } from '../_shared/cors.ts';
import { generateStructuredJson, toGeminiErrorInfo } from '../_shared/gemini.ts';
import { jsonError, jsonOk, readJson } from '../_shared/http.ts';
import {
  buildRecipePrompt,
  recipeGenerationResponseSchema,
  recipeGenerationSchema,
  validateGenerateRecipeRequest,
} from '../_shared/recipe-generation.ts';

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) {
    return cors;
  }

  if (req.method !== 'POST') {
    return jsonError('METHOD_NOT_ALLOWED', 'Use POST for recipe generation.', 405);
  }

  const auth = requireAuthenticatedUser(req);
  if (!auth.ok) {
    return jsonError('UNAUTHORIZED', auth.error, 401);
  }

  let body: unknown;
  try {
    body = await readJson(req);
  } catch {
    return jsonError('BAD_REQUEST', 'Request body must be valid JSON.', 400);
  }

  const request = validateGenerateRecipeRequest(body);
  if (!request.ok) {
    return jsonError('BAD_REQUEST', request.error, 400);
  }

  const { profile, plannedMeal } = request.value;

  try {
    const raw = await generateStructuredJson<unknown>({
      task: 'recipe',
      prompt: buildRecipePrompt(profile, plannedMeal),
      responseSchema: recipeGenerationResponseSchema,
    });

    const parsed = recipeGenerationSchema.safeParse(raw);
    if (!parsed.success) {
      return jsonError('VALIDATION', 'Gemini returned an invalid recipe.', 502);
    }

    return jsonOk(parsed.data);
  } catch (error) {
    const info = toGeminiErrorInfo(error);
    return jsonError(info.code, info.message, info.status);
  }
});
