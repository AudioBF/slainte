import { requireAuthenticatedUser } from '../_shared/auth.ts';
import { handleCors } from '../_shared/cors.ts';
import { generateStructuredJson, toGeminiErrorInfo } from '../_shared/gemini.ts';
import { jsonError, jsonOk, readJson } from '../_shared/http.ts';
import {
  buildMealPlanPrompt,
  buildMealPlanRetryPrompt,
  mealPlanResponseSchema,
  mealPlanSchema,
  type MealPlanResult,
  type UserProfile,
  validateMealPlanRequest,
  validateMealPlanVariety,
} from '../_shared/meal-plan.ts';

const MAX_VARIETY_ATTEMPTS = 2;

async function requestMealPlan(profile: UserProfile, issues?: string[]): Promise<MealPlanResult> {
  const prompt = issues?.length
    ? buildMealPlanRetryPrompt(profile, issues)
    : buildMealPlanPrompt(profile);

  const raw = await generateStructuredJson<unknown>({
    task: 'mealPlan',
    prompt,
    responseSchema: mealPlanResponseSchema,
    useProFallback: profile.restrictions.length > 120,
  });

  const parsed = mealPlanSchema.safeParse(raw);
  if (parsed.success) {
    return parsed.data;
  }

  throw new Error(`Invalid meal plan: ${parsed.error.issues[0]?.message ?? 'schema'}`);
}

async function generateMealPlan(profile: UserProfile): Promise<MealPlanResult> {
  let lastIssues: string[] = [];
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_VARIETY_ATTEMPTS; attempt++) {
    try {
      const plan = await requestMealPlan(profile, attempt > 0 ? lastIssues : undefined);
      const validation = validateMealPlanVariety(plan);

      if (validation.ok) {
        return plan;
      }

      lastIssues = validation.issues;

      if (attempt === MAX_VARIETY_ATTEMPTS) {
        return {
          ...plan,
          summary:
            (plan.summary ? `${plan.summary} ` : '') +
            'Plano gerado com algumas repetições — você pode gerar novamente para outra versão.',
        };
      }
    } catch (error) {
      lastError = error;
      if (attempt === MAX_VARIETY_ATTEMPTS) {
        throw error;
      }
    }
  }

  throw lastError ?? new Error('Não foi possível gerar um cardápio válido.');
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) {
    return cors;
  }

  if (req.method !== 'POST') {
    return jsonError('METHOD_NOT_ALLOWED', 'Use POST for meal plan generation.', 405);
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

  const request = validateMealPlanRequest(body);
  if (!request.ok) {
    return jsonError('BAD_REQUEST', request.error, 400);
  }

  try {
    const plan = await generateMealPlan(request.value.profile);
    return jsonOk(plan);
  } catch (error) {
    const info = toGeminiErrorInfo(error);
    return jsonError(info.code, info.message, info.status);
  }
});
