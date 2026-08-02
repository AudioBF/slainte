import {
  createPersonalDayTargetSeed,
  type DayTypeCode,
  type DayTypeTemplate,
  type DayTargetsState,
  type WeeklySchedule,
  type WeeklyScheduleEntry,
  type Weekday,
} from '../../domain/day-targets';
import {
  calculateCarbsForCalorieTarget,
  validateMacroCalorieConsistency,
} from '../../domain/nutrition-targets';
import type { MacroGoals } from '../../types';
import { createId } from '../../lib/id';

export const SCHEDULE_WEEKDAY_LABELS = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
  'Domingo',
] as const;

export const DAY_TYPE_CODE_OPTIONS: {
  code: DayTypeCode;
  label: string;
}[] = [
  { code: 'work_long_bike', label: 'Trabalho longo + bicicleta' },
  { code: 'strength_training', label: 'Musculação intensa' },
  { code: 'work_short_bike', label: 'Trabalho reduzido + bicicleta' },
  { code: 'rest', label: 'Descanso' },
  { code: 'custom', label: 'Personalizado' },
];

export function weekdayLabel(weekday: Weekday): string {
  return SCHEDULE_WEEKDAY_LABELS[weekday];
}

export function dayTypeCodeLabel(code: DayTypeCode): string {
  return DAY_TYPE_CODE_OPTIONS.find((o) => o.code === code)?.label ?? code;
}

export function cloneWeeklySchedule(schedule: WeeklySchedule): WeeklySchedule {
  return {
    entries: schedule.entries.map((e) => ({ ...e })),
    ...(schedule.effectiveFrom ? { effectiveFrom: schedule.effectiveFrom } : {}),
  };
}

export function schedulesEqual(a: WeeklySchedule, b: WeeklySchedule): boolean {
  if (a.entries.length !== b.entries.length) return false;
  const sortedA = [...a.entries].sort((x, y) => x.weekday - y.weekday);
  const sortedB = [...b.entries].sort((x, y) => x.weekday - y.weekday);
  return sortedA.every(
    (entry, i) =>
      entry.weekday === sortedB[i].weekday && entry.templateId === sortedB[i].templateId,
  );
}

export function findTemplate(
  templates: DayTypeTemplate[],
  templateId: string | null | undefined,
): DayTypeTemplate | undefined {
  if (!templateId) return undefined;
  return templates.find((t) => t.id === templateId);
}

export function weekdaysUsingTemplate(
  schedule: WeeklySchedule,
  templateId: string,
): Weekday[] {
  return schedule.entries
    .filter((e) => e.templateId === templateId)
    .map((e) => e.weekday)
    .sort((a, b) => a - b) as Weekday[];
}

export type DeactivateTemplateResult =
  | { ok: true }
  | { ok: false; reason: 'in_use'; weekdays: Weekday[]; labels: string[] };

/** Preferência 2B: impedir desativação enquanto associado a algum dia. */
export function canDeactivateTemplate(
  schedule: WeeklySchedule,
  templateId: string,
): DeactivateTemplateResult {
  const weekdays = weekdaysUsingTemplate(schedule, templateId);
  if (weekdays.length === 0) return { ok: true };
  return {
    ok: false,
    reason: 'in_use',
    weekdays,
    labels: weekdays.map(weekdayLabel),
  };
}

export type RemoveTemplatePlan =
  | { kind: 'unused'; templateId: string }
  | {
      kind: 'in_use';
      templateId: string;
      weekdays: Weekday[];
      labels: string[];
    }
  | { kind: 'not_found'; templateId: string };

export function planRemoveDayTypeTemplate(
  templates: DayTypeTemplate[],
  schedule: WeeklySchedule,
  templateId: string,
): RemoveTemplatePlan {
  if (!templates.some((t) => t.id === templateId)) {
    return { kind: 'not_found', templateId };
  }
  const weekdays = weekdaysUsingTemplate(schedule, templateId);
  if (weekdays.length === 0) {
    return { kind: 'unused', templateId };
  }
  return {
    kind: 'in_use',
    templateId,
    weekdays,
    labels: weekdays.map(weekdayLabel),
  };
}

/** Remove associações do template do rascunho da agenda (sem mutar input). */
export function scheduleWithoutTemplate(
  schedule: WeeklySchedule,
  templateId: string,
): WeeklySchedule {
  return {
    ...schedule,
    entries: schedule.entries.filter((e) => e.templateId !== templateId),
  };
}

export function setScheduleEntryDraft(
  schedule: WeeklySchedule,
  weekday: Weekday,
  templateId: string | null,
): WeeklySchedule {
  const without = schedule.entries.filter((e) => e.weekday !== weekday);
  if (templateId == null) {
    return { ...schedule, entries: without };
  }
  const entry: WeeklyScheduleEntry = { weekday, templateId };
  return { ...schedule, entries: [...without, entry] };
}

export type TemplateDraft = {
  id: string | null;
  code: DayTypeCode;
  label: string;
  description: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  isActive: boolean;
};

export function emptyTemplateDraft(partial?: Partial<TemplateDraft>): TemplateDraft {
  return {
    id: null,
    code: 'custom',
    label: '',
    description: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    isActive: true,
    ...partial,
  };
}

export function templateToDraft(template: DayTypeTemplate): TemplateDraft {
  return {
    id: template.id,
    code: template.code,
    label: template.label,
    description: template.description ?? '',
    calories: String(template.dailyGoals.calories),
    protein: String(template.dailyGoals.protein),
    carbs: String(template.dailyGoals.carbs),
    fat: String(template.dailyGoals.fat),
    isActive: template.isActive,
  };
}

function parsePositiveNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export type BuildTemplateResult =
  | { ok: true; template: DayTypeTemplate }
  | { ok: false; message: string };

/**
 * Constrói template a partir do draft da UI.
 * Rejeita inconsistência Atwater (>5 kcal). Não recalcula P/G.
 */
export function buildTemplateFromDraft(draft: TemplateDraft): BuildTemplateResult {
  const label = draft.label.trim();
  if (!label) {
    return { ok: false, message: 'Informe um nome para o tipo de dia.' };
  }

  const calories = parsePositiveNumber(draft.calories);
  const protein = parsePositiveNumber(draft.protein);
  const carbs = parsePositiveNumber(draft.carbs);
  const fat = parsePositiveNumber(draft.fat);

  if (calories == null || protein == null || carbs == null || fat == null) {
    return {
      ok: false,
      message: 'Calorias e macros devem ser números válidos e não negativos.',
    };
  }

  const dailyGoals: MacroGoals = {
    calories: Math.round(calories),
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fat: Math.round(fat),
  };

  const consistency = validateMacroCalorieConsistency({
    targetCalories: dailyGoals.calories,
    proteinGrams: dailyGoals.protein,
    carbsGrams: dailyGoals.carbs,
    fatGrams: dailyGoals.fat,
  });

  if (!consistency.isConsistent) {
    return {
      ok: false,
      message:
        consistency.status === 'invalid_input'
          ? consistency.message
          : `Metas inconsistentes (diferença ${consistency.differenceKcal > 0 ? '+' : ''}${consistency.differenceKcal} kcal). Recalcule os carboidratos ou ajuste os valores.`,
    };
  }

  return {
    ok: true,
    template: {
      id: draft.id?.trim() || createId('tpl'),
      code: draft.code,
      label,
      description: draft.description.trim() || undefined,
      dailyGoals,
      isActive: draft.isActive,
    },
  };
}

export function recalculateDraftCarbs(draft: TemplateDraft): TemplateDraft {
  const calories = parsePositiveNumber(draft.calories);
  const protein = parsePositiveNumber(draft.protein);
  const fat = parsePositiveNumber(draft.fat);
  if (calories == null || protein == null || fat == null) return draft;

  const result = calculateCarbsForCalorieTarget({
    targetCalories: Math.round(calories),
    proteinGrams: Math.round(protein),
    fatGrams: Math.round(fat),
  });

  if (!result.isPossible || result.roundedCarbsGrams == null) return draft;
  return { ...draft, carbs: String(result.roundedCarbsGrams) };
}

export function draftConsistency(draft: TemplateDraft) {
  const calories = parsePositiveNumber(draft.calories);
  const protein = parsePositiveNumber(draft.protein);
  const carbs = parsePositiveNumber(draft.carbs);
  const fat = parsePositiveNumber(draft.fat);
  if (calories == null || protein == null || carbs == null || fat == null) {
    return validateMacroCalorieConsistency({
      targetCalories: Number.NaN,
      proteinGrams: Number.NaN,
      carbsGrams: Number.NaN,
      fatGrams: Number.NaN,
    });
  }
  return validateMacroCalorieConsistency({
    targetCalories: Math.round(calories),
    proteinGrams: Math.round(protein),
    carbsGrams: Math.round(carbs),
    fatGrams: Math.round(fat),
  });
}

export type PersonalSeedSummaryLine = {
  weekdaysLabel: string;
  templateLabel: string;
  calories: number;
};

export function personalSeedSummaryLines(): PersonalSeedSummaryLine[] {
  return [
    {
      weekdaysLabel: 'Seg / Qui / Sex / Sáb',
      templateLabel: 'Trabalho longo + bicicleta',
      calories: 3350,
    },
    {
      weekdaysLabel: 'Ter / Qua',
      templateLabel: 'Musculação intensa',
      calories: 3150,
    },
    {
      weekdaysLabel: 'Domingo',
      templateLabel: 'Trabalho reduzido + bicicleta',
      calories: 3150,
    },
  ];
}

export function hasExistingDayTargetsConfig(state: Pick<
  DayTargetsState,
  'dayTypeTemplates' | 'weeklySchedule'
>): boolean {
  return state.dayTypeTemplates.length > 0 || state.weeklySchedule.entries.length > 0;
}

export function applyPersonalSeedState(): DayTargetsState {
  return createPersonalDayTargetSeed();
}

/** Preserve unsaved agenda drafts when the store schedule changes underneath. */
export function nextDraftAfterStoreScheduleChange(
  draft: WeeklySchedule,
  previousStore: WeeklySchedule,
  nextStore: WeeklySchedule,
): WeeklySchedule {
  if (schedulesEqual(draft, previousStore)) {
    return cloneWeeklySchedule(nextStore);
  }
  return draft;
}

export function activeTemplatesOnly(templates: DayTypeTemplate[]): DayTypeTemplate[] {
  return templates.filter((t) => t.isActive);
}

export function resolveScheduleRow(
  weekday: Weekday,
  schedule: WeeklySchedule,
  templates: DayTypeTemplate[],
): {
  weekday: Weekday;
  label: string;
  template: DayTypeTemplate | null;
  usingProfileDefault: boolean;
  orphaned: boolean;
} {
  const entry = schedule.entries.find((e) => e.weekday === weekday);
  if (!entry) {
    return {
      weekday,
      label: weekdayLabel(weekday),
      template: null,
      usingProfileDefault: true,
      orphaned: false,
    };
  }
  const template = findTemplate(templates, entry.templateId) ?? null;
  return {
    weekday,
    label: weekdayLabel(weekday),
    template,
    usingProfileDefault: false,
    orphaned: template == null,
  };
}

export const ALL_WEEKDAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6];
