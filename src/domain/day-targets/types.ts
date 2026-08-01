import type { MacroGoals } from '../../types';

/**
 * Categorias genéricas de tipo de dia (não são a rotina pessoal do usuário).
 */
export type DayTypeCode =
  | 'work_long_bike'
  | 'strength_training'
  | 'work_short_bike'
  | 'rest'
  | 'custom';

/**
 * Weekday alinhado a PlannedMeal.dayIndex:
 * segunda = 0 … domingo = 6.
 * Não confundir com Date.getDay() (domingo = 0).
 */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type DayTypeTemplate = {
  id: string;
  code: DayTypeCode;
  label: string;
  description?: string;
  dailyGoals: MacroGoals;
  isActive: boolean;
};

export type WeeklyScheduleEntry = {
  weekday: Weekday;
  templateId: string;
};

export type WeeklySchedule = {
  entries: WeeklyScheduleEntry[];
  /** ISO date YYYY-MM-DD opcional (histórico futuro). */
  effectiveFrom?: string;
};

export type TargetSource =
  | 'date_override'
  | 'weekly_schedule'
  | 'profile_default'
  | 'flag_off';

/** Snapshot / exceção por data civil YYYY-MM-DD (Europe/Dublin). */
export type DailyNutritionTarget = {
  dateISO: string;
  dailyGoals: MacroGoals;
  templateId?: string | null;
  source: TargetSource;
  note?: string;
};

export type EffectiveNutritionTarget = {
  dateISO: string;
  weekday: Weekday;
  dailyGoals: MacroGoals;
  source: TargetSource;
  templateId: string | null;
  dayTypeCode: DayTypeCode | null;
  isConsistent: boolean;
};

export type DayTargetsState = {
  dayTypeTemplates: DayTypeTemplate[];
  weeklySchedule: WeeklySchedule;
  /** Persistido no store; UI/uso efetivo no Sprint 2C. */
  dailyTargetOverrides: DailyNutritionTarget[];
};

export type DayTargetsConfigStatus =
  | 'ok'
  | 'invalid_date'
  | 'duplicate_weekday'
  | 'duplicate_override'
  | 'duplicate_template_id'
  | 'inactive_template'
  | 'missing_template';

export const EMPTY_WEEKLY_SCHEDULE: WeeklySchedule = { entries: [] };

export const EMPTY_DAY_TARGETS_STATE: DayTargetsState = {
  dayTypeTemplates: [],
  weeklySchedule: EMPTY_WEEKLY_SCHEDULE,
  dailyTargetOverrides: [],
};

export function cloneMacroGoals(goals: MacroGoals): MacroGoals {
  return {
    calories: goals.calories,
    protein: goals.protein,
    carbs: goals.carbs,
    fat: goals.fat,
  };
}
