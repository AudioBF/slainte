import { SchemaType } from 'npm:@google/generative-ai@0.24.1';
import { z } from 'npm:zod@4.4.3';

const MAX_RECIPES = 30;
const MAX_INGREDIENTS_PER_RECIPE = 40;

const ingredientSchema = z.object({
  name: z.string().min(1).max(120),
  amount: z.string().min(1).max(80),
});

const recipeSchema = z.object({
  name: z.string().min(1).max(160),
  servings: z.number().positive().max(100),
  ingredients: z.array(ingredientSchema).max(MAX_INGREDIENTS_PER_RECIPE),
});

export const shoppingListSchema = z.object({
  items: z.array(
    z.object({
      name: z.string(),
      quantity: z.string(),
    }),
  ),
});

export type ShoppingListResult = z.infer<typeof shoppingListSchema>;

export const shoppingListResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    items: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          quantity: { type: SchemaType.STRING },
        },
        required: ['name', 'quantity'],
      },
    },
  },
  required: ['items'],
};

const shoppingListRequestSchema = z.object({
  recipes: z.array(recipeSchema).max(MAX_RECIPES),
});

type ShoppingListRecipe = z.infer<typeof recipeSchema>;

export type GenerateShoppingListRequest = {
  recipes: ShoppingListRecipe[];
};

type ValidationResult =
  | { ok: true; value: GenerateShoppingListRequest }
  | { ok: false; error: string };

export function validateShoppingListRequest(body: unknown): ValidationResult {
  const parsed = shoppingListRequestSchema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, error: 'Invalid request body.' };
  }

  return { ok: true, value: parsed.data };
}

export function buildShoppingListPrompt(recipes: ShoppingListRecipe[]): string {
  const recipeSummary = recipes
    .map(
      (recipe) =>
        `- ${recipe.name} (${recipe.servings} porções): ${
          recipe.ingredients.map((ingredient) => `${ingredient.name} ${ingredient.amount}`).join(', ')
        }`,
    )
    .join('\n');

  return `You are a shopping list assistant for Sláinte (Dublin, Ireland).

Consolidate these recipes into one practical shopping list for the week.

Recipes:
${recipeSummary}

Rules:
- Merge duplicate ingredients and sum quantities
- Use simple item names in Brazilian Portuguese
- Quantities should be practical for Irish supermarkets (kg, g, un, pacotes)
- Prefix approximate quantities with "aprox" (e.g. "aprox 1 kg")
- Do not include pantry staples assumed at home (salt, pepper, water) unless large amounts needed

Respond only with valid JSON matching the schema.`;
}
