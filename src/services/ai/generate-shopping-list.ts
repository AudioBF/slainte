import { mockShopping } from '../../data/mock';
import { createId } from '../../lib/id';
import { env } from '../../lib/env';
import type { PlannedMeal, Recipe, ShoppingItem } from '../../types';
import { invokeGenerateShoppingList } from './edge-client';
import { shoppingListSchema, type ShoppingListResult } from './schemas/shopping-list.schema';

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

  if (plannedMeals.length === 0) {
    return { items: [] };
  }

  const raw = await invokeGenerateShoppingList({
    plannedMeals: plannedMeals.map(({ name, slot, dayIndex }) => ({
      name,
      slot,
      dayIndex,
    })),
  });

  return shoppingListSchema.parse(raw);
}
