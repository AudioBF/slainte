import { AI_MODEL_FALLBACKS } from '../../constants/ai';
import type { AiTask } from './config';
import { getModelForTask } from './config';

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Daily quota exhausted or free tier not available (limit: 0) */
export function isQuotaExceededError(error: unknown): boolean {
  const message = getErrorMessage(error);
  return (
    /429|quota exceeded|RESOURCE_EXHAUSTED|exceeded your current quota/i.test(message) ||
    /free_tier.*limit:\s*0/i.test(message)
  );
}

/** Model deprecated or removed — try next model in chain */
export function isModelNotFoundError(error: unknown): boolean {
  const message = getErrorMessage(error);
  return /404|no longer available|not found|NOT_FOUND/i.test(message);
}

/** Temporary server overload — safe to retry same model */
export function isTransientUnavailableError(error: unknown): boolean {
  const message = getErrorMessage(error);
  return /503|500|502|504|high demand|overloaded|UNAVAILABLE/i.test(message);
}

export function parseRetryAfterMs(error: unknown): number | null {
  const message = getErrorMessage(error);
  const match = message.match(/Please retry in ([\d.]+)s/i);
  return match ? Math.ceil(parseFloat(match[1]) * 1000) : null;
}

export function toAiUserMessage(error: unknown): string {
  const message = getErrorMessage(error);

  if (/free_tier.*limit:\s*0|limit:\s*0,\s*model/i.test(message)) {
    return (
      'Sua key não tem cota no plano gratuito deste modelo. ' +
      'Crie uma API key em aistudio.google.com (formato AIza...) ou ative billing em ai.google.dev.'
    );
  }

  if (isQuotaExceededError(error)) {
    return (
      'Cota da API esgotada. Aguarde o reset ou verifique billing no Google AI Studio.'
    );
  }

  if (isModelNotFoundError(error)) {
    return 'Modelo de IA indisponível. Atualize o app ou tente novamente em instantes.';
  }

  if (/503|high demand|overloaded|UNAVAILABLE/i.test(message)) {
    return 'O Gemini está sobrecarregado no momento. Aguarde alguns segundos e tente de novo.';
  }

  if (/API key|401|403|PERMISSION_DENIED/i.test(message)) {
    return 'Chave da API inválida ou sem permissão. Verifique o .env.';
  }

  return 'Não foi possível completar a análise. Tente novamente.';
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getModelChain(task: AiTask, useProFallback = false): string[] {
  const primary = getModelForTask(task, useProFallback);
  const fallbacks = AI_MODEL_FALLBACKS[task];
  return [...new Set([primary, ...fallbacks.filter((m) => m !== primary)])];
}

export function shouldAbortAllModels(error: unknown): boolean {
  return isQuotaExceededError(error);
}

export function shouldTryNextModel(error: unknown): boolean {
  return isModelNotFoundError(error) || isTransientUnavailableError(error);
}

export function shouldRetrySameModel(error: unknown): boolean {
  return isTransientUnavailableError(error);
}
