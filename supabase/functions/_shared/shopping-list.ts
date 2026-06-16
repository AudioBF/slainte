import { SchemaType } from 'npm:@google/generative-ai@0.24.1';
import { z } from 'npm:zod@4.4.3';

const MAX_RECIPES = 30;
const MAX_PLANNED_MEALS = 35;
const MAX_INGREDIENTS_PER_RECIPE = 40;

const WEEK_DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

const ingredientSchema = z.object({
  name: z.string().min(1).max(120),
  amount: z.string().min(1).max(80),
});

const recipeSchema = z.object({
  name: z.string().min(1).max(160),
  servings: z.number().positive().max(100),
  ingredients: z.array(ingredientSchema).max(MAX_INGREDIENTS_PER_RECIPE),
});

const plannedMealShoppingSchema = z.object({
  name: z.string().min(1).max(200),
  slot: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  dayIndex: z.number().min(0).max(6),
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

type ShoppingListRecipe = z.infer<typeof recipeSchema>;
type ShoppingPlannedMeal = z.infer<typeof plannedMealShoppingSchema>;

const shoppingListRequestSchema = z.object({
  recipes: z.array(recipeSchema).max(MAX_RECIPES).optional().default([]),
  plannedMeals: z.array(plannedMealShoppingSchema).max(MAX_PLANNED_MEALS).optional(),
});

export type GenerateShoppingListRequest = {
  recipes: ShoppingListRecipe[];
  plannedMeals?: ShoppingPlannedMeal[];
};

type ValidationResult =
  | { ok: true; value: GenerateShoppingListRequest }
  | { ok: false; error: string };

export function validateShoppingListRequest(body: unknown): ValidationResult {
  const parsed = shoppingListRequestSchema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, error: 'Invalid request body.' };
  }

  const recipes = parsed.data.recipes ?? [];
  const plannedMeals = parsed.data.plannedMeals ?? [];

  if (recipes.length === 0 && plannedMeals.length === 0) {
    return { ok: false, error: 'Provide recipes or plannedMeals.' };
  }

  return { ok: true, value: { recipes, plannedMeals: plannedMeals.length ? plannedMeals : undefined } };
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

const SLOT_LABELS: Record<ShoppingPlannedMeal['slot'], string> = {
  breakfast: 'Café da manhã',
  lunch: 'Almoço',
  dinner: 'Jantar',
  snack: 'Lanche',
};

export function buildShoppingListFromPlannedMealsPrompt(plannedMeals: ShoppingPlannedMeal[]): string {
  const mealSummary = plannedMeals
    .map(
      (meal) =>
        `- ${WEEK_DAYS[meal.dayIndex] ?? `Dia ${meal.dayIndex}`} · ${SLOT_LABELS[meal.slot]}: ${meal.name}`,
    )
    .join('\n');

  return `You are a shopping list assistant for Sláinte (Dublin, Ireland).

Infer practical ingredients for this weekly meal plan and consolidate into one shopping list.

Planned meals:
${mealSummary}

Rules:
- Infer ingredients from meal names (protein, sides, vegetables, grains)
- Merge duplicate ingredients and sum quantities for the full week
- Use simple item names in Brazilian Portuguese
- Quantities should be practical for Irish supermarkets (kg, g, un, pacotes)
- Prefix approximate quantities with "aprox" (e.g. "aprox 1 kg")
- Do not include pantry staples assumed at home (salt, pepper, water) unless large amounts needed
- Ingredients should be findable at Lidl, Aldi, Tesco, Dunnes, SuperValu in Dublin

Respond only with valid JSON matching the schema.`;
}

export function buildShoppingListRequestPrompt(request: GenerateShoppingListRequest): string {
  if (request.recipes.length > 0) {
    return buildShoppingListPrompt(request.recipes);
  }
  return buildShoppingListFromPlannedMealsPrompt(request.plannedMeals ?? []);
}
