import type { MacroGoals } from '../../types';

/** Calorias: max(150 kcal, 8% da meta). */
export function calorieToleranceKcal(targetCalories: number): number {
  return Math.max(150, Math.round(Math.abs(targetCalories) * 0.08));
}

/** Proteína: max(8 g, 10% da meta). */
export function proteinToleranceG(targetProtein: number): number {
  return Math.max(8, Math.round(Math.abs(targetProtein) * 0.1));
}

/** Carboidratos: max(15 g, 15% da meta). */
export function carbsToleranceG(targetCarbs: number): number {
  return Math.max(15, Math.round(Math.abs(targetCarbs) * 0.15));
}

/** Gordura: max(5 g, 15% da meta). */
export function fatToleranceG(targetFat: number): number {
  return Math.max(5, Math.round(Math.abs(targetFat) * 0.15));
}

/** Banda soft = 1,25 × tolerância principal. */
export const SOFT_BAND_FACTOR = 1.25;

export function softBand(tolerance: number): number {
  return Math.round(tolerance * SOFT_BAND_FACTOR);
}

export function tolerancesForGoals(goals: MacroGoals) {
  return {
    calories: calorieToleranceKcal(goals.calories),
    protein: proteinToleranceG(goals.protein),
    carbs: carbsToleranceG(goals.carbs),
    fat: fatToleranceG(goals.fat),
  };
}

/** Fixture de paridade app/Edge — valores estáveis para testes. */
export const MEAL_PLAN_TOLERANCE_FIXTURE = {
  softBandFactor: SOFT_BAND_FACTOR,
  examples: {
    calories_3350: calorieToleranceKcal(3350), // 268
    protein_160: proteinToleranceG(160), // 16
    carbs_475: carbsToleranceG(475), // 71
    fat_90: fatToleranceG(90), // 14
  },
} as const;
