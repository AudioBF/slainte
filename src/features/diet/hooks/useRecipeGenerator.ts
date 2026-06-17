import { useCallback, useState } from 'react';
import { generateRecipeForMeal } from '../../../services/ai/generate-recipe';
import { toAiUserMessage } from '../../../services/ai/errors';
import { useAppStore } from '../../../store/useAppStore';
import type { PlannedMeal } from '../../../types';

export function useRecipeGenerator() {
  const profile = useAppStore((s) => s.profile);
  const upsertRecipe = useAppStore((s) => s.upsertRecipe);
  const linkPlannedMealRecipe = useAppStore((s) => s.linkPlannedMealRecipe);
  const [loadingMealId, setLoadingMealId] = useState<string | null>(null);
  const [errorMealId, setErrorMealId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateForMeal = useCallback(
    async (meal: PlannedMeal) => {
      setLoadingMealId(meal.id);
      setErrorMealId(null);
      setError(null);
      try {
        const recipe = await generateRecipeForMeal(profile, meal);
        upsertRecipe(recipe);
        linkPlannedMealRecipe(meal.id, recipe.id);
        return recipe;
      } catch (e) {
        const message = toAiUserMessage(e);
        setErrorMealId(meal.id);
        setError(message);
        throw e;
      } finally {
        setLoadingMealId(null);
      }
    },
    [linkPlannedMealRecipe, profile, upsertRecipe],
  );

  return { generateForMeal, loadingMealId, errorMealId, error };
}
