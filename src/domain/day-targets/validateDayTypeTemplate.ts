import { validateMacroCalorieConsistency } from '../nutrition-targets';
import type { DayTypeCode, DayTypeTemplate, DayTargetsState, WeeklySchedule } from './types';

const DAY_TYPE_CODES: ReadonlySet<string> = new Set([
  'work_long_bike',
  'strength_training',
  'work_short_bike',
  'rest',
  'custom',
]);

export type ValidateDayTypeTemplateResult =
  | { ok: true; template: DayTypeTemplate }
  | { ok: false; message: string };

export function isDayTypeCode(value: string): value is DayTypeCode {
  return DAY_TYPE_CODES.has(value);
}

export function validateDayTypeTemplate(
  template: DayTypeTemplate,
): ValidateDayTypeTemplateResult {
  if (!template.id?.trim()) {
    return { ok: false, message: 'Template sem id.' };
  }
  if (!isDayTypeCode(template.code)) {
    return { ok: false, message: 'Código de tipo de dia inválido.' };
  }
  if (!template.label?.trim()) {
    return { ok: false, message: 'Template sem label.' };
  }
  if (typeof template.isActive !== 'boolean') {
    return { ok: false, message: 'isActive inválido.' };
  }

  const consistency = validateMacroCalorieConsistency({
    targetCalories: template.dailyGoals.calories,
    proteinGrams: template.dailyGoals.protein,
    carbsGrams: template.dailyGoals.carbs,
    fatGrams: template.dailyGoals.fat,
  });

  if (consistency.status === 'invalid_input') {
    return { ok: false, message: consistency.message };
  }

  return { ok: true, template };
}

export type DayTargetsConfigIssue =
  | { kind: 'duplicate_template_id'; templateId: string }
  | { kind: 'duplicate_weekday'; weekday: number }
  | { kind: 'invalid_template'; templateId: string; message: string };

export type ValidateDayTargetsConfigResult = {
  ok: boolean;
  issues: DayTargetsConfigIssue[];
};

/** Identifica configuração inválida (duplicados / templates inválidos). */
export function validateDayTargetsConfig(state: DayTargetsState): ValidateDayTargetsConfigResult {
  const issues: DayTargetsConfigIssue[] = [];
  const seenTemplateIds = new Set<string>();

  for (const template of state.dayTypeTemplates) {
    if (seenTemplateIds.has(template.id)) {
      issues.push({ kind: 'duplicate_template_id', templateId: template.id });
    } else {
      seenTemplateIds.add(template.id);
    }
    const validated = validateDayTypeTemplate(template);
    if (!validated.ok) {
      issues.push({
        kind: 'invalid_template',
        templateId: template.id,
        message: validated.message,
      });
    }
  }

  const seenWeekdays = new Set<number>();
  for (const entry of state.weeklySchedule.entries) {
    if (seenWeekdays.has(entry.weekday)) {
      issues.push({ kind: 'duplicate_weekday', weekday: entry.weekday });
    } else {
      seenWeekdays.add(entry.weekday);
    }
  }

  return { ok: issues.length === 0, issues };
}

export function hasDuplicateWeekday(
  schedule: WeeklySchedule,
  weekday: number,
): boolean {
  return schedule.entries.filter((e) => e.weekday === weekday).length > 1;
}

export function hasDuplicateTemplateId(
  templates: DayTypeTemplate[],
  templateId: string,
): boolean {
  return templates.filter((t) => t.id === templateId).length > 1;
}
