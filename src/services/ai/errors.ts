import { ZodError } from 'zod';
import { AI_MODEL_FALLBACKS } from '../../constants/ai';
import type { AiTask } from './config';
import { getModelForTask } from './config';

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function getEdgeErrorCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : null;
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
  const edgeCode = getEdgeErrorCode(error);

  if (edgeCode === 'UNAUTHORIZED') {
    return 'Entre na conta para usar a IA.';
  }

  if (edgeCode === 'CONFIGURATION') {
    return 'Supabase não configurado para usar a IA.';
  }

  if (edgeCode === 'NETWORK') {
    return 'Sem conexão estável. Verifique a internet e tente novamente.';
  }

  if (edgeCode === 'TIMEOUT') {
    return 'A IA demorou demais para responder. Tente novamente — costuma levar 15–30 segundos.';
  }

  if (edgeCode === 'FUNCTION' || edgeCode === 'INTERNAL') {
    return 'Não foi possível completar a operação. Tente novamente.';
  }

  if (edgeCode === 'QUOTA_EXCEEDED') {
    return 'Cota da API esgotada. Aguarde o reset ou verifique billing no Google AI Studio.';
  }

  if (edgeCode === 'GEMINI_UNAVAILABLE') {
    return 'O Gemini está sobrecarregado no momento. Aguarde alguns segundos e tente de novo.';
  }

  if (edgeCode === 'BAD_REQUEST' || edgeCode === 'VALIDATION') {
    return 'A IA retornou um formato inválido. Toque em gerar novamente.';
  }

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

  if (isRequestTimeoutError(error)) {
    return 'A IA demorou demais para responder. Tente novamente — costuma levar 15–30 segundos.';
  }

  if (/API key|401|403|PERMISSION_DENIED/i.test(message)) {
    return 'Chave da API inválida ou sem permissão. Verifique o .env.';
  }

  if (error instanceof ZodError) {
    return 'A IA retornou um formato inválido. Toque em gerar novamente.';
  }

  if (/Invalid meal plan|JSON\.parse|Unexpected token/i.test(message)) {
    return 'Resposta da IA incompleta. Tente gerar o cardápio novamente.';
  }

  if (/Failed to fetch|Network request failed|network/i.test(message)) {
    return 'Sem conexão estável. Verifique a internet e tente novamente.';
  }

  return 'Não foi possível completar a operação. Tente novamente.';
}

/** User-facing copy for on-demand recipe generation failures. */
export function toRecipeUserMessage(error: unknown): string {
  const edgeCode = getEdgeErrorCode(error);
  const message = getErrorMessage(error);

  if (edgeCode === 'UNAUTHORIZED') {
    return 'Entre na conta para gerar receitas.';
  }

  if (edgeCode === 'NETWORK' || /Failed to fetch|Network request failed|network/i.test(message)) {
    return 'Sem conexão estável. Verifique a internet e tente gerar a receita de novo.';
  }

  if (edgeCode === 'TIMEOUT' || isRequestTimeoutError(error)) {
    return 'A geração da receita demorou demais. Toque em Gerar receita para tentar de novo.';
  }

  if (edgeCode === 'GEMINI_UNAVAILABLE' || /503|high demand|overloaded|UNAVAILABLE/i.test(message)) {
    return 'O serviço de receitas está ocupado. Aguarde alguns segundos e tente de novo.';
  }

  if (edgeCode === 'QUOTA_EXCEEDED' || isQuotaExceededError(error)) {
    return 'Cota da API esgotada. Aguarde o reset ou verifique billing no Google AI Studio.';
  }

  if (edgeCode === 'VALIDATION' || edgeCode === 'BAD_REQUEST' || error instanceof ZodError) {
    return 'Não conseguimos montar essa receita agora. Toque em Gerar receita para tentar outra vez.';
  }

  if (edgeCode === 'CONFIGURATION') {
    return 'Supabase não configurado para gerar receitas.';
  }

  return 'Não foi possível gerar a receita agora. Toque em Gerar receita para tentar de novo.';
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

/** Request exceeded AI_LIMITS.requestTimeoutMs */
export function isRequestTimeoutError(error: unknown): boolean {
  return getErrorMessage(error) === 'REQUEST_TIMEOUT';
}

export function shouldTryNextModel(error: unknown): boolean {
  return (
    isModelNotFoundError(error) ||
    isTransientUnavailableError(error) ||
    isRequestTimeoutError(error)
  );
}

export function shouldRetrySameModel(error: unknown): boolean {
  return isTransientUnavailableError(error);
}
