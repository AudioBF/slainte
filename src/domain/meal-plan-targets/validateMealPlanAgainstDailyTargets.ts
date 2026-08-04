import type { Weekday } from '../day-targets';
import type { MacroGoals } from '../../types';
import {
  softBand,
  tolerancesForGoals,
} from './mealPlanTolerances';
import type {
  DayMacroValidation,
  DayMacroValidationStatus,
  MealPlanAgainstTargetsResult,
  MealPlanDayTarget,
} from './types';
import { REQUIRED_MEAL_SLOTS } from './types';

export type PlannedMealLike = {
  dayIndex: number;
  slot: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

function sumDay(meals: PlannedMealLike[]): MacroGoals {
  return meals.reduce(
    (acc, m) => ({
      calories: acc.calories + (m.calories || 0),
      protein: acc.protein + (m.protein || 0),
      carbs: acc.carbs + (m.carbs || 0),
      fat: acc.fat + (m.fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

function classifyDiff(
  absDiff: number,
  hardTol: number,
): DayMacroValidationStatus {
  if (absDiff <= hardTol) return 'ok';
  if (absDiff <= softBand(hardTol)) return 'soft';
  return 'hard';
}

function worst(
  a: DayMacroValidationStatus,
  b: DayMacroValidationStatus,
): DayMacroValidationStatus {
  const rank = { ok: 0, soft: 1, hard: 2 } as const;
  return rank[a] >= rank[b] ? a : b;
}

/**
 * Valida macros do plano contra targets diários.
 * Slots obrigatórios: breakfast, lunch, dinner. Snack opcional.
 */
export function validateMealPlanAgainstDailyTargets(input: {
  plannedMeals: PlannedMealLike[];
  dailyTargets: MealPlanDayTarget[];
}): MealPlanAgainstTargetsResult {
  const perDay: DayMacroValidation[] = [];
  const warnings: string[] = [];
  const invalidDays: Weekday[] = [];

  const targetsByDay = new Map(
    input.dailyTargets.map((t) => [t.dayIndex as number, t] as const),
  );

  for (let day = 0; day < 7; day++) {
    const targetEntry = targetsByDay.get(day);
    const target = targetEntry?.dailyGoals ?? {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    };
    const dayMeals = input.plannedMeals.filter((m) => m.dayIndex === day);
    const slotsPresent = [
      ...new Set(dayMeals.map((m) => m.slot)),
    ] as DayMacroValidation['slotsPresent'];
    const actual = sumDay(dayMeals);
    const reasons: string[] = [];
    let status: DayMacroValidationStatus = 'ok';

    if (!targetEntry) {
      reasons.push(`Sem target para dayIndex ${day}.`);
      status = 'hard';
    }

    for (const slot of REQUIRED_MEAL_SLOTS) {
      if (!slotsPresent.includes(slot)) {
        reasons.push(`Slot obrigatório ausente: ${slot}.`);
        status = 'hard';
      }
    }

    if (dayMeals.length === 0) {
      reasons.push('Dia sem refeições.');
      status = 'hard';
    }

    const tols = tolerancesForGoals(target);
    const diffs = {
      calories: Math.round(actual.calories - target.calories),
      protein: Math.round(actual.protein - target.protein),
      carbs: Math.round(actual.carbs - target.carbs),
      fat: Math.round(actual.fat - target.fat),
    };

    const checks: Array<[keyof typeof diffs, number]> = [
      ['calories', tols.calories],
      ['protein', tols.protein],
      ['carbs', tols.carbs],
      ['fat', tols.fat],
    ];

    for (const [key, tol] of checks) {
      const abs = Math.abs(diffs[key]);
      const level = classifyDiff(abs, tol);
      if (level !== 'ok') {
        reasons.push(
          `${key}: Δ ${diffs[key]} (tol ${tol}${level === 'soft' ? ', soft' : ''}).`,
        );
        status = worst(status, level);
      }
    }

    if (status === 'soft') {
      warnings.push(`dayIndex ${day}: desvio soft — ${reasons.join(' ')}`);
    }
    if (status === 'hard') {
      invalidDays.push(day as Weekday);
    }

    perDay.push({
      dayIndex: day as Weekday,
      target: { ...target },
      actual: {
        calories: Math.round(actual.calories),
        protein: Math.round(actual.protein),
        carbs: Math.round(actual.carbs),
        fat: Math.round(actual.fat),
      },
      caloriesDifference: diffs.calories,
      proteinDifference: diffs.protein,
      carbsDifference: diffs.carbs,
      fatDifference: diffs.fat,
      mealCount: dayMeals.length,
      slotsPresent,
      status,
      reasons,
    });
  }

  const hardCount = perDay.filter((d) => d.status === 'hard').length;
  const softCount = perDay.filter((d) => d.status === 'soft').length;
  const severity: MealPlanAgainstTargetsResult['severity'] =
    hardCount > 0 ? 'hard' : softCount > 0 ? 'soft' : 'ok';

  const shouldRetry = hardCount > 3;
  const shouldRepair = hardCount >= 1 && hardCount <= 3;
  const shouldReject = false; // caller decides after correction attempt

  return {
    valid: hardCount === 0,
    perDay,
    invalidDays,
    warnings,
    severity,
    shouldRetry,
    shouldRepair,
    shouldReject,
  };
}

/**
 * Política de correção: no máximo uma ação (reparo em lote OU retry integral).
 */
export function decideMealPlanCorrection(
  macro: MealPlanAgainstTargetsResult,
  varietyOk: boolean,
): 'accept' | 'repair_batch' | 'retry_full' | 'reject' {
  // Variedade forte ou >3 dias hard → uma regeneração integral.
  if (!varietyOk || macro.shouldRetry) return 'retry_full';
  // 1–3 dias hard → um único reparo em lote (nunca ambos em sequência).
  if (macro.shouldRepair) return 'repair_batch';
  if (macro.valid) return 'accept';
  return 'reject';
}
