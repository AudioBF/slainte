import {
  KCAL_PER_G_CARBS,
  KCAL_PER_G_FAT,
  KCAL_PER_G_PROTEIN,
  type CaloriesFromMacrosResult,
  type MacroGramsInput,
} from './nutritionTargetTypes';

function toFiniteNumber(value: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Calcula calorias pela fórmula Atwater (determinístico).
 * Interno: decimal; exibição: inteiro via Math.round.
 */
export function calculateCaloriesFromMacros(
  input: MacroGramsInput,
): CaloriesFromMacrosResult {
  const proteinGrams = toFiniteNumber(input.proteinGrams);
  const carbsGrams = toFiniteNumber(input.carbsGrams);
  const fatGrams = toFiniteNumber(input.fatGrams);

  const exactCalories =
    proteinGrams * KCAL_PER_G_PROTEIN +
    carbsGrams * KCAL_PER_G_CARBS +
    fatGrams * KCAL_PER_G_FAT;

  return {
    exactCalories,
    roundedCalories: Math.round(exactCalories),
    proteinGrams,
    carbsGrams,
    fatGrams,
  };
}
