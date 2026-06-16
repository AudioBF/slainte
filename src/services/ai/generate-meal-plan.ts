import { mockPlannedMeals } from '../../data/mock';
import { env, hasGeminiKey } from '../../lib/env';
import type { UserProfile } from '../../types';
import { generateStructuredJson } from './client';
import { invokeGenerateMealPlan } from './edge-client';
import {
  buildMealPlanPrompt,
  buildMealPlanRetryPrompt,
} from './prompts/meal-plan.prompt';
import {
  mealPlanResponseSchema,
  mealPlanSchema,
  type MealPlanResult,
} from './schemas/meal-plan.schema';
import { validateMealPlanVariety } from './validate-meal-plan';

const MAX_VARIETY_ATTEMPTS = 2;

function mockMealPlan(): MealPlanResult {
  return {
    recipes: [],
    plannedMeals: mockPlannedMeals.map(({ recipeId: _recipeId, ...meal }) => meal),
    summary: 'Plano simulado — configure EXPO_PUBLIC_GEMINI_API_KEY para geração real.',
  };
}

async function requestMealPlan(
  profile: UserProfile,
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
  });

  const parsed = mealPlanSchema.safeParse(raw);
  if (parsed.success) {
    return parsed.data;
  }

  throw new Error(`Invalid meal plan: ${parsed.error.issues[0]?.message ?? 'schema'}`);
}

export async function generateMealPlan(
  profile: UserProfile,
  options?: { useProModel?: boolean },
): Promise<MealPlanResult> {
  if (env.aiMock) {
    await new Promise((r) => setTimeout(r, 1200));
    return mockMealPlan();
  }

  void options;

  if (env.useEdgeMealPlan) {
    const raw = await invokeGenerateMealPlan({ profile });
    return mealPlanSchema.parse(raw);
  }

  if (!hasGeminiKey()) {
    await new Promise((r) => setTimeout(r, 1200));
    return mockMealPlan();
  }

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
