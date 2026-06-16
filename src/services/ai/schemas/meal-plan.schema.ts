import { SchemaType } from '@google/generative-ai';
import { z } from 'zod';
import { roundMacro } from '../../../lib/macros';

const macroInt = z.number().transform(roundMacro);

const ingredientSchema = z.object({
  name: z.string(),
  amount: z.string(),
});

const recipeSchema = z.object({
  id: z.string(),
  name: z.string(),
  servings: z.number().positive(),
  ingredients: z.array(ingredientSchema),
  steps: z.array(z.string()),
  caloriesPerServing: macroInt.pipe(z.number().nonnegative()),
  proteinPerServing: macroInt.pipe(z.number().nonnegative()),
  carbsPerServing: macroInt.pipe(z.number().nonnegative()),
  fatPerServing: macroInt.pipe(z.number().nonnegative()),
});

const plannedMealSchema = z.object({
  id: z.string(),
  dayIndex: z.number().min(0).max(6),
  slot: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  time: z.string(),
  name: z.string(),
  recipeId: z.string().optional(),
  calories: macroInt.pipe(z.number().nonnegative()),
  protein: macroInt.pipe(z.number().nonnegative()),
  carbs: macroInt.pipe(z.number().nonnegative()),
  fat: macroInt.pipe(z.number().nonnegative()),
});

const mealPlanInputSchema = z.object({
  recipes: z.array(recipeSchema).optional(),
  plannedMeals: z.array(plannedMealSchema),
  summary: z.string().optional(),
});

export function normalizeLightweightMealPlan(
  input: z.infer<typeof mealPlanInputSchema>,
): {
  recipes: [];
  plannedMeals: Omit<z.infer<typeof plannedMealSchema>, 'recipeId'>[];
  summary?: string;
} {
  return {
    recipes: [],
    summary: input.summary,
    plannedMeals: input.plannedMeals.map(({ recipeId: _recipeId, ...meal }) => meal),
  };
}

export const mealPlanSchema = mealPlanInputSchema.transform(normalizeLightweightMealPlan);

export type MealPlanResult = z.infer<typeof mealPlanSchema>;

/** Gemini structured output — planned meals only (no recipes). */
export const mealPlanResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    plannedMeals: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          id: { type: SchemaType.STRING },
          dayIndex: { type: SchemaType.NUMBER },
          slot: { type: SchemaType.STRING, enum: ['breakfast', 'lunch', 'dinner', 'snack'] },
          time: { type: SchemaType.STRING },
          name: { type: SchemaType.STRING },
          calories: { type: SchemaType.NUMBER },
          protein: { type: SchemaType.NUMBER },
          carbs: { type: SchemaType.NUMBER },
          fat: { type: SchemaType.NUMBER },
        },
        required: ['id', 'dayIndex', 'slot', 'time', 'name', 'calories', 'protein', 'carbs', 'fat'],
      },
    },
    summary: { type: SchemaType.STRING },
  },
  required: ['plannedMeals'],
};
