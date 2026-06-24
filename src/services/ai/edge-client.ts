import { getSupabase } from '../supabase/client';
import type { PlannedMeal, Recipe, UserProfile } from '../../types';

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

type GenerateShoppingListBody =
  | {
      recipes: Array<Pick<Recipe, 'name' | 'servings' | 'ingredients'>>;
    }
  | {
      plannedMeals: Array<Pick<PlannedMeal, 'name' | 'slot' | 'dayIndex'>>;
    };

type GenerateMealPlanBody = {
  profile: UserProfile;
};

type GenerateRecipeBody = {
  profile: UserProfile;
  plannedMeal: Pick<
    PlannedMeal,
    'id' | 'name' | 'slot' | 'dayIndex' | 'calories' | 'protein' | 'carbs' | 'fat'
  >;
};

type AiFunctionBodyMap = {
  'analyze-meal': AnalyzeMealBody;
  'generate-meal-plan': GenerateMealPlanBody;
  'generate-shopping-list': GenerateShoppingListBody;
  'generate-recipe': GenerateRecipeBody;
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

function messageForEdgeFailure(failure: EdgeFailure): string {
  switch (failure.code) {
    case 'UNAUTHORIZED':
      return 'Entre na conta para usar a IA.';
    case 'CONFIGURATION':
      return 'Supabase não configurado para usar a IA.';
    case 'NETWORK':
      return 'Não foi possível conectar à função de IA.';
    case 'TIMEOUT':
      return 'A geração demorou mais que o esperado. Tente novamente em alguns minutos.';
    case 'QUOTA_EXCEEDED':
      return 'Cota da API esgotada. Aguarde o reset ou verifique billing no Google AI Studio.';
    case 'GEMINI_UNAVAILABLE':
      return 'O serviço de IA ficou sobrecarregado agora. Espere alguns minutos e tente novamente.';
    case 'BAD_REQUEST':
    case 'VALIDATION':
      return 'A IA retornou um formato inválido. Toque em gerar novamente.';
    case 'FUNCTION':
    case 'INTERNAL':
    case 'METHOD_NOT_ALLOWED':
      return failure.error || 'A função de IA retornou erro.';
  }
}

async function readFunctionErrorEnvelope(error: unknown): Promise<EdgeFailure | null> {
  const context = (error as { context?: unknown } | null)?.context;
  const response = context as { clone?: unknown; text?: unknown } | null;
  if (!response || typeof response.clone !== 'function') {
    return null;
  }

  try {
    const clone = (response.clone as () => Response).call(response);
    const text = await clone.text();
    const parsed = JSON.parse(text) as Partial<EdgeFailure>;
    if (parsed.ok === false && typeof parsed.code === 'string' && typeof parsed.error === 'string') {
      return parsed as EdgeFailure;
    }
  } catch {
    // Fall through to the generic Functions error handling below.
  }

  return null;
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
    const envelope = await readFunctionErrorEnvelope(error);
    if (envelope) {
      throw new AiEdgeError(envelope.code, messageForEdgeFailure(envelope), status, error);
    }

    const message = getFunctionErrorMessage(error);
    const isFetchFailure = /FunctionsFetchError|Failed to fetch|Network request failed|network/i.test(
      `${error instanceof Error ? error.name : ''} ${message}`,
    );

    if (status === 401 || status === 403) {
      throw new AiEdgeError('UNAUTHORIZED', 'Entre na conta para usar a IA.', status, error);
    }

    if (status === 503) {
      throw new AiEdgeError(
        'GEMINI_UNAVAILABLE',
        'O serviço de IA ficou sobrecarregado agora. Espere alguns minutos e tente novamente.',
        status,
        error,
      );
    }

    if (status === 504) {
      throw new AiEdgeError(
        'TIMEOUT',
        'A geração demorou mais que o esperado. Tente novamente em alguns minutos.',
        status,
        error,
      );
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
    throw new AiEdgeError(data.code, messageForEdgeFailure(data));
  }

  return data.data;
}

export function invokeAnalyzeMeal(body: AnalyzeMealBody): Promise<unknown> {
  return invokeAiFunction('analyze-meal', body);
}

export function invokeGenerateShoppingList(body: GenerateShoppingListBody): Promise<unknown> {
  return invokeAiFunction('generate-shopping-list', body);
}

export function invokeGenerateMealPlan(body: GenerateMealPlanBody): Promise<unknown> {
  return invokeAiFunction('generate-meal-plan', body);
}

export function invokeGenerateRecipe(body: GenerateRecipeBody): Promise<unknown> {
  return invokeAiFunction('generate-recipe', body);
}
