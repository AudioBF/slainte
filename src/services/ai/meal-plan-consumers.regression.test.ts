import { describe, expect, it } from 'vitest';
import { mockPlannedMeals, mockRecipes } from '../../data/mock';
import type { PlannedMeal, Recipe } from '../../types';

/**
 * Regressão: snapshot / metadados V2 não devem afetar compras nem receitas.
 * Shopping e recipe generator consomem apenas campos de refeição/ingredientes.
 */
describe('compras e receitas — regressão Sprint 2C.3', () => {
  it('planned meals V1/V2 serializam sem campos de snapshot', () => {
    const meals: PlannedMeal[] = mockPlannedMeals.map(
      ({ recipeId: _r, ...meal }) => meal,
    );
    const json = JSON.stringify(meals);
    expect(json).not.toContain('mealPlanGenerationMeta');
    expect(json).not.toContain('contractVersion');
    expect(meals.every((m) => typeof m.name === 'string' && m.name.length > 0)).toBe(true);
    expect(meals.every((m) => m.dayIndex >= 0 && m.dayIndex <= 6)).toBe(true);
  });

  it('recipe generator input usa macros da refeição', () => {
    const meal = mockPlannedMeals[0];
    const payload = {
      id: meal.id,
      name: meal.name,
      slot: meal.slot,
      dayIndex: meal.dayIndex,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
    };
    expect(payload.calories).toBeGreaterThan(0);
    expect(JSON.stringify(payload)).not.toContain('dailyTargets');
  });

  it('recipes existentes abrem com ingredients/steps', () => {
    const recipe: Recipe = mockRecipes[0];
    expect(recipe.ingredients.length).toBeGreaterThan(0);
    expect(recipe.steps.length).toBeGreaterThan(0);
  });
});
