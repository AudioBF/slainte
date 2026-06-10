import { mockPlannedMeals, mockRecipes } from '../../data/mock';
import { env, hasGeminiKey } from '../../lib/env';
import type { UserProfile } from '../../types';
import { generateStructuredJson } from './client';
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

const MAX_VARIETY_ATTEMPTS = 1;

function mockMealPlan(): MealPlanResult {
  return {
    recipes: mockRecipes,
    plannedMeals: mockPlannedMeals,
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

  return mealPlanSchema.parse(raw);
}

export async function generateMealPlan(
  profile: UserProfile,
  options?: { useProModel?: boolean },
): Promise<MealPlanResult> {
  if (env.aiMock || !hasGeminiKey()) {
    await new Promise((r) => setTimeout(r, 1200));
    return mockMealPlan();
  }

  void options;

  let lastIssues: string[] = [];
  let lastPlan: MealPlanResult | null = null;

  for (let attempt = 0; attempt < MAX_VARIETY_ATTEMPTS; attempt++) {
    const plan = await requestMealPlan(profile, attempt > 0 ? lastIssues : undefined);
    const validation = validateMealPlanVariety(plan);

    if (validation.ok) {
      return plan;
    }

    lastPlan = plan;
    lastIssues = validation.issues;
  }

  // Prefer a flawed plan over failing completely — user can regenerate
  if (lastPlan) {
    return {
      ...lastPlan,
      summary:
        (lastPlan.summary ? `${lastPlan.summary} ` : '') +
        '(Aviso: plano com repetição detectada — toque em gerar novamente para outra versão.)',
    };
  }

  throw new Error('Não foi possível gerar um cardápio válido.');
}
