import type { ProfileGoal } from '../../features/profile/types';
import type { MacroGoalsLike } from './nutritionTargetTypes';

export type GoalChangeDecision = 'cancel' | 'keep_targets' | 'apply_defaults';

export type GoalChangePatch = {
  goal: ProfileGoal;
  dailyGoals?: MacroGoalsLike;
};

/**
 * Resultado explícito da confirmação na Dieta.
 * cancel → null (nada muda).
 */
export function resolveGoalChangePatch(
  nextGoal: ProfileGoal,
  decision: GoalChangeDecision,
  defaultsByGoal: Record<ProfileGoal, MacroGoalsLike>,
): GoalChangePatch | null {
  if (decision === 'cancel') return null;

  if (decision === 'keep_targets') {
    return { goal: nextGoal };
  }

  return {
    goal: nextGoal,
    dailyGoals: { ...defaultsByGoal[nextGoal] },
  };
}
