import { GoogleGenerativeAI, Schema, SchemaType } from '@google/generative-ai';
import { AI_LIMITS } from '../../constants/ai';
import { env } from '../../lib/env';
import type { AiTask } from './config';
import {
  getModelChain,
  isModelNotFoundError,
  isTransientUnavailableError,
  parseRetryAfterMs,
  shouldAbortAllModels,
  shouldTryNextModel,
  sleep,
} from './errors';

let client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!env.geminiApiKey) {
    throw new Error('EXPO_PUBLIC_GEMINI_API_KEY is not configured');
  }
  if (!client) {
    client = new GoogleGenerativeAI(env.geminiApiKey);
  }
  return client;
}

type GenerateJsonOptions = {
  task: AiTask;
  prompt: string;
  imageBase64?: string;
  mimeType?: string;
  responseSchema: object;
  useProFallback?: boolean;
};

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

async function requestOnce<T>(
  modelName: string,
  options: GenerateJsonOptions,
): Promise<T> {
  const model = getClient().getGenerativeModel({
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

  const result = await model.generateContent({ contents: [{ role: 'user', parts }] });
  const text = result.response.text();

  if (!text) {
    throw new Error('Empty response from Gemini');
  }

  return JSON.parse(text) as T;
}

export async function generateStructuredJson<T>(options: GenerateJsonOptions): Promise<T> {
  const models = getModelChain(options.task, options.useProFallback);
  let lastError: unknown;

  for (let modelIndex = 0; modelIndex < models.length; modelIndex++) {
    const modelName = models[modelIndex];

    for (let attempt = 0; attempt <= AI_LIMITS.maxRetries; attempt++) {
      try {
        return await requestOnce<T>(modelName, options);
      } catch (error) {
        lastError = error;

        // Quota is per-project — trying other models only burns more requests
        if (shouldAbortAllModels(error)) {
          throw error;
        }

        // Deprecated model — skip retries, try next model
        if (isModelNotFoundError(error)) {
          break;
        }

        const retryDelay = parseRetryAfterMs(error);
        if (retryDelay && attempt < AI_LIMITS.maxRetries) {
          await sleep(retryDelay);
          continue;
        }

        if (isTransientUnavailableError(error) && attempt < AI_LIMITS.maxRetries) {
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

/** Re-export for schema builders */
export { SchemaType };
