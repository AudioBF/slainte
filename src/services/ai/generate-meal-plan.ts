import { mockPlannedMeals } from '../../data/mock';
import {
  buildMealPlanGenerationMeta,
  buildWeeklyMealPlanTargets,
  isMultiTargetMealPlanEnabled,
  toV2Request,
  type MealPlanGenerationMeta,
  type MealPlanGenerationRequestV2,
} from '../../domain/meal-plan-targets';
import type {
  DailyNutritionTarget,
  DayTypeTemplate,
  WeeklySchedule,
} from '../../domain/day-targets';
import { resolveConsistentDailyGoals } from '../../domain/nutrition-targets';
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

export const MULTI_TARGET_REQUIRES_EDGE_MESSAGE =
  'A geração com metas diferentes por dia exige o serviço seguro de geração. Tente novamente mais tarde.';

export type GenerateMealPlanContext = {
  dayTypeTemplates: DayTypeTemplate[];
  weeklySchedule: WeeklySchedule;
  dailyTargetOverrides: DailyNutritionTarget[];
  referenceDateISO?: string;
  /** Overrides env flags (tests). */
  dayTargetsEnabled?: boolean;
  multiTargetEnabled?: boolean;
};

export type GenerateMealPlanOutcome = Omit<MealPlanResult, 'generationMeta'> & {
  generationMeta: MealPlanGenerationMeta | null;
  contractVersion: 1 | 2;
  /** Present when V2 was built (for tests/E2E assertions). */
  v2Request?: MealPlanGenerationRequestV2;
};

/** Garante calorias + macros Atwater-consistentes no payload (sem mutar o store). */
function withConsistentNutritionTargets(profile: UserProfile): UserProfile {
  const resolved = resolveConsistentDailyGoals(profile.dailyGoals);
  if (!resolved.ok) {
    throw new Error(
      resolved.message ||
        'Não foi possível alinhar as metas nutricionais para gerar o cardápio. Ajuste calorias, proteína ou gordura no perfil.',
    );
  }
  return {
    ...profile,
    dailyGoals: resolved.goals,
  };
}

function mockMealPlan(summary?: string): MealPlanResult {
  return {
    recipes: [],
    plannedMeals: mockPlannedMeals.map(({ recipeId: _recipeId, ...meal }) => meal),
    summary:
      summary ??
      'Plano simulado — configure EXPO_PUBLIC_GEMINI_API_KEY para geração real.',
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

async function generateMealPlanV1Client(profile: UserProfile): Promise<MealPlanResult> {
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

/**
 * Gera cardápio semanal.
 * V1: Edge → Gemini client → mock (comportamento legado).
 * V2 (ambas flags ON): exige Edge; mock/E2E permitido sem Edge; sem fallback silencioso para V1/client.
 */
export async function generateMealPlan(
  profile: UserProfile,
  options?: { useProModel?: boolean } & GenerateMealPlanContext,
): Promise<GenerateMealPlanOutcome> {
  void options?.useProModel;

  const dayTargetsEnabled = options?.dayTargetsEnabled ?? env.useDayTargets;
  const multiTargetEnabled = options?.multiTargetEnabled ?? env.useMultiTargetMealPlan;
  const multi = isMultiTargetMealPlanEnabled(dayTargetsEnabled, multiTargetEnabled);

  const built = buildWeeklyMealPlanTargets({
    profile,
    dayTypeTemplates: options?.dayTypeTemplates ?? [],
    weeklySchedule: options?.weeklySchedule ?? { entries: [] },
    dailyTargetOverrides: options?.dailyTargetOverrides ?? [],
    referenceDateISO: options?.referenceDateISO,
    dayTargetsEnabled,
    multiTargetEnabled,
  });

  if (!built.ok) {
    throw new Error(built.errors[0] || 'Não foi possível preparar as metas do cardápio.');
  }

  const weekStart = built.normalizedTargets.find((t) => t.dayIndex === 0)?.dateISO;

  if (!multi || built.contractVersion === 1) {
    const nutritionProfile = withConsistentNutritionTargets({
      ...profile,
      dailyGoals: built.v1DailyGoals,
    });

    let plan: MealPlanResult;
    if (env.aiMock) {
      await new Promise((r) => setTimeout(r, 200));
      plan = mockMealPlan();
    } else if (env.useEdgeMealPlan) {
      const raw = await invokeGenerateMealPlan({ profile: nutritionProfile });
      plan = mealPlanSchema.parse(raw);
    } else if (!hasGeminiKey()) {
      await new Promise((r) => setTimeout(r, 200));
      plan = mockMealPlan();
    } else {
      plan = await generateMealPlanV1Client(nutritionProfile);
    }

    const generationMeta = buildMealPlanGenerationMeta({
      built,
      referenceWeekStartISO: weekStart,
      validationStatus: 'ok',
    });

    return {
      ...plan,
      generationMeta,
      contractVersion: 1,
    };
  }

  // --- V2 ---
  const v2Request = toV2Request(built, {
    goal: profile.goal,
    restrictions: profile.restrictions,
  });

  if (!env.useEdgeMealPlan && !env.aiMock) {
    throw new Error(MULTI_TARGET_REQUIRES_EDGE_MESSAGE);
  }

  let plan: MealPlanResult;
  let validationStatus: MealPlanGenerationMeta['validationStatus'] = 'ok';
  let repairedDays: number[] | undefined;

  if (env.aiMock) {
    await new Promise((r) => setTimeout(r, 200));
    plan = mockMealPlan(
      'Plano simulado multi-meta — baseado nas metas da agenda semanal (E2E/mock).',
    );
  } else {
    const raw = await invokeGenerateMealPlan(v2Request);
    const parsed = mealPlanSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(`Invalid meal plan: ${parsed.error.issues[0]?.message ?? 'schema'}`);
    }
    plan = parsed.data;
    const meta = parsed.data.generationMeta;
    if (meta?.validationStatus) validationStatus = meta.validationStatus;
    if (meta?.repairedDays) repairedDays = meta.repairedDays;
  }

  const generationMeta = buildMealPlanGenerationMeta({
    built,
    referenceWeekStartISO: weekStart,
    validationStatus,
    repairedDays: repairedDays as MealPlanGenerationMeta['repairedDays'],
  });

  return {
    ...plan,
    generationMeta,
    contractVersion: 2,
    v2Request,
  };
}
