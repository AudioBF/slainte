import { requireAuthenticatedUser } from '../_shared/auth.ts';
import { handleCors } from '../_shared/cors.ts';
import {
  ExecutionBudget,
  ExecutionBudgetExceededError,
  MIN_BUDGET_FOR_VARIETY_RETRY_MS,
  logMealPlanBudget,
} from '../_shared/execution-budget.ts';
import { generateStructuredJson, toGeminiErrorInfo } from '../_shared/gemini.ts';
import { jsonError, jsonOk, readJson } from '../_shared/http.ts';
import {
  buildMealPlanPrompt,
  buildMealPlanRetryPrompt,
  mealPlanResponseSchema,
  normalizeLightweightMealPlan,
  parseMealPlanResult,
  type MealPlanResult,
  type UserProfile,
  validateMealPlanRequest,
  validateMealPlanVariety,
} from '../_shared/meal-plan.ts';

/** At most one variety retry (2 Gemini generations) when budget allows. */
const MAX_VARIETY_ATTEMPTS = 1;

async function requestMealPlan(
  profile: UserProfile,
  budget: ExecutionBudget,
  varietyAttempt: number,
  issues?: string[],
): Promise<MealPlanResult> {
  const prompt = issues?.length
    ? buildMealPlanRetryPrompt(profile, issues)
    : buildMealPlanPrompt(profile);

  const raw = await generateStructuredJson<unknown>({
    task: 'mealPlan',
    prompt,
    responseSchema: mealPlanResponseSchema,
    useProFallback: profile.restrictions.length > 120,
    budget,
    varietyAttempt,
  });

  const parsed = parseMealPlanResult(raw);
  return parsed;
}

async function generateMealPlan(profile: UserProfile, budget: ExecutionBudget): Promise<MealPlanResult> {
  let lastIssues: string[] = [];
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_VARIETY_ATTEMPTS; attempt++) {
    if (attempt > 0 && !budget.canStartCall(MIN_BUDGET_FOR_VARIETY_RETRY_MS)) {
      logMealPlanBudget({
        requestId: budget.requestId,
        attempt,
        elapsedMs: budget.elapsedMs(),
        remainingBudgetMs: budget.remainingMs(),
        event: 'variety_skip',
        code: 'INSUFFICIENT_BUDGET',
      });
      break;
    }

    try {
      const plan = await requestMealPlan(profile, budget, attempt, attempt > 0 ? lastIssues : undefined);
      const validation = validateMealPlanVariety(plan);

      if (validation.ok) {
        return plan;
      }

      lastIssues = validation.issues;

      if (attempt === MAX_VARIETY_ATTEMPTS) {
        return normalizeLightweightMealPlan({
          ...plan,
          summary:
            (plan.summary ? `${plan.summary} ` : '') +
            'Plano gerado com algumas repetições — você pode gerar novamente para outra versão.',
        });
      }
    } catch (error) {
      lastError = error;
      if (isExecutionBudgetExceeded(error)) {
        throw error;
      }
      if (attempt === MAX_VARIETY_ATTEMPTS) {
        throw error;
      }
    }
  }

  throw lastError ?? new Error('Não foi possível gerar um cardápio válido.');
}

function isExecutionBudgetExceeded(error: unknown): boolean {
  return (
    error instanceof ExecutionBudgetExceededError ||
    (error instanceof Error && error.message === 'EXECUTION_BUDGET_EXCEEDED')
  );
}

function budgetTimeoutResponse(budget: ExecutionBudget): Response {
  logMealPlanBudget({
    requestId: budget.requestId,
    attempt: -1,
    elapsedMs: budget.elapsedMs(),
    remainingBudgetMs: budget.remainingMs(),
    event: 'budget_exceeded',
    code: 'TIMEOUT',
  });
  return jsonError(
    'TIMEOUT',
    'Meal plan generation exceeded the safe time budget. Try again.',
    504,
  );
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

  const requestId = crypto.randomUUID();
  const budget = new ExecutionBudget(requestId);

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
    const plan = await generateMealPlan(request.value.profile, budget);
    logMealPlanBudget({
      requestId,
      attempt: 0,
      elapsedMs: budget.elapsedMs(),
      remainingBudgetMs: budget.remainingMs(),
      event: 'success',
      code: 'OK',
    });
    return jsonOk(plan);
  } catch (error) {
    if (isExecutionBudgetExceeded(error)) {
      return budgetTimeoutResponse(budget);
    }
    const info = toGeminiErrorInfo(error);
    logMealPlanBudget({
      requestId,
      attempt: -1,
      elapsedMs: budget.elapsedMs(),
      remainingBudgetMs: budget.remainingMs(),
      event: 'error',
      code: info.code,
    });
    return jsonError(info.code, info.message, info.status);
  }
});
