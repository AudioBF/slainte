import {
  cloneMacroGoals,
  getDublinDateISO,
  getEffectiveTargetForDate,
  getWeekCivilDates,
  type DailyNutritionTarget,
  type DayTypeTemplate,
  type Weekday,
  type WeeklySchedule,
} from '../day-targets';
import { resolveConsistentDailyGoals } from '../nutrition-targets';
import type { UserProfile } from '../../types';
import { isMultiTargetMealPlanEnabled } from './parseMultiTargetMealPlanFlag';
import type {
  BuildWeeklyMealPlanTargetsResult,
  MealPlanDayTarget,
  MealPlanGenerationRequestV2,
} from './types';
import { validateWeeklyMealPlanTargets } from './validateWeeklyMealPlanTargets';

function resolveLabel(
  source: MealPlanDayTarget['source'],
  templateId: string | null,
  templates: DayTypeTemplate[],
): string | null {
  if (source === 'flag_off') return null;
  if (source === 'date_override') return 'Meta personalizada para esta data';
  if (source === 'weekly_schedule' && templateId) {
    const template = templates.find((t) => t.id === templateId);
    if (template?.label) return `Meta do dia: ${template.label}`;
  }
  return 'Meta padrão do perfil';
}

export type BuildWeeklyMealPlanTargetsInput = {
  profile: Pick<UserProfile, 'dailyGoals' | 'goal' | 'restrictions'>;
  dayTypeTemplates: DayTypeTemplate[];
  weeklySchedule: WeeklySchedule;
  dailyTargetOverrides: DailyNutritionTarget[];
  referenceDateISO?: string;
  dayTargetsEnabled: boolean;
  multiTargetEnabled: boolean;
};

function fail(
  errors: string[],
  warnings: string[] = [],
  contractVersion: 1 | 2 | null = null,
): BuildWeeklyMealPlanTargetsResult {
  return {
    ok: false,
    contractVersion,
    fallbackDailyGoals: null,
    normalizedTargets: null,
    usedFallbackDays: [],
    warnings,
    errors,
    v1DailyGoals: null,
  };
}

/**
 * Constrói o contrato de geração (V1 ou V2).
 * Semana: Europe/Dublin Mon–Sun contendo referenceDateISO (semana corrente).
 */
export function buildWeeklyMealPlanTargets(
  input: BuildWeeklyMealPlanTargetsInput,
): BuildWeeklyMealPlanTargetsResult {
  const warnings: string[] = [];
  const profileGoals = cloneMacroGoals(input.profile.dailyGoals);
  const multi = isMultiTargetMealPlanEnabled(
    input.dayTargetsEnabled,
    input.multiTargetEnabled,
  );

  const resolvedFallback = resolveConsistentDailyGoals(profileGoals);
  if (!resolvedFallback.ok || !resolvedFallback.goals) {
    return fail([
      resolvedFallback.message ||
        'Não foi possível alinhar as metas nutricionais do perfil para gerar o cardápio.',
    ]);
  }
  const fallbackDailyGoals = cloneMacroGoals(resolvedFallback.goals);
  if (resolvedFallback.wasAdjusted) {
    warnings.push('Carboidratos do perfil foram alinhados Atwater apenas no payload.');
  }

  if (!multi) {
    return {
      ok: true,
      contractVersion: 1,
      fallbackDailyGoals,
      normalizedTargets: [0, 1, 2, 3, 4, 5, 6].map((dayIndex) => ({
        dayIndex: dayIndex as Weekday,
        dailyGoals: cloneMacroGoals(fallbackDailyGoals),
        source: input.dayTargetsEnabled ? 'profile_default' : 'flag_off',
        templateId: null,
        dayTypeCode: null,
        label: null,
      })),
      usedFallbackDays: [0, 1, 2, 3, 4, 5, 6],
      warnings,
      errors: [],
      v1DailyGoals: cloneMacroGoals(fallbackDailyGoals),
    };
  }

  const referenceDateISO = input.referenceDateISO ?? getDublinDateISO();
  const weekDates = getWeekCivilDates(referenceDateISO);
  if (!weekDates || weekDates.length !== 7) {
    return fail(
      [`Semana civil Dublin inválida para referência ${referenceDateISO}.`],
      warnings,
      2,
    );
  }

  const usedFallbackDays: Weekday[] = [];
  const rawTargets: MealPlanDayTarget[] = [];

  for (let i = 0; i < 7; i++) {
    const dateISO = weekDates[i];
    const result = getEffectiveTargetForDate({
      dateISO,
      flagEnabled: true,
      legacyDailyGoals: profileGoals,
      templates: input.dayTypeTemplates,
      weeklySchedule: input.weeklySchedule,
      dateOverrides: input.dailyTargetOverrides,
    });
    const effective = result.target;
    const label = resolveLabel(
      effective.source,
      effective.templateId,
      input.dayTypeTemplates,
    );

    const dayResolved = resolveConsistentDailyGoals(effective.dailyGoals);
    if (!dayResolved.ok || !dayResolved.goals) {
      return fail(
        [
          `Meta impossível ou inválida para ${dateISO} (dayIndex ${i}): ${
            dayResolved.message || 'inconsistente'
          }.`,
        ],
        warnings,
        2,
      );
    }

    if (effective.source === 'profile_default' || effective.source === 'flag_off') {
      usedFallbackDays.push(i as Weekday);
    }
    if (dayResolved.wasAdjusted) {
      warnings.push(`dayIndex ${i}: carbs alinhados Atwater no payload.`);
    }

    rawTargets.push({
      dayIndex: i as Weekday,
      dateISO,
      dailyGoals: cloneMacroGoals(dayResolved.goals),
      source: effective.source,
      templateId: effective.templateId,
      dayTypeCode: effective.dayTypeCode,
      label,
    });
  }

  const validated = validateWeeklyMealPlanTargets(rawTargets);
  if (!validated.ok || !validated.sorted) {
    return fail(validated.errors, warnings, 2);
  }

  return {
    ok: true,
    contractVersion: 2,
    fallbackDailyGoals,
    normalizedTargets: validated.sorted,
    usedFallbackDays,
    warnings,
    errors: [],
    v1DailyGoals: cloneMacroGoals(fallbackDailyGoals),
  };
}

export function toV2Request(
  built: Extract<BuildWeeklyMealPlanTargetsResult, { ok: true }>,
  profile: { goal: UserProfile['goal']; restrictions: string },
): MealPlanGenerationRequestV2 {
  return {
    contractVersion: 2,
    profile: {
      goal: profile.goal,
      restrictions: profile.restrictions,
    },
    fallbackDailyGoals: cloneMacroGoals(built.fallbackDailyGoals),
    dailyTargets: built.normalizedTargets.map((t) => ({
      ...t,
      dailyGoals: cloneMacroGoals(t.dailyGoals),
    })),
  };
}
