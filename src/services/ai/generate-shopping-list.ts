import { mockShopping } from '../../data/mock';
import { createId } from '../../lib/id';
import { env, hasGeminiKey } from '../../lib/env';
import type { Recipe, ShoppingItem } from '../../types';
import { generateStructuredJson } from './client';
import { buildShoppingListPrompt } from './prompts/shopping-list.prompt';
import {
  shoppingListResponseSchema,
  shoppingListSchema,
  type ShoppingListResult,
} from './schemas/shopping-list.schema';

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
  if (env.aiMock || !hasGeminiKey()) {
    await new Promise((r) => setTimeout(r, 800));
    return mockShoppingList();
  }

  if (recipes.length === 0) {
    return { items: [] };
  }

  const raw = await generateStructuredJson<unknown>({
    task: 'shoppingList',
    prompt: buildShoppingListPrompt(recipes),
    responseSchema: shoppingListResponseSchema,
  });

  return shoppingListSchema.parse(raw);
}
