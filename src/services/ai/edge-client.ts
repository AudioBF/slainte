import { getSupabase } from '../supabase/client';
import type { Recipe } from '../../types';

export type AiEdgeErrorCode =
  | 'BAD_REQUEST'
  | 'CONFIGURATION'
  | 'FUNCTION'
  | 'GEMINI_UNAVAILABLE'
  | 'INTERNAL'
  | 'METHOD_NOT_ALLOWED'
  | 'NETWORK'
  | 'QUOTA_EXCEEDED'
  | 'TIMEOUT'
  | 'UNAUTHORIZED'
  | 'VALIDATION';

type EdgeSuccess<T> = {
  ok: true;
  data: T;
};

type EdgeFailure = {
  ok: false;
  code: AiEdgeErrorCode;
  error: string;
};

type EdgeEnvelope<T> = EdgeSuccess<T> | EdgeFailure;

type AnalyzeMealBody = {
  imageBase64: string;
  mimeType: string;
};

type GenerateShoppingListBody = {
  recipes: Recipe[];
};

type AiFunctionBodyMap = {
  'analyze-meal': AnalyzeMealBody;
  'generate-shopping-list': GenerateShoppingListBody;
};

export class AiEdgeError extends Error {
  readonly code: AiEdgeErrorCode;
  readonly status?: number;
  readonly cause?: unknown;

  constructor(code: AiEdgeErrorCode, message: string, status?: number, cause?: unknown) {
    super(message);
    this.name = 'AiEdgeError';
    this.code = code;
    this.status = status;
    this.cause = cause;
  }
}

function getFunctionStatus(error: unknown): number | undefined {
  const context = (error as { context?: { status?: unknown } } | null)?.context;
  return typeof context?.status === 'number' ? context.status : undefined;
}

function getFunctionErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function invokeAiFunction<T, TName extends keyof AiFunctionBodyMap>(
  name: TName,
  body: AiFunctionBodyMap[TName],
): Promise<T> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new AiEdgeError('CONFIGURATION', 'Supabase não configurado para chamar a IA.');
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (sessionError || !accessToken) {
    throw new AiEdgeError('UNAUTHORIZED', 'Entre na conta para usar a IA.', 401, sessionError);
  }

  const { data, error } = await supabase.functions.invoke<EdgeEnvelope<T>>(name, {
    body,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (error) {
    const status = getFunctionStatus(error);
    const message = getFunctionErrorMessage(error);
    const isFetchFailure = /FunctionsFetchError|Failed to fetch|Network request failed|network/i.test(
      `${error instanceof Error ? error.name : ''} ${message}`,
    );

    if (status === 401 || status === 403) {
      throw new AiEdgeError('UNAUTHORIZED', 'Entre na conta para usar a IA.', status, error);
    }

    if (isFetchFailure) {
      throw new AiEdgeError('NETWORK', 'Não foi possível conectar à função de IA.', status, error);
    }

    throw new AiEdgeError('FUNCTION', 'A função de IA retornou erro.', status, error);
  }

  if (!data) {
    throw new AiEdgeError('FUNCTION', 'A função de IA não retornou dados.');
  }

  if (!data.ok) {
    throw new AiEdgeError(data.code, data.error);
  }

  return data.data;
}

export function invokeAnalyzeMeal(body: AnalyzeMealBody): Promise<unknown> {
  return invokeAiFunction('analyze-meal', body);
}

export function invokeGenerateShoppingList(body: GenerateShoppingListBody): Promise<unknown> {
  return invokeAiFunction('generate-shopping-list', body);
}
