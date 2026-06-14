import {
  ANALYZE_MEAL_PROMPT,
  mealAnalysisResponseSchema,
  mealAnalysisSchema,
  validateAnalyzeMealRequest,
} from '../_shared/analyze-meal.ts';
import { handleCors } from '../_shared/cors.ts';
import { generateVisionJson, toGeminiErrorInfo } from '../_shared/gemini.ts';
import { jsonError, jsonOk, readJson } from '../_shared/http.ts';

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) {
    return cors;
  }

  if (req.method !== 'POST') {
    return jsonError('METHOD_NOT_ALLOWED', 'Use POST for meal analysis.', 405);
  }

  let body: unknown;
  try {
    body = await readJson(req);
  } catch {
    return jsonError('BAD_REQUEST', 'Request body must be valid JSON.', 400);
  }

  const request = validateAnalyzeMealRequest(body);
  if (!request.ok) {
    return jsonError('BAD_REQUEST', request.error, 400);
  }

  try {
    const raw = await generateVisionJson<unknown>({
      prompt: ANALYZE_MEAL_PROMPT,
      imageBase64: request.value.imageBase64,
      mimeType: request.value.mimeType,
      responseSchema: mealAnalysisResponseSchema,
    });

    const parsed = mealAnalysisSchema.safeParse(raw);
    if (!parsed.success) {
      return jsonError('VALIDATION', 'Gemini returned an invalid meal analysis.', 502);
    }

    return jsonOk(parsed.data);
  } catch (error) {
    const info = toGeminiErrorInfo(error);
    return jsonError(info.code, info.message, info.status);
  }
});
