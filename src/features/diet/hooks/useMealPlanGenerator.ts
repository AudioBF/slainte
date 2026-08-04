import { useCallback, useState } from 'react';
import { generateMealPlan } from '../../../services/ai';
import { toMealPlanUserMessage } from '../../../services/ai/errors';
import { MULTI_TARGET_REQUIRES_EDGE_MESSAGE } from '../../../services/ai/generate-meal-plan';
import { useAppStore } from '../../../store/useAppStore';

export function useMealPlanGenerator() {
  const updateProfile = useAppStore((s) => s.updateProfile);
  const setMealPlan = useAppStore((s) => s.setMealPlan);
  const profile = useAppStore((s) => s.profile);
  const dayTypeTemplates = useAppStore((s) => s.dayTypeTemplates);
  const weeklySchedule = useAppStore((s) => s.weeklySchedule);
  const dailyTargetOverrides = useAppStore((s) => s.dailyTargetOverrides);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (restrictions?: string) => {
      setLoading(true);
      setError(null);
      try {
        const input = restrictions !== undefined ? { ...profile, restrictions } : profile;
        if (restrictions !== undefined) {
          updateProfile({ restrictions });
        }
        const result = await generateMealPlan(input, {
          dayTypeTemplates,
          weeklySchedule,
          dailyTargetOverrides,
        });
        setMealPlan(
          result.plannedMeals,
          result.recipes,
          result.summary,
          result.generationMeta,
        );
        return result;
      } catch (e) {
        const message =
          e instanceof Error && e.message === MULTI_TARGET_REQUIRES_EDGE_MESSAGE
            ? MULTI_TARGET_REQUIRES_EDGE_MESSAGE
            : toMealPlanUserMessage(e);
        setError(message);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [
      profile,
      setMealPlan,
      updateProfile,
      dayTypeTemplates,
      weeklySchedule,
      dailyTargetOverrides,
    ],
  );

  return { generate, loading, error };
}
