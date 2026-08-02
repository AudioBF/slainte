import type {
  DayTargetsConfigStatus,
  DayTypeTemplate,
  EffectiveNutritionTarget,
  TargetSource,
  Weekday,
} from '../../../domain/day-targets';
import type { MacroGoals, MacroTotals, UserProfile } from '../../../types';

export type DayLogStatus = 'future' | 'no_log' | 'logged';

/** Meta efetiva enriquecida para consumo por Hoje/Semana (não muta o domínio base). */
export type ResolvedEffectiveNutritionTarget = EffectiveNutritionTarget & {
  configStatus: DayTargetsConfigStatus;
  /** Null quando flag OFF ou sem rótulo aplicável. */
  label: string | null;
};

export type SelectEffectiveNutritionTargetInput = {
  profile: Pick<UserProfile, 'dailyGoals'>;
  dayTypeTemplates: DayTypeTemplate[];
  weeklySchedule: import('../../../domain/day-targets').WeeklySchedule;
  dailyTargetOverrides: import('../../../domain/day-targets').DailyNutritionTarget[];
  dateISO: string;
  flagEnabled: boolean;
};

export type WeekDayComparison = {
  dateISO: string;
  weekday: Weekday;
  status: DayLogStatus;
  target: ResolvedEffectiveNutritionTarget;
  actual: MacroTotals | null;
  mealCount: number;
};

export type WeekNutritionComparison = {
  referenceDateISO: string;
  weekStartISO: string;
  weekEndISO: string;
  isPartialWeek: boolean;

  elapsedDays: number;
  consideredDays: number;
  daysWithLogs: number;
  daysWithoutLogs: number;
  futureDays: number;

  totalTargetCaloriesForElapsedDays: number;
  totalTargetCaloriesForLoggedDays: number;
  totalActualCaloriesForLoggedDays: number;

  averageTargetForLoggedDays: number | null;
  averageActualForLoggedDays: number | null;

  perDay: WeekDayComparison[];
};

export type WeekStatusSummaryLine = {
  id: string;
  message: string;
};

export type { DayTargetsConfigStatus, TargetSource, Weekday, MacroGoals };
