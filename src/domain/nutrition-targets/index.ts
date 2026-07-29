export {
  KCAL_PER_G_PROTEIN,
  KCAL_PER_G_CARBS,
  KCAL_PER_G_FAT,
  DEFAULT_TOLERANCE_KCAL,
} from './nutritionTargetTypes';
export type {
  MacroGramsInput,
  DailyMacroGoalsInput,
  ConsistencyStatus,
  CaloriesFromMacrosResult,
  CarbsForCalorieTargetResult,
  MacroCalorieConsistencyResult,
  MacroGoalsLike,
} from './nutritionTargetTypes';

export { calculateCaloriesFromMacros } from './calculateCaloriesFromMacros';
export {
  calculateCarbsForCalorieTarget,
  type CalculateCarbsForCalorieTargetInput,
} from './calculateCarbsForCalorieTarget';
export {
  validateMacroCalorieConsistency,
  type ValidateMacroCalorieConsistencyInput,
} from './validateMacroCalorieConsistency';
export {
  resolveConsistentDailyGoals,
  type ResolveConsistentDailyGoalsResult,
  type ResolveConsistentDailyGoalsSuccess,
  type ResolveConsistentDailyGoalsFailure,
} from './resolveConsistentDailyGoals';
export {
  hasNutritionGoalsChanged,
  canSaveNutritionTargetChanges,
  canPersistDailyGoals,
  type NutritionSaveDecision,
} from './canSaveNutritionTargetChanges';
export {
  resolveGoalChangePatch,
  type GoalChangeDecision,
  type GoalChangePatch,
} from './resolveGoalChangePatch';
