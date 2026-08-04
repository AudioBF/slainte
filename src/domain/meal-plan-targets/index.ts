export {
  parseMultiTargetMealPlanFlag,
  isMultiTargetMealPlanEnabled,
} from './parseMultiTargetMealPlanFlag';
export {
  calorieToleranceKcal,
  proteinToleranceG,
  carbsToleranceG,
  fatToleranceG,
  softBand,
  tolerancesForGoals,
  MEAL_PLAN_TOLERANCE_FIXTURE,
  SOFT_BAND_FACTOR,
} from './mealPlanTolerances';
export {
  validateWeeklyMealPlanTargets,
  cloneMealPlanDayTarget,
  isFiniteNonNegativeMacroGoals,
} from './validateWeeklyMealPlanTargets';
export {
  buildWeeklyMealPlanTargets,
  toV2Request,
  type BuildWeeklyMealPlanTargetsInput,
} from './buildWeeklyMealPlanTargets';
export {
  validateMealPlanAgainstDailyTargets,
  decideMealPlanCorrection,
  type PlannedMealLike,
} from './validateMealPlanAgainstDailyTargets';
export {
  buildMealPlanGenerationMeta,
  normalizeMealPlanGenerationMeta,
} from './mealPlanGenerationMeta';
export type {
  MealPlanContractVersion,
  MealPlanDayTarget,
  MealPlanGenerationRequestV1,
  MealPlanGenerationRequestV2,
  MealPlanGenerationRequest,
  BuildWeeklyMealPlanTargetsResult,
  DayMacroValidationStatus,
  DayMacroValidation,
  MealPlanAgainstTargetsResult,
  MealPlanGenerationMeta,
  MealPlanGenerationMetaPerDay,
} from './types';
export { WEEK_DAY_LABELS_PT, REQUIRED_MEAL_SLOTS } from './types';
