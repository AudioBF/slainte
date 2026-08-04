import type { DayTypeCode, TargetSource, Weekday } from '../day-targets';
import type { MacroGoals } from '../../types';

export type MealPlanContractVersion = 1 | 2;

export type MealPlanDayTarget = {
  dayIndex: Weekday;
  dateISO?: string;
  dailyGoals: MacroGoals;
  source: TargetSource;
  templateId?: string | null;
  dayTypeCode?: DayTypeCode | null;
  label?: string | null;
};

export type MealPlanGenerationRequestV1 = {
  profile: {
    goal: 'lose' | 'maintain' | 'gain';
    restrictions: string;
    dailyGoals: MacroGoals;
  };
};

export type MealPlanGenerationRequestV2 = {
  contractVersion: 2;
  profile: {
    goal: 'lose' | 'maintain' | 'gain';
    restrictions: string;
  };
  fallbackDailyGoals: MacroGoals;
  dailyTargets: MealPlanDayTarget[];
};

export type MealPlanGenerationRequest =
  | MealPlanGenerationRequestV1
  | MealPlanGenerationRequestV2;

export type BuildWeeklyMealPlanTargetsResult =
  | {
      ok: true;
      contractVersion: MealPlanContractVersion;
      fallbackDailyGoals: MacroGoals;
      normalizedTargets: MealPlanDayTarget[];
      usedFallbackDays: Weekday[];
      warnings: string[];
      errors: [];
      /** V1 payload profile.dailyGoals (resolved). */
      v1DailyGoals: MacroGoals;
    }
  | {
      ok: false;
      contractVersion: MealPlanContractVersion | null;
      fallbackDailyGoals: MacroGoals | null;
      normalizedTargets: null;
      usedFallbackDays: Weekday[];
      warnings: string[];
      errors: string[];
      v1DailyGoals: null;
    };

export type DayMacroValidationStatus = 'ok' | 'soft' | 'hard';

export type DayMacroValidation = {
  dayIndex: Weekday;
  target: MacroGoals;
  actual: MacroGoals;
  caloriesDifference: number;
  proteinDifference: number;
  carbsDifference: number;
  fatDifference: number;
  mealCount: number;
  slotsPresent: Array<'breakfast' | 'lunch' | 'dinner' | 'snack'>;
  status: DayMacroValidationStatus;
  reasons: string[];
};

export type MealPlanAgainstTargetsResult = {
  valid: boolean;
  perDay: DayMacroValidation[];
  invalidDays: Weekday[];
  warnings: string[];
  severity: 'ok' | 'soft' | 'hard';
  shouldRetry: boolean;
  shouldRepair: boolean;
  shouldReject: boolean;
};

export type MealPlanGenerationMetaPerDay = {
  dayIndex: Weekday;
  dateISO?: string;
  dailyGoals: MacroGoals;
  source: TargetSource;
  templateId?: string | null;
  dayTypeCode?: DayTypeCode | null;
  label?: string | null;
  validationStatus?: 'ok' | 'soft' | 'repaired' | 'hard';
};

export type MealPlanGenerationMeta = {
  contractVersion: MealPlanContractVersion;
  generatedAt: string;
  referenceWeekStartISO?: string;
  fallbackDailyGoals: MacroGoals;
  perDay: MealPlanGenerationMetaPerDay[];
  validationStatus?: 'ok' | 'soft' | 'repaired' | 'rejected';
  repairedDays?: Weekday[];
  usedFallbackDays?: Weekday[];
};

export const WEEK_DAY_LABELS_PT = [
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
  'Domingo',
] as const;

export const REQUIRED_MEAL_SLOTS = ['breakfast', 'lunch', 'dinner'] as const;
