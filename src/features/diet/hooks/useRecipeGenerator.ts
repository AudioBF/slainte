import { useCallback, useRef, useState } from 'react';
import { generateRecipeForMeal } from '../../../services/ai/generate-recipe';
import { toRecipeUserMessage } from '../../../services/ai/errors';
import { useAppStore } from '../../../store/useAppStore';
import type { PlannedMeal, Recipe } from '../../../types';

export type GenerateRecipeResult =
  | { success: true; recipe: Recipe }
  | { success: false; error: string; mealId: string };

export function useRecipeGenerator() {
  const profile = useAppStore((s) => s.profile);
  const saveGeneratedRecipe = useAppStore((s) => s.saveGeneratedRecipe);
  const inFlightMealIdRef = useRef<string | null>(null);
  const [loadingMealId, setLoadingMealId] = useState<string | null>(null);
  const [errorMealId, setErrorMealId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateForMeal = useCallback(
    async (meal: PlannedMeal): Promise<GenerateRecipeResult> => {
      if (inFlightMealIdRef.current !== null) {
        return { success: false, error: '', mealId: meal.id };
      }

      inFlightMealIdRef.current = meal.id;
      setLoadingMealId(meal.id);
      setErrorMealId(null);
      setError(null);

      try {
        const recipe = await generateRecipeForMeal(profile, meal);
        saveGeneratedRecipe(meal.id, recipe);
        return { success: true, recipe };
      } catch (e) {
        const message = toRecipeUserMessage(e);
        setErrorMealId(meal.id);
        setError(message);
        return { success: false, error: message, mealId: meal.id };
      } finally {
        inFlightMealIdRef.current = null;
        setLoadingMealId(null);
      }
    },
    [profile, saveGeneratedRecipe],
  );

  const isRecipeLoading = loadingMealId !== null;

  return {
    generateForMeal,
    loadingMealId,
    isRecipeLoading,
    errorMealId,
    error,
  };
}
