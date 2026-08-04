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
  decideMealPlanCorrection,
  validateMealPlanAgainstDailyTargets,
} from '../_shared/meal-plan-targets.ts';
import {
  buildMealPlanBatchRepairPrompt,
  buildMealPlanPrompt,
  buildMealPlanPromptV2,
  buildMealPlanRetryPrompt,
  mealPlanResponseSchema,
  normalizeLightweightMealPlan,
  parseMealPlanResult,
  type MealPlanResult,
  type NormalizedMealPlanRequest,
  type UserProfile,
  validateMealPlanRequest,
  validateMealPlanVariety,
} from '../_shared/meal-plan.ts';

const MAX_VARIETY_ATTEMPTS = 1;

async function requestMealPlanWithPrompt(
  prompt: string,
  profile: UserProfile,
  budget: ExecutionBudget,
  varietyAttempt: number,
): Promise<MealPlanResult> {
  const raw = await generateStructuredJson<unknown>({
    task: 'mealPlan',
    prompt,
    responseSchema: mealPlanResponseSchema,
    useProFallback: profile.restrictions.length > 120,
    budget,
    varietyAttempt,
  });
  return parseMealPlanResult(raw);
}

function attachMeta(
  plan: MealPlanResult,
  req: NormalizedMealPlanRequest,
  validationStatus: NonNullable<MealPlanResult['generationMeta']>['validationStatus'],
  repairedDays?: number[],
): MealPlanResult {
  const weekStart = req.dailyTargets.find((t) => t.dayIndex === 0)?.dateISO;
  return {
    ...plan,
    generationMeta: {
      contractVersion: req.contractVersion,
      referenceWeekStartISO: weekStart,
      validationStatus,
      repairedDays,
      usedFallbackDays: req.usedFallbackDays,
    },
  };
}

async function generateMealPlanV1(
  req: NormalizedMealPlanRequest,
  budget: ExecutionBudget,
): Promise<MealPlanResult> {
  const profile = req.profile;
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
      const prompt =
        attempt > 0
          ? buildMealPlanRetryPrompt(profile, lastIssues)
          : buildMealPlanPrompt(profile);
      const plan = await requestMealPlanWithPrompt(prompt, profile, budget, attempt);
      const validation = validateMealPlanVariety(plan);

      if (validation.ok) {
        return attachMeta(plan, req, 'ok');
      }

      lastIssues = validation.issues;

      if (attempt === MAX_VARIETY_ATTEMPTS) {
        return attachMeta(
          normalizeLightweightMealPlan({
            ...plan,
            summary:
              (plan.summary ? `${plan.summary} ` : '') +
              'Plano gerado com algumas repetições — você pode gerar novamente para outra versão.',
          }),
          req,
          'soft',
        );
      }
    } catch (error) {
      lastError = error;
      if (isExecutionBudgetExceeded(error)) throw error;
      if (attempt === MAX_VARIETY_ATTEMPTS) throw error;
    }
  }

  throw lastError ?? new Error('Não foi possível gerar um cardápio válido.');
}

async function generateMealPlanV2(
  req: NormalizedMealPlanRequest,
  budget: ExecutionBudget,
): Promise<MealPlanResult> {
  const profile = req.profile;
  const initialPrompt = buildMealPlanPromptV2(profile, req.dailyTargets);
  const plan = await requestMealPlanWithPrompt(initialPrompt, profile, budget, 0);

  const variety = validateMealPlanVariety(plan);
  const macro = validateMealPlanAgainstDailyTargets({
    plannedMeals: plan.plannedMeals,
    dailyTargets: req.dailyTargets,
  });

  const decision = decideMealPlanCorrection(macro, variety.ok);

  if (decision === 'accept') {
    return attachMeta(plan, req, macro.severity === 'soft' ? 'soft' : 'ok');
  }

  if (!budget.canStartCall(MIN_BUDGET_FOR_VARIETY_RETRY_MS)) {
    throw new Error('Não foi possível validar o cardápio multi-meta dentro do tempo disponível.');
  }

  if (decision === 'retry_full') {
    const issues = [
      ...(!variety.ok ? variety.issues : []),
      ...macro.perDay.filter((d) => d.status === 'hard').flatMap((d) => d.reasons),
    ];
    const retryPrompt =
      req.contractVersion === 2
        ? `${buildMealPlanPromptV2(profile, req.dailyTargets)}

## CORREÇÃO NECESSÁRIA
${issues.map((i) => `- ${i}`).join('\n')}

Gere um plano NOVO completo.`
        : buildMealPlanRetryPrompt(profile, issues);
    const repaired = await requestMealPlanWithPrompt(retryPrompt, profile, budget, 1);
    const v2 = validateMealPlanVariety(repaired);
    const m2 = validateMealPlanAgainstDailyTargets({
      plannedMeals: repaired.plannedMeals,
      dailyTargets: req.dailyTargets,
    });
    if (!v2.ok || !m2.valid) {
      throw new Error(
        'O cardápio gerado não atendeu às metas diárias. Tente novamente ou ajuste a agenda.',
      );
    }
    return attachMeta(repaired, req, 'repaired');
  }

  if (decision === 'repair_batch') {
    const invalidDays = macro.invalidDays;
    const issues = macro.perDay
      .filter((d) => d.status === 'hard')
      .flatMap((d) => d.reasons.map((r) => `dayIndex ${d.dayIndex}: ${r}`));
    const repairPrompt = buildMealPlanBatchRepairPrompt(
      profile,
      req.dailyTargets,
      invalidDays,
      JSON.stringify({ plannedMeals: plan.plannedMeals, summary: plan.summary }),
      issues,
    );
    const repaired = await requestMealPlanWithPrompt(repairPrompt, profile, budget, 1);
    const v2 = validateMealPlanVariety(repaired);
    const m2 = validateMealPlanAgainstDailyTargets({
      plannedMeals: repaired.plannedMeals,
      dailyTargets: req.dailyTargets,
    });
    if (!v2.ok || !m2.valid) {
      throw new Error(
        'O cardápio gerado não atendeu às metas diárias. Tente novamente ou ajuste a agenda.',
      );
    }
    return attachMeta(repaired, req, 'repaired', invalidDays);
  }

  throw new Error(
    'O cardápio gerado não atendeu às metas diárias. Tente novamente ou ajuste a agenda.',
  );
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
    const plan =
      request.value.contractVersion === 2
        ? await generateMealPlanV2(request.value, budget)
        : await generateMealPlanV1(request.value, budget);
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
    // Controlled validation failures from multi-target
    if (
      error instanceof Error &&
      /metas diárias|multi-meta|cardápio gerado não atendeu/i.test(error.message)
    ) {
      return jsonError('VALIDATION', error.message, 422);
    }
    return jsonError(info.code, info.message, info.status);
  }
});
