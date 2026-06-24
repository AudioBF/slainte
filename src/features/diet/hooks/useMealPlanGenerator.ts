import { useCallback, useState } from 'react';
import { generateMealPlan } from '../../../services/ai';
import { toMealPlanUserMessage } from '../../../services/ai/errors';
import { useAppStore } from '../../../store/useAppStore';

export function useMealPlanGenerator() {
  const updateProfile = useAppStore((s) => s.updateProfile);
  const setMealPlan = useAppStore((s) => s.setMealPlan);
  const profile = useAppStore((s) => s.profile);
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
        const result = await generateMealPlan(input);
        setMealPlan(result.plannedMeals, result.recipes, result.summary);
        return result;
      } catch (e) {
        const message = toMealPlanUserMessage(e);
        setError(message);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [profile, setMealPlan, updateProfile],
  );

  return { generate, loading, error };
}
