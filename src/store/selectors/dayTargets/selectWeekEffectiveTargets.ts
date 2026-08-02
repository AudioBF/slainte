import type { SelectEffectiveNutritionTargetInput } from './types';
import type { ResolvedEffectiveNutritionTarget } from './types';
import { selectEffectiveNutritionTargetForDate } from './selectEffectiveNutritionTargetForDate';
import { selectWeekCivilDates } from './selectWeekCivilDates';

export function selectWeekEffectiveTargets(input: {
  profile: SelectEffectiveNutritionTargetInput['profile'];
  dayTypeTemplates: SelectEffectiveNutritionTargetInput['dayTypeTemplates'];
  weeklySchedule: SelectEffectiveNutritionTargetInput['weeklySchedule'];
  dailyTargetOverrides: SelectEffectiveNutritionTargetInput['dailyTargetOverrides'];
  referenceDateISO: string;
  flagEnabled: boolean;
}): ResolvedEffectiveNutritionTarget[] {
  const dates = selectWeekCivilDates(input.referenceDateISO);
  return dates.map((dateISO) =>
    selectEffectiveNutritionTargetForDate({
      profile: input.profile,
      dayTypeTemplates: input.dayTypeTemplates,
      weeklySchedule: input.weeklySchedule,
      dailyTargetOverrides: input.dailyTargetOverrides,
      dateISO,
      flagEnabled: input.flagEnabled,
    }),
  );
}
