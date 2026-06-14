import { mockShopping } from '../../data/mock';
import { createId } from '../../lib/id';
import { env } from '../../lib/env';
import type { Recipe, ShoppingItem } from '../../types';
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

export async function generateShoppingList(recipes: Recipe[]): Promise<ShoppingListResult> {
  if (env.aiMock) {
    await new Promise((r) => setTimeout(r, 800));
    return mockShoppingList();
  }

  if (recipes.length === 0) {
    return { items: [] };
  }

  const raw = await invokeGenerateShoppingList({ recipes });

  return shoppingListSchema.parse(raw);
}
