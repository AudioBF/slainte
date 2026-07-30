/**
 * Política de arredondamento (única para o domínio):
 * - Cálculos internos podem usar decimais.
 * - Valores exibidos / persistidos usam inteiros.
 * - Carboidrato calculado: arredondado para o grama mais próximo (Math.round).
 * - Após arredondar macros, a diferença final vs meta é recalculada.
 * - Tolerância padrão: 5 kcal (cobre residual típico de arredondamento Atwater com gramas inteiros).
 */

export const KCAL_PER_G_PROTEIN = 4;
export const KCAL_PER_G_CARBS = 4;
export const KCAL_PER_G_FAT = 9;

/** Tolerância padrão entre meta calórica e soma Atwater dos macros. */
export const DEFAULT_TOLERANCE_KCAL = 5;

export type MacroGramsInput = {
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
};

export type DailyMacroGoalsInput = {
  targetCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
};

export type ConsistencyStatus =
  | 'consistent'
  | 'inconsistent'
  | 'invalid_input'
  | 'impossible_target';

export type CaloriesFromMacrosResult = {
  /** Soma Atwater sem arredondar. */
  exactCalories: number;
  /** Inteiro para exibição / comparação com metas persistidas. */
  roundedCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
};

export type CarbsForCalorieTargetResult = {
  targetCalories: number;
  proteinGrams: number;
  fatGrams: number;
  /** Carboidrato bruto (pode ser negativo se a meta for impossível). */
  exactCarbsGrams: number;
  /** Carboidrato arredondado para o grama mais próximo; null se impossível. */
  roundedCarbsGrams: number | null;
  /** Calorias Atwater após aplicar roundedCarbsGrams (quando possível). */
  resultingCalories: number | null;
  /** Diferença resultingCalories - targetCalories (quando possível). */
  differenceKcal: number | null;
  isPossible: boolean;
  status: ConsistencyStatus;
  message: string;
};

export type MacroCalorieConsistencyResult = {
  calculatedCalories: number;
  targetCalories: number;
  differenceKcal: number;
  absoluteDifferenceKcal: number;
  isConsistent: boolean;
  toleranceKcal: number;
  status: ConsistencyStatus;
  message: string;
};

export type MacroGoalsLike = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};
