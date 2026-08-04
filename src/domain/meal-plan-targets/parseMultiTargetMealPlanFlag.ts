/**
 * Parse explícito de EXPO_PUBLIC_USE_MULTI_TARGET_MEAL_PLAN.
 * Só a string exata "true" liga. Default OFF.
 */
export function parseMultiTargetMealPlanFlag(
  value: string | undefined | null,
): boolean {
  if (value == null || value === '') return false;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return false;
}

/**
 * Multi-target efetivo exige DAY_TARGETS e MULTI_TARGET ambos ON.
 */
export function isMultiTargetMealPlanEnabled(
  dayTargetsEnabled: boolean,
  multiTargetEnabled: boolean,
): boolean {
  return dayTargetsEnabled === true && multiTargetEnabled === true;
}
