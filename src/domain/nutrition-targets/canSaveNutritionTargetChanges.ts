import {
  DEFAULT_TOLERANCE_KCAL,
  type MacroGoalsLike,
} from './nutritionTargetTypes';
import { validateMacroCalorieConsistency } from './validateMacroCalorieConsistency';

function normalizeMacroNumber(value: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : Number.NaN;
}

/** Compara metas nutricionais (kcal + macros) sem depender do store. */
export function hasNutritionGoalsChanged(
  baseline: MacroGoalsLike,
  current: MacroGoalsLike,
): boolean {
  return (
    normalizeMacroNumber(baseline.calories) !== normalizeMacroNumber(current.calories) ||
    normalizeMacroNumber(baseline.protein) !== normalizeMacroNumber(current.protein) ||
    normalizeMacroNumber(baseline.carbs) !== normalizeMacroNumber(current.carbs) ||
    normalizeMacroNumber(baseline.fat) !== normalizeMacroNumber(current.fat)
  );
}

export type NutritionSaveDecision = {
  /** Se o botão Salvar pode persistir (considerando a flag). */
  canSave: boolean;
  /** Há alteração em calorias/macros vs baseline da sessão. */
  nutritionChanged: boolean;
  /** Metas atuais passam na tolerância Atwater. */
  isConsistent: boolean;
  /** Flag de bloqueio ativa. */
  enforceConsistency: boolean;
  /** Motivo estruturado para UI/testes. */
  reason:
    | 'allowed_flag_off'
    | 'allowed_unchanged_legacy'
    | 'allowed_consistent'
    | 'blocked_inconsistent_edit';
  consistency: ReturnType<typeof validateMacroCalorieConsistency>;
};

/**
 * Gate de save do Perfil.
 * - Flag OFF: sempre permite (compatível com comportamento anterior).
 * - Flag ON + macros não alterados: permite (legado inconsistente ok para nome/foto/prefs).
 * - Flag ON + macros alterados: exige consistência Atwater.
 */
export function canSaveNutritionTargetChanges(input: {
  baselineGoals: MacroGoalsLike;
  currentGoals: MacroGoalsLike;
  enforceConsistency: boolean;
  toleranceKcal?: number;
}): NutritionSaveDecision {
  const consistency = validateMacroCalorieConsistency({
    targetCalories: input.currentGoals.calories,
    proteinGrams: input.currentGoals.protein,
    carbsGrams: input.currentGoals.carbs,
    fatGrams: input.currentGoals.fat,
    toleranceKcal: input.toleranceKcal ?? DEFAULT_TOLERANCE_KCAL,
  });

  const nutritionChanged = hasNutritionGoalsChanged(
    input.baselineGoals,
    input.currentGoals,
  );

  if (!input.enforceConsistency) {
    return {
      canSave: true,
      nutritionChanged,
      isConsistent: consistency.isConsistent,
      enforceConsistency: false,
      reason: 'allowed_flag_off',
      consistency,
    };
  }

  if (!nutritionChanged) {
    return {
      canSave: true,
      nutritionChanged: false,
      isConsistent: consistency.isConsistent,
      enforceConsistency: true,
      reason: 'allowed_unchanged_legacy',
      consistency,
    };
  }

  if (consistency.isConsistent) {
    return {
      canSave: true,
      nutritionChanged: true,
      isConsistent: true,
      enforceConsistency: true,
      reason: 'allowed_consistent',
      consistency,
    };
  }

  return {
    canSave: false,
    nutritionChanged: true,
    isConsistent: false,
    enforceConsistency: true,
    reason: 'blocked_inconsistent_edit',
    consistency,
  };
}

/** @deprecated Prefer canSaveNutritionTargetChanges — mantido para checagens pontuais. */
export function canPersistDailyGoals(
  goals: MacroGoalsLike,
  toleranceKcal: number = DEFAULT_TOLERANCE_KCAL,
): ReturnType<typeof validateMacroCalorieConsistency> {
  return validateMacroCalorieConsistency({
    targetCalories: goals.calories,
    proteinGrams: goals.protein,
    carbsGrams: goals.carbs,
    fatGrams: goals.fat,
    toleranceKcal,
  });
}
