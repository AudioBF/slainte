export { analyzeMealPhoto, mapAnalysisToComponents } from './analyze-meal-photo';
export type { AnalyzeMealPhotoInput } from './analyze-meal-photo';

export { generateMealPlan } from './generate-meal-plan';
export type { MealPlanResult } from './schemas/meal-plan.schema';

export { generateRecipeForMeal } from './generate-recipe';
export type { RecipeGenerationResult } from './schemas/recipe-generation.schema';

export {
  generateShoppingList,
  mapShoppingListToItems,
} from './generate-shopping-list';
export type { ShoppingListResult } from './schemas/shopping-list.schema';

export type { MealAnalysisResult } from './schemas/meal-analysis.schema';

export { isAiAvailable, getModelForTask } from './config';
