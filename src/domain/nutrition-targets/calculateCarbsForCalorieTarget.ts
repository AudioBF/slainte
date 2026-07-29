import { calculateCaloriesFromMacros } from './calculateCaloriesFromMacros';
import {
  KCAL_PER_G_CARBS,
  KCAL_PER_G_FAT,
  KCAL_PER_G_PROTEIN,
  type CarbsForCalorieTargetResult,
} from './nutritionTargetTypes';

function toFiniteNumber(value: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

export type CalculateCarbsForCalorieTargetInput = {
  targetCalories: number;
  proteinGrams: number;
  fatGrams: number;
};

/**
 * Resolve carboidratos restantes para fechar a meta calórica,
 * mantendo proteína e gordura fixas.
 *
 * Arredondamento: grama mais próximo; depois recalcula a diferença final.
 * Não mascara resultado negativo — isPossible=false.
 */
export function calculateCarbsForCalorieTarget(
  input: CalculateCarbsForCalorieTargetInput,
): CarbsForCalorieTargetResult {
  const targetCalories = toFiniteNumber(input.targetCalories);
  const proteinGrams = toFiniteNumber(input.proteinGrams);
  const fatGrams = toFiniteNumber(input.fatGrams);

  if (
    !Number.isFinite(targetCalories) ||
    !Number.isFinite(proteinGrams) ||
    !Number.isFinite(fatGrams) ||
    targetCalories < 0 ||
    proteinGrams < 0 ||
    fatGrams < 0
  ) {
    return {
      targetCalories,
      proteinGrams,
      fatGrams,
      exactCarbsGrams: NaN,
      roundedCarbsGrams: null,
      resultingCalories: null,
      differenceKcal: null,
      isPossible: false,
      status: 'invalid_input',
      message: 'Informe calorias, proteína e gordura com valores numéricos não negativos.',
    };
  }

  const exactCarbsGrams =
    (targetCalories - proteinGrams * KCAL_PER_G_PROTEIN - fatGrams * KCAL_PER_G_FAT) /
    KCAL_PER_G_CARBS;

  if (exactCarbsGrams < 0) {
    return {
      targetCalories,
      proteinGrams,
      fatGrams,
      exactCarbsGrams,
      roundedCarbsGrams: null,
      resultingCalories: null,
      differenceKcal: null,
      isPossible: false,
      status: 'impossible_target',
      message:
        'A meta calórica é menor que as calorias da proteína e da gordura. Reduza proteína/gordura ou aumente as calorias.',
    };
  }

  const roundedCarbsGrams = Math.round(exactCarbsGrams);
  const resulting = calculateCaloriesFromMacros({
    proteinGrams,
    carbsGrams: roundedCarbsGrams,
    fatGrams,
  });
  const differenceKcal = resulting.roundedCalories - Math.round(targetCalories);

  return {
    targetCalories,
    proteinGrams,
    fatGrams,
    exactCarbsGrams,
    roundedCarbsGrams,
    resultingCalories: resulting.roundedCalories,
    differenceKcal,
    isPossible: true,
    status: 'consistent',
    message: 'Carboidratos calculados a partir da meta calórica.',
  };
}
