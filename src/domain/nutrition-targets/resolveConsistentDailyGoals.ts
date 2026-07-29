import { calculateCarbsForCalorieTarget } from './calculateCarbsForCalorieTarget';
import {
  DEFAULT_TOLERANCE_KCAL,
  type MacroGoalsLike,
} from './nutritionTargetTypes';
import { validateMacroCalorieConsistency } from './validateMacroCalorieConsistency';

export type ResolveConsistentDailyGoalsSuccess = {
  ok: true;
  goals: MacroGoalsLike;
  wasAdjusted: boolean;
  reason: 'already_consistent' | 'carbs_recalculated';
};

export type ResolveConsistentDailyGoalsFailure = {
  ok: false;
  goals: null;
  wasAdjusted: false;
  reason: 'unresolvable' | 'invalid_input';
  message: string;
};

export type ResolveConsistentDailyGoalsResult =
  | ResolveConsistentDailyGoalsSuccess
  | ResolveConsistentDailyGoalsFailure;

/**
 * Fonte de verdade para o gerador de cardápio (proteção interna, independente da flag):
 * - calorias, proteína e gordura do perfil;
 * - carboidratos do perfil se já consistentes;
 * - senão, carboidratos recalculados só para o payload (sem mutar o input/store).
 *
 * Meta impossível → ok:false (não inventa carbs negativos nem reenvia inconsistente).
 */
export function resolveConsistentDailyGoals(
  goals: MacroGoalsLike,
  toleranceKcal: number = DEFAULT_TOLERANCE_KCAL,
): ResolveConsistentDailyGoalsResult {
  const consistency = validateMacroCalorieConsistency({
    targetCalories: goals.calories,
    proteinGrams: goals.protein,
    carbsGrams: goals.carbs,
    fatGrams: goals.fat,
    toleranceKcal,
  });

  if (consistency.status === 'invalid_input') {
    return {
      ok: false,
      goals: null,
      wasAdjusted: false,
      reason: 'invalid_input',
      message: consistency.message,
    };
  }

  if (consistency.isConsistent) {
    return {
      ok: true,
      goals: {
        calories: Math.round(goals.calories),
        protein: Math.round(goals.protein),
        carbs: Math.round(goals.carbs),
        fat: Math.round(goals.fat),
      },
      wasAdjusted: false,
      reason: 'already_consistent',
    };
  }

  const carbsResult = calculateCarbsForCalorieTarget({
    targetCalories: goals.calories,
    proteinGrams: goals.protein,
    fatGrams: goals.fat,
  });

  if (
    !carbsResult.isPossible ||
    carbsResult.roundedCarbsGrams === null ||
    carbsResult.roundedCarbsGrams < 0
  ) {
    return {
      ok: false,
      goals: null,
      wasAdjusted: false,
      reason: carbsResult.status === 'invalid_input' ? 'invalid_input' : 'unresolvable',
      message:
        carbsResult.message ||
        'Não foi possível alinhar os macronutrientes à meta calórica. Ajuste proteína, gordura ou calorias no perfil.',
    };
  }

  return {
    ok: true,
    goals: {
      calories: Math.round(goals.calories),
      protein: Math.round(goals.protein),
      carbs: carbsResult.roundedCarbsGrams,
      fat: Math.round(goals.fat),
    },
    wasAdjusted: true,
    reason: 'carbs_recalculated',
  };
}
