import { mockRecipes } from '../../data/mock';
import { createId } from '../../lib/id';
import { env } from '../../lib/env';
import type { PlannedMeal, Recipe, UserProfile } from '../../types';
import { invokeGenerateRecipe } from './edge-client';
import {
  recipeGenerationSchema,
  type RecipeGenerationResult,
} from './schemas/recipe-generation.schema';

function mockRecipeForMeal(plannedMeal: PlannedMeal): Recipe {
  const base = mockRecipes[0];
  return {
    ...base,
    id: createId('recipe'),
    name: plannedMeal.name,
    caloriesPerServing: plannedMeal.calories,
    proteinPerServing: plannedMeal.protein,
    carbsPerServing: plannedMeal.carbs,
    fatPerServing: plannedMeal.fat,
  };
}

export async function generateRecipeForMeal(
  profile: UserProfile,
  plannedMeal: PlannedMeal,
): Promise<Recipe> {
  if (env.aiMock) {
    await new Promise((r) => setTimeout(r, 800));
    return mockRecipeForMeal(plannedMeal);
  }

  const raw = await invokeGenerateRecipe({
    profile,
    plannedMeal: {
      id: plannedMeal.id,
      name: plannedMeal.name,
      slot: plannedMeal.slot,
      dayIndex: plannedMeal.dayIndex,
      calories: plannedMeal.calories,
      protein: plannedMeal.protein,
      carbs: plannedMeal.carbs,
      fat: plannedMeal.fat,
    },
  });

  const parsed: RecipeGenerationResult = recipeGenerationSchema.parse(raw);
  return {
    id: createId('recipe'),
    ...parsed,
  };
}
