import {
  getEffectiveTargetForDate,
} from '../../../domain/day-targets';
import type { MacroGoals } from '../../../types';
import { selectEffectiveTargetLabel } from './selectEffectiveTargetLabel';
import type {
  ResolvedEffectiveNutritionTarget,
  SelectEffectiveNutritionTargetInput,
} from './types';

/**
 * Função pura: resolve meta efetiva para uma data.
 * Componentes React não devem chamar `getEffectiveTargetForDate` diretamente.
 * O wrapper de flag lê `env.useDayTargets` no call site (ex.: tela Hoje).
 */
export function selectEffectiveNutritionTargetForDate(
  input: SelectEffectiveNutritionTargetInput,
): ResolvedEffectiveNutritionTarget {
  const result = getEffectiveTargetForDate({
    dateISO: input.dateISO,
    flagEnabled: input.flagEnabled,
    legacyDailyGoals: input.profile.dailyGoals,
    templates: input.dayTypeTemplates,
    weeklySchedule: input.weeklySchedule,
    dateOverrides: input.dailyTargetOverrides,
  });

  const label = input.flagEnabled
    ? selectEffectiveTargetLabel(result.target, input.dayTypeTemplates)
    : null;

  return {
    ...result.target,
    configStatus: result.configStatus,
    label,
  };
}

export function selectEffectiveGoalsForDate(
  input: SelectEffectiveNutritionTargetInput,
): MacroGoals {
  return selectEffectiveNutritionTargetForDate(input).dailyGoals;
}
