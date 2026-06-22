import { mockShopping } from '../../data/mock';
import { createId } from '../../lib/id';
import { env } from '../../lib/env';
import type { MealSlot, PlannedMeal, Recipe, ShoppingItem } from '../../types';
import { invokeGenerateShoppingList } from './edge-client';
import { shoppingListSchema, type ShoppingListResult } from './schemas/shopping-list.schema';

/** Matches Edge `generate-shopping-list` request schema. */
const MAX_SHOPPING_PLANNED_MEALS = 35;
const MAX_SHOPPING_MEAL_NAME = 200;
const SHOPPING_SLOTS: readonly MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];

function toShoppingPlannedMeals(
  plannedMeals: PlannedMeal[],
): Array<{ name: string; slot: MealSlot; dayIndex: number }> {
  return plannedMeals
    .map(({ name, slot, dayIndex }) => ({
      name: String(name ?? '').trim().slice(0, MAX_SHOPPING_MEAL_NAME),
      slot,
      dayIndex: typeof dayIndex === 'number' ? dayIndex : Number(dayIndex),
    }))
    .filter(
      (meal) =>
        meal.name.length > 0 &&
        SHOPPING_SLOTS.includes(meal.slot) &&
        Number.isInteger(meal.dayIndex) &&
        meal.dayIndex >= 0 &&
        meal.dayIndex <= 6,
    )
    .slice(0, MAX_SHOPPING_PLANNED_MEALS);
}

function mockShoppingList(): ShoppingListResult {
  return {
    items: mockShopping.map(({ name, quantity }) => ({ name, quantity })),
  };
}

export function mapShoppingListToItems(result: ShoppingListResult): ShoppingItem[] {
  return result.items.map((item) => ({
    id: createId('shop'),
    name: item.name,
    quantity: item.quantity,
    checked: false,
    fromPlan: true,
  }));
}

export type GenerateShoppingListInput = {
  recipes: Recipe[];
  plannedMeals: PlannedMeal[];
};

export async function generateShoppingList(
  input: GenerateShoppingListInput,
): Promise<ShoppingListResult> {
  if (env.aiMock) {
    await new Promise((r) => setTimeout(r, 800));
    return mockShoppingList();
  }

  const { recipes, plannedMeals } = input;
  const shoppingPlannedMeals = toShoppingPlannedMeals(plannedMeals);

  if (shoppingPlannedMeals.length > 0) {
    const raw = await invokeGenerateShoppingList({ plannedMeals: shoppingPlannedMeals });
    return shoppingListSchema.parse(raw);
  }

  if (recipes.length > 0) {
    const raw = await invokeGenerateShoppingList({
      recipes: recipes.map(({ name, servings, ingredients }) => ({
        name,
        servings,
        ingredients,
      })),
    });
    return shoppingListSchema.parse(raw);
  }

  return { items: [] };
}
