import { calculateCaloriesFromMacros } from './calculateCaloriesFromMacros';
import {
  DEFAULT_TOLERANCE_KCAL,
  type DailyMacroGoalsInput,
  type MacroCalorieConsistencyResult,
} from './nutritionTargetTypes';

function toFiniteNumber(value: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

export type ValidateMacroCalorieConsistencyInput = DailyMacroGoalsInput & {
  toleranceKcal?: number;
};

/**
 * Compara meta calórica com a soma Atwater dos macros.
 * Retorno estruturado — não usar apenas boolean.
 */
export function validateMacroCalorieConsistency(
  input: ValidateMacroCalorieConsistencyInput,
): MacroCalorieConsistencyResult {
  const toleranceKcal = toFiniteNumber(input.toleranceKcal ?? DEFAULT_TOLERANCE_KCAL);
  const targetCalories = toFiniteNumber(input.targetCalories);
  const proteinGrams = toFiniteNumber(input.proteinGrams);
  const carbsGrams = toFiniteNumber(input.carbsGrams);
  const fatGrams = toFiniteNumber(input.fatGrams);

  if (
    !Number.isFinite(toleranceKcal) ||
    toleranceKcal < 0 ||
    !Number.isFinite(targetCalories) ||
    !Number.isFinite(proteinGrams) ||
    !Number.isFinite(carbsGrams) ||
    !Number.isFinite(fatGrams) ||
    targetCalories < 0 ||
    proteinGrams < 0 ||
    carbsGrams < 0 ||
    fatGrams < 0
  ) {
    return {
      calculatedCalories: Number.NaN,
      targetCalories,
      differenceKcal: Number.NaN,
      absoluteDifferenceKcal: Number.NaN,
      isConsistent: false,
      toleranceKcal: Number.isFinite(toleranceKcal) ? toleranceKcal : DEFAULT_TOLERANCE_KCAL,
      status: 'invalid_input',
      message: 'Valores de meta ou macros inválidos.',
    };
  }

  const { roundedCalories } = calculateCaloriesFromMacros({
    proteinGrams,
    carbsGrams,
    fatGrams,
  });

  const roundedTarget = Math.round(targetCalories);
  const differenceKcal = roundedCalories - roundedTarget;
  const absoluteDifferenceKcal = Math.abs(differenceKcal);
  const isConsistent = absoluteDifferenceKcal <= toleranceKcal;

  return {
    calculatedCalories: roundedCalories,
    targetCalories: roundedTarget,
    differenceKcal,
    absoluteDifferenceKcal,
    isConsistent,
    toleranceKcal,
    status: isConsistent ? 'consistent' : 'inconsistent',
    message: isConsistent
      ? 'Calorias e macronutrientes estão consistentes.'
      : 'As calorias não correspondem aos macronutrientes informados.',
  };
}
