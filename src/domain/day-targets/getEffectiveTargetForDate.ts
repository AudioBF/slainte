import { validateMacroCalorieConsistency } from '../nutrition-targets';
import type { MacroGoals } from '../../types';
import { getDublinWeekday } from './getDublinWeekday';
import { isValidCivilDateISO } from './getDublinDateISO';
import {
  hasDuplicateTemplateId,
  hasDuplicateWeekday,
} from './validateDayTypeTemplate';
import {
  cloneMacroGoals,
  type DailyNutritionTarget,
  type DayTargetsConfigStatus,
  type DayTypeTemplate,
  type EffectiveNutritionTarget,
  type WeeklySchedule,
  type Weekday,
} from './types';

export type GetEffectiveTargetForDateInput = {
  dateISO: string;
  flagEnabled: boolean;
  legacyDailyGoals: MacroGoals;
  templates: DayTypeTemplate[];
  weeklySchedule: WeeklySchedule;
  dateOverrides: DailyNutritionTarget[];
};

export type GetEffectiveTargetForDateResult = {
  target: EffectiveNutritionTarget;
  configStatus: DayTargetsConfigStatus;
  message?: string;
};

function goalsConsistency(goals: MacroGoals): boolean {
  return validateMacroCalorieConsistency({
    targetCalories: goals.calories,
    proteinGrams: goals.protein,
    carbsGrams: goals.carbs,
    fatGrams: goals.fat,
  }).isConsistent;
}

function buildTarget(params: {
  dateISO: string;
  weekday: Weekday;
  dailyGoals: MacroGoals;
  source: EffectiveNutritionTarget['source'];
  templateId: string | null;
  dayTypeCode: EffectiveNutritionTarget['dayTypeCode'];
}): EffectiveNutritionTarget {
  const dailyGoals = cloneMacroGoals(params.dailyGoals);
  return {
    dateISO: params.dateISO,
    weekday: params.weekday,
    dailyGoals,
    source: params.source,
    templateId: params.templateId,
    dayTypeCode: params.dayTypeCode,
    isConsistent: goalsConsistency(dailyGoals),
  };
}

/**
 * Resolve a meta nutricional efetiva para uma data civil.
 *
 * Flag ON — prioridade:
 * 1. override explícito da data
 * 2. agenda semanal → template ativo
 * 3. profile.dailyGoals (legado)
 *
 * Flag OFF — sempre legacy com source `flag_off`.
 *
 * Duplicados (weekday / template id) não escolhem item arbitrário: fallback legado.
 * Não muta inputs. Não recalcula carboidratos.
 */
export function getEffectiveTargetForDate(
  input: GetEffectiveTargetForDateInput,
): GetEffectiveTargetForDateResult {
  const legacy = cloneMacroGoals(input.legacyDailyGoals);

  if (!isValidCivilDateISO(input.dateISO)) {
    return {
      target: buildTarget({
        dateISO: input.dateISO,
        weekday: 0,
        dailyGoals: legacy,
        source: input.flagEnabled ? 'profile_default' : 'flag_off',
        templateId: null,
        dayTypeCode: null,
      }),
      configStatus: 'invalid_date',
      message: 'Data civil inválida; usando meta legado.',
    };
  }

  const weekday = getDublinWeekday(input.dateISO);
  if (weekday == null) {
    return {
      target: buildTarget({
        dateISO: input.dateISO,
        weekday: 0,
        dailyGoals: legacy,
        source: input.flagEnabled ? 'profile_default' : 'flag_off',
        templateId: null,
        dayTypeCode: null,
      }),
      configStatus: 'invalid_date',
      message: 'Não foi possível obter weekday; usando meta legado.',
    };
  }

  if (!input.flagEnabled) {
    return {
      target: buildTarget({
        dateISO: input.dateISO,
        weekday,
        dailyGoals: legacy,
        source: 'flag_off',
        templateId: null,
        dayTypeCode: null,
      }),
      configStatus: 'ok',
    };
  }

  const overridesForDate = input.dateOverrides.filter((o) => o.dateISO === input.dateISO);
  if (overridesForDate.length > 1) {
    return {
      target: buildTarget({
        dateISO: input.dateISO,
        weekday,
        dailyGoals: legacy,
        source: 'profile_default',
        templateId: null,
        dayTypeCode: null,
      }),
      configStatus: 'duplicate_override',
      message: 'Overrides duplicados para a data; usando meta legado.',
    };
  }

  if (overridesForDate.length === 1) {
    const override = overridesForDate[0];
    let dayTypeCode: EffectiveNutritionTarget['dayTypeCode'] = null;
    if (override.templateId) {
      if (hasDuplicateTemplateId(input.templates, override.templateId)) {
        return {
          target: buildTarget({
            dateISO: input.dateISO,
            weekday,
            dailyGoals: cloneMacroGoals(override.dailyGoals),
            source: 'date_override',
            templateId: override.templateId,
            dayTypeCode: null,
          }),
          configStatus: 'duplicate_template_id',
          message: 'Template id duplicado no catálogo; override usa dailyGoals próprios.',
        };
      }
      const template = input.templates.find((t) => t.id === override.templateId);
      dayTypeCode = template?.code ?? null;
    }
    return {
      target: buildTarget({
        dateISO: input.dateISO,
        weekday,
        dailyGoals: override.dailyGoals,
        source: 'date_override',
        templateId: override.templateId ?? null,
        dayTypeCode,
      }),
      configStatus: 'ok',
    };
  }

  if (hasDuplicateWeekday(input.weeklySchedule, weekday)) {
    return {
      target: buildTarget({
        dateISO: input.dateISO,
        weekday,
        dailyGoals: legacy,
        source: 'profile_default',
        templateId: null,
        dayTypeCode: null,
      }),
      configStatus: 'duplicate_weekday',
      message: 'Weekday duplicado na agenda; usando meta legado.',
    };
  }

  const scheduleEntry = input.weeklySchedule.entries.find((e) => e.weekday === weekday);
  if (!scheduleEntry) {
    return {
      target: buildTarget({
        dateISO: input.dateISO,
        weekday,
        dailyGoals: legacy,
        source: 'profile_default',
        templateId: null,
        dayTypeCode: null,
      }),
      configStatus: 'ok',
      message: 'Agenda incompleta para o weekday; usando meta legado.',
    };
  }

  if (hasDuplicateTemplateId(input.templates, scheduleEntry.templateId)) {
    return {
      target: buildTarget({
        dateISO: input.dateISO,
        weekday,
        dailyGoals: legacy,
        source: 'profile_default',
        templateId: null,
        dayTypeCode: null,
      }),
      configStatus: 'duplicate_template_id',
      message: 'Template id duplicado; usando meta legado.',
    };
  }

  const templateMatches = input.templates.filter((t) => t.id === scheduleEntry.templateId);
  if (templateMatches.length === 0) {
    return {
      target: buildTarget({
        dateISO: input.dateISO,
        weekday,
        dailyGoals: legacy,
        source: 'profile_default',
        templateId: null,
        dayTypeCode: null,
      }),
      configStatus: 'missing_template',
      message: 'Template ausente; usando meta legado.',
    };
  }

  const template = templateMatches[0];
  if (!template.isActive) {
    return {
      target: buildTarget({
        dateISO: input.dateISO,
        weekday,
        dailyGoals: legacy,
        source: 'profile_default',
        templateId: null,
        dayTypeCode: null,
      }),
      configStatus: 'inactive_template',
      message: 'Template inativo; usando meta legado.',
    };
  }

  return {
    target: buildTarget({
      dateISO: input.dateISO,
      weekday,
      dailyGoals: template.dailyGoals,
      source: 'weekly_schedule',
      templateId: template.id,
      dayTypeCode: template.code,
    }),
    configStatus: 'ok',
  };
}
