import { GoogleGenerativeAI, type Schema } from 'npm:@google/generative-ai@0.24.1';
import {
  ExecutionBudget,
  ExecutionBudgetExceededError,
  MIN_BUDGET_FOR_UNAVAILABLE_RETRY_MS,
  MIN_BUDGET_TO_START_CALL_MS,
  logMealPlanBudget,
} from './execution-budget.ts';
import type { EdgeErrorCode } from './http.ts';

const VISION_MODELS = [
  'gemini-2.5-flash',
  'gemini-3.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-3.1-flash-lite',
];

const SHOPPING_LIST_MODELS = [
  'gemini-2.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
];

const RECIPE_MODELS = [
  'gemini-2.5-flash',
  'gemini-3.5-flash',
  'gemini-2.5-flash-lite',
];

const MEAL_PLAN_MODELS = [
  'gemini-2.5-flash',
  'gemini-3.5-flash',
  'gemini-2.5-pro',
  'gemini-2.5-flash-lite',
];

const MEAL_PLAN_PRO_MODELS = [
  'gemini-2.5-pro',
  'gemini-3.5-flash',
  'gemini-2.5-flash-lite',
];

const MAX_RETRIES = 2;
const MEAL_PLAN_MAX_RETRIES = 1;
const MEAL_PLAN_UNAVAILABLE_MAX_RETRIES = 1;
const UNAVAILABLE_RETRY_DELAY_MIN_MS = 2_000;
const UNAVAILABLE_RETRY_DELAY_MAX_MS = 4_000;
const REQUEST_TIMEOUT_MS = 50_000;
const MEAL_PLAN_TIMEOUT_MS = 120_000;

type AiTask = 'vision' | 'mealPlan' | 'shoppingList' | 'recipe';

type GenerateStructuredJsonOptions = {
  task: AiTask;
  prompt: string;
  imageBase64?: string;
  mimeType?: string;
  responseSchema: object;
  useProFallback?: boolean;
  budget?: ExecutionBudget;
  /** 0-based variety attempt index (meal plan only). */
  varietyAttempt?: number;
};

export type GeminiErrorInfo = {
  code: EdgeErrorCode;
  status: number;
  message: string;
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isQuotaExceededError(error: unknown): boolean {
  const message = getErrorMessage(error);
  return (
    /429|quota exceeded|RESOURCE_EXHAUSTED|exceeded your current quota/i.test(message) ||
    /free_tier.*limit:\s*0/i.test(message)
  );
}

function isModelNotFoundError(error: unknown): boolean {
  return /404|no longer available|not found|NOT_FOUND/i.test(getErrorMessage(error));
}

function isTransientUnavailableError(error: unknown): boolean {
  return /503|500|502|504|high demand|overloaded|UNAVAILABLE/i.test(getErrorMessage(error));
}

/** Retryable 503/overload only — excludes quota, timeout, 5xx outside 503. */
function isRetryableUnavailableError(error: unknown): boolean {
  if (
    isQuotaExceededError(error) ||
    isRequestTimeoutError(error) ||
    isExecutionBudgetExceededError(error) ||
    isModelNotFoundError(error)
  ) {
    return false;
  }

  const message = getErrorMessage(error);
  if (/\b401\b|unauthorized/i.test(message)) {
    return false;
  }
  if (/\b400\b|bad request/i.test(message)) {
    return false;
  }
  if (/Invalid meal plan|JSON\.parse|Unexpected token/i.test(message)) {
    return false;
  }
  if (/GEMINI_API_KEY is not configured/i.test(message)) {
    return false;
  }

  return (
    /\b503\b|status:\s*503/i.test(message) ||
    /overload(?:ed)?|high demand|\bUNAVAILABLE\b/i.test(message)
  );
}

function unavailableRetryDelayMs(): number {
  const span = UNAVAILABLE_RETRY_DELAY_MAX_MS - UNAVAILABLE_RETRY_DELAY_MIN_MS;
  return UNAVAILABLE_RETRY_DELAY_MIN_MS + Math.floor(Math.random() * (span + 1));
}

function unavailableRetrySkipReason(
  error: unknown,
  budget: ExecutionBudget,
  geminiAttempt: number,
  delayMs: number,
): string {
  if (geminiAttempt >= MEAL_PLAN_UNAVAILABLE_MAX_RETRIES) {
    return 'ALREADY_RETRIED';
  }
  if (!isRetryableUnavailableError(error)) {
    return 'NOT_RETRYABLE';
  }
  if (budget.remainingMs() < MIN_BUDGET_FOR_UNAVAILABLE_RETRY_MS) {
    return 'INSUFFICIENT_BUDGET';
  }
  if (budget.remainingMs() - delayMs < MIN_BUDGET_TO_START_CALL_MS) {
    return 'INSUFFICIENT_BUDGET_AFTER_DELAY';
  }
  return 'UNKNOWN';
}

function isRequestTimeoutError(error: unknown): boolean {
  return getErrorMessage(error) === 'REQUEST_TIMEOUT';
}

function isExecutionBudgetExceededError(error: unknown): boolean {
  return (
    error instanceof ExecutionBudgetExceededError ||
    getErrorMessage(error) === 'EXECUTION_BUDGET_EXCEEDED'
  );
}

function parseRetryAfterMs(error: unknown): number | null {
  const match = getErrorMessage(error).match(/Please retry in ([\d.]+)s/i);
  return match ? Math.ceil(parseFloat(match[1]) * 1000) : null;
}

function shouldTryNextModel(error: unknown): boolean {
  return isModelNotFoundError(error) || isTransientUnavailableError(error) || isRequestTimeoutError(error);
}

function getModelChain(task: AiTask, useProFallback = false): string[] {
  switch (task) {
    case 'vision':
      return VISION_MODELS;
    case 'mealPlan':
      return useProFallback ? MEAL_PLAN_PRO_MODELS : MEAL_PLAN_MODELS;
    case 'shoppingList':
      return SHOPPING_LIST_MODELS;
    case 'recipe':
      return RECIPE_MODELS;
  }
}

function maxRetriesForTask(task: AiTask): number {
  return task === 'mealPlan' ? MEAL_PLAN_MAX_RETRIES : MAX_RETRIES;
}

function timeoutForTask(task: AiTask): number {
  return task === 'mealPlan' ? MEAL_PLAN_TIMEOUT_MS : REQUEST_TIMEOUT_MS;
}

function temperatureForTask(task: AiTask): number {
  switch (task) {
    case 'vision':
      return 0.2;
    case 'mealPlan':
      return 0.85;
    case 'shoppingList':
      return 0.4;
    case 'recipe':
      return 0.4;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeoutId: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('REQUEST_TIMEOUT')), ms);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  });
}

function getApiKey(): string {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  return apiKey;
}

async function requestOnce<T>(
  modelName: string,
  options: GenerateStructuredJsonOptions,
  timeoutMs: number,
): Promise<T> {
  const model = new GoogleGenerativeAI(getApiKey()).getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: options.responseSchema as Schema,
      temperature: temperatureForTask(options.task),
    },
  });

  const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [
    { text: options.prompt },
  ];

  if (options.imageBase64 && options.mimeType) {
    parts.unshift({
      inlineData: {
        data: options.imageBase64,
        mimeType: options.mimeType,
      },
    });
  }

  const result = await withTimeout(
    model.generateContent({
      contents: [{
        role: 'user',
        parts,
      }],
    }),
    timeoutMs,
  );
  const text = result.response.text();

  if (!text) {
    throw new Error('Empty response from Gemini');
  }

  return JSON.parse(text) as T;
}

export async function generateStructuredJson<T>(options: GenerateStructuredJsonOptions): Promise<T> {
  let lastError: unknown;
  const budget = options.budget;
  const varietyAttempt = options.varietyAttempt ?? 0;
  let models = getModelChain(options.task, options.useProFallback);

  if (budget && options.task === 'mealPlan' && budget.remainingMs() < MIN_BUDGET_FOR_UNAVAILABLE_RETRY_MS) {
    models = models.slice(0, 1);
  }

  const maxModelAttempts = budget && options.task === 'mealPlan'
    ? 1
    : models.length;

  for (let modelIndex = 0; modelIndex < Math.min(models.length, maxModelAttempts); modelIndex++) {
    const modelName = models[modelIndex];
    const isMealPlanBudget = Boolean(budget && options.task === 'mealPlan');
    const maxAttempts = isMealPlanBudget
      ? MEAL_PLAN_UNAVAILABLE_MAX_RETRIES
      : maxRetriesForTask(options.task);

    for (let geminiAttempt = 0; geminiAttempt <= maxAttempts; geminiAttempt++) {
      if (budget) {
        budget.assertCanStartCall(MIN_BUDGET_TO_START_CALL_MS);
        logMealPlanBudget({
          requestId: budget.requestId,
          attempt: varietyAttempt,
          geminiAttempt,
          model: modelName,
          elapsedMs: budget.elapsedMs(),
          remainingBudgetMs: budget.remainingMs(),
          event: 'gemini_start',
        });
      }

      const perCallTimeout = budget
        ? budget.callTimeoutMs(timeoutForTask(options.task))
        : timeoutForTask(options.task);

      try {
        const result = await requestOnce<T>(modelName, options, perCallTimeout);
        if (budget) {
          logMealPlanBudget({
            requestId: budget.requestId,
            attempt: varietyAttempt,
            geminiAttempt,
            model: modelName,
            elapsedMs: budget.elapsedMs(),
            remainingBudgetMs: budget.remainingMs(),
            event: 'gemini_end',
          });
        }
        return result;
      } catch (error) {
        lastError = error;

        if (budget) {
          logMealPlanBudget({
            requestId: budget.requestId,
            attempt: varietyAttempt,
            geminiAttempt,
            model: modelName,
            elapsedMs: budget.elapsedMs(),
            remainingBudgetMs: budget.remainingMs(),
            code: getErrorMessage(error),
            event: 'error',
          });
        }

        if (isExecutionBudgetExceededError(error)) {
          throw error;
        }

        if (isQuotaExceededError(error)) {
          throw error;
        }

        if (isModelNotFoundError(error)) {
          break;
        }

        if (budget && !budget.canStartCall(MIN_BUDGET_TO_START_CALL_MS)) {
          throw new ExecutionBudgetExceededError();
        }

        if (isMealPlanBudget && budget) {
          const delayMs = unavailableRetryDelayMs();
          const canRetry =
            geminiAttempt < MEAL_PLAN_UNAVAILABLE_MAX_RETRIES &&
            isRetryableUnavailableError(error) &&
            budget.remainingMs() >= MIN_BUDGET_FOR_UNAVAILABLE_RETRY_MS &&
            budget.remainingMs() - delayMs >= MIN_BUDGET_TO_START_CALL_MS;

          if (canRetry) {
            logMealPlanBudget({
              requestId: budget.requestId,
              attempt: varietyAttempt,
              geminiAttempt: geminiAttempt + 1,
              model: modelName,
              elapsedMs: budget.elapsedMs(),
              remainingBudgetMs: budget.remainingMs(),
              code: 'GEMINI_UNAVAILABLE',
              event: 'retry_scheduled',
            });
            await sleep(delayMs);
            continue;
          }

          if (geminiAttempt < MEAL_PLAN_UNAVAILABLE_MAX_RETRIES) {
            logMealPlanBudget({
              requestId: budget.requestId,
              attempt: varietyAttempt,
              geminiAttempt: geminiAttempt + 1,
              model: modelName,
              elapsedMs: budget.elapsedMs(),
              remainingBudgetMs: budget.remainingMs(),
              code: unavailableRetrySkipReason(error, budget, geminiAttempt, delayMs),
              event: 'retry_skipped',
            });
          }

          break;
        }

        const retryDelay = parseRetryAfterMs(error);
        if (retryDelay && geminiAttempt < maxAttempts) {
          if (budget && retryDelay > budget.remainingMs() - MIN_BUDGET_TO_START_CALL_MS) {
            throw new ExecutionBudgetExceededError();
          }
          await sleep(retryDelay);
          continue;
        }

        if (isTransientUnavailableError(error) && geminiAttempt < maxAttempts) {
          const backoffMs = 1000 * (geminiAttempt + 1);
          if (budget && backoffMs > budget.remainingMs() - MIN_BUDGET_TO_START_CALL_MS) {
            throw new ExecutionBudgetExceededError();
          }
          await sleep(backoffMs);
          continue;
        }

        break;
      }
    }

    const hasNextModel = modelIndex < Math.min(models.length, maxModelAttempts) - 1;
    if (hasNextModel && lastError && shouldTryNextModel(lastError)) {
      if (budget && !budget.canStartCall(MIN_BUDGET_TO_START_CALL_MS)) {
        throw new ExecutionBudgetExceededError();
      }
      continue;
    }

    break;
  }

  throw lastError ?? new Error('Gemini request failed');
}

export async function generateVisionJson<T>(
  options: Omit<GenerateStructuredJsonOptions, 'task'> & { imageBase64: string; mimeType: string },
): Promise<T> {
  return generateStructuredJson<T>({ ...options, task: 'vision' });
}

export function toGeminiErrorInfo(error: unknown): GeminiErrorInfo {
  const message = getErrorMessage(error);

  if (/GEMINI_API_KEY is not configured/i.test(message)) {
    return {
      code: 'CONFIGURATION',
      status: 500,
      message: 'Gemini API key is not configured on the Edge Function.',
    };
  }

  if (isQuotaExceededError(error)) {
    return {
      code: 'QUOTA_EXCEEDED',
      status: 429,
      message: 'Gemini quota exceeded.',
    };
  }

  if (isRequestTimeoutError(error) || isExecutionBudgetExceededError(error)) {
    return {
      code: 'TIMEOUT',
      status: 504,
      message: 'Gemini request timed out.',
    };
  }

  if (isTransientUnavailableError(error) || isModelNotFoundError(error)) {
    return {
      code: 'GEMINI_UNAVAILABLE',
      status: 503,
      message: 'Gemini is unavailable for this request.',
    };
  }

  if (/Invalid meal plan|JSON\.parse|Unexpected token/i.test(message)) {
    return {
      code: 'VALIDATION',
      status: 502,
      message: 'Gemini returned invalid JSON.',
    };
  }

  return {
    code: 'INTERNAL',
    status: 500,
    message: 'AI request failed.',
  };
}
