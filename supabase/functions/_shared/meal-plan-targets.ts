/**
 * Domínio multi-target para Edge (Deno).
 * Paridade com src/domain/meal-plan-targets — fixture MEAL_PLAN_TOLERANCE_FIXTURE.
 * Não importar de src/ (runtime Deno separado).
 */

export const SOFT_BAND_FACTOR = 1.25;

export function calorieToleranceKcal(targetCalories: number): number {
  return Math.max(150, Math.round(Math.abs(targetCalories) * 0.08));
}
export function proteinToleranceG(targetProtein: number): number {
  return Math.max(8, Math.round(Math.abs(targetProtein) * 0.1));
}
export function carbsToleranceG(targetCarbs: number): number {
  return Math.max(15, Math.round(Math.abs(targetCarbs) * 0.15));
}
export function fatToleranceG(targetFat: number): number {
  return Math.max(5, Math.round(Math.abs(targetFat) * 0.15));
}
export function softBand(tolerance: number): number {
  return Math.round(tolerance * SOFT_BAND_FACTOR);
}

/** Deve espelhar MEAL_PLAN_TOLERANCE_FIXTURE no app. */
export const MEAL_PLAN_TOLERANCE_FIXTURE = {
  softBandFactor: SOFT_BAND_FACTOR,
  examples: {
    calories_3350: calorieToleranceKcal(3350),
    protein_160: proteinToleranceG(160),
    carbs_475: carbsToleranceG(475),
    fat_90: fatToleranceG(90),
  },
} as const;

export type MacroGoals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type MealPlanDayTarget = {
  dayIndex: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  dateISO?: string;
  dailyGoals: MacroGoals;
  source: string;
  templateId?: string | null;
  dayTypeCode?: string | null;
  label?: string | null;
};

export type NormalizedMealPlanJob = {
  contractVersion: 1 | 2;
  goal: 'lose' | 'maintain' | 'gain';
  restrictions: string;
  fallbackDailyGoals: MacroGoals;
  targetsByDayIndex: MacroGoals[];
  metaByDayIndex: MealPlanDayTarget[];
  usedFallbackDays: number[];
};

const REQUIRED = ['breakfast', 'lunch', 'dinner'] as const;

export function validateMealPlanAgainstDailyTargets(input: {
  plannedMeals: Array<{
    dayIndex: number;
    slot: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }>;
  dailyTargets: MealPlanDayTarget[];
}) {
  const perDay = [];
  const invalidDays: number[] = [];
  const warnings: string[] = [];
  const byDay = new Map(input.dailyTargets.map((t) => [t.dayIndex, t]));

  for (let day = 0; day < 7; day++) {
    const targetEntry = byDay.get(day as 0 | 1 | 2 | 3 | 4 | 5 | 6);
    const target = targetEntry?.dailyGoals ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };
    const dayMeals = input.plannedMeals.filter((m) => m.dayIndex === day);
    const slots = [...new Set(dayMeals.map((m) => m.slot))];
    const actual = dayMeals.reduce(
      (a, m) => ({
        calories: a.calories + m.calories,
        protein: a.protein + m.protein,
        carbs: a.carbs + m.carbs,
        fat: a.fat + m.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );
    const reasons: string[] = [];
    let status: 'ok' | 'soft' | 'hard' = 'ok';

    if (!targetEntry) {
      reasons.push(`Sem target dayIndex ${day}`);
      status = 'hard';
    }
    for (const slot of REQUIRED) {
      if (!slots.includes(slot)) {
        reasons.push(`Slot ausente: ${slot}`);
        status = 'hard';
      }
    }
    if (dayMeals.length === 0) {
      reasons.push('Dia vazio');
      status = 'hard';
    }

    const tols = {
      calories: calorieToleranceKcal(target.calories),
      protein: proteinToleranceG(target.protein),
      carbs: carbsToleranceG(target.carbs),
      fat: fatToleranceG(target.fat),
    };
    const diffs = {
      calories: Math.round(actual.calories - target.calories),
      protein: Math.round(actual.protein - target.protein),
      carbs: Math.round(actual.carbs - target.carbs),
      fat: Math.round(actual.fat - target.fat),
    };
    for (const key of ['calories', 'protein', 'carbs', 'fat'] as const) {
      const abs = Math.abs(diffs[key]);
      const tol = tols[key];
      if (abs > softBand(tol)) {
        reasons.push(`${key} hard`);
        status = 'hard';
      } else if (abs > tol) {
        reasons.push(`${key} soft`);
        if (status === 'ok') status = 'soft';
      }
    }
    if (status === 'hard') invalidDays.push(day);
    if (status === 'soft') warnings.push(`day ${day} soft`);
    perDay.push({ dayIndex: day, status, reasons, target, actual: diffs });
  }

  const hardCount = invalidDays.length;
  return {
    valid: hardCount === 0,
    perDay,
    invalidDays,
    warnings,
    severity: hardCount > 0 ? 'hard' : warnings.length ? 'soft' : 'ok',
    shouldRetry: hardCount > 3,
    shouldRepair: hardCount >= 1 && hardCount <= 3,
    shouldReject: false,
  };
}

export function decideMealPlanCorrection(
  macro: { shouldRetry: boolean; shouldRepair: boolean; valid: boolean; invalidDays: number[] },
  varietyOk: boolean,
): 'accept' | 'repair_batch' | 'retry_full' | 'reject' {
  if (!varietyOk || macro.shouldRetry) return 'retry_full';
  if (macro.shouldRepair) return 'repair_batch';
  if (macro.valid) return 'accept';
  return 'reject';
}

export const WEEK_DAY_LABELS_PT = [
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
  'Domingo',
] as const;
