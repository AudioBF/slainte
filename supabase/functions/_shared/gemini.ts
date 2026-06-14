import { GoogleGenerativeAI, type Schema } from 'npm:@google/generative-ai@0.24.1';
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
const REQUEST_TIMEOUT_MS = 50_000;
const MEAL_PLAN_TIMEOUT_MS = 120_000;

type AiTask = 'vision' | 'mealPlan' | 'shoppingList';

type GenerateStructuredJsonOptions = {
  task: AiTask;
  prompt: string;
  imageBase64?: string;
  mimeType?: string;
  responseSchema: object;
  useProFallback?: boolean;
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

function isRequestTimeoutError(error: unknown): boolean {
  return getErrorMessage(error) === 'REQUEST_TIMEOUT';
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
    timeoutForTask(options.task),
  );
  const text = result.response.text();

  if (!text) {
    throw new Error('Empty response from Gemini');
  }

  return JSON.parse(text) as T;
}

export async function generateStructuredJson<T>(options: GenerateStructuredJsonOptions): Promise<T> {
  let lastError: unknown;
  const models = getModelChain(options.task, options.useProFallback);

  for (let modelIndex = 0; modelIndex < models.length; modelIndex++) {
    const modelName = models[modelIndex];

    for (let attempt = 0; attempt <= maxRetriesForTask(options.task); attempt++) {
      try {
        return await requestOnce<T>(modelName, options);
      } catch (error) {
        lastError = error;

        if (isQuotaExceededError(error)) {
          throw error;
        }

        if (isModelNotFoundError(error)) {
          break;
        }

        const retryDelay = parseRetryAfterMs(error);
        if (retryDelay && attempt < maxRetriesForTask(options.task)) {
          await sleep(retryDelay);
          continue;
        }

        if (isTransientUnavailableError(error) && attempt < maxRetriesForTask(options.task)) {
          await sleep(1000 * (attempt + 1));
          continue;
        }

        break;
      }
    }

    const hasNextModel = modelIndex < models.length - 1;
    if (hasNextModel && lastError && shouldTryNextModel(lastError)) {
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

  if (isRequestTimeoutError(error)) {
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
