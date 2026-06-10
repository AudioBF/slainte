import { SchemaType } from '@google/generative-ai';
import { z } from 'zod';

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
  caloriesPerServing: z.number().nonnegative(),
  proteinPerServing: z.number().nonnegative(),
  carbsPerServing: z.number().nonnegative(),
  fatPerServing: z.number().nonnegative(),
});

const plannedMealSchema = z.object({
  id: z.string(),
  dayIndex: z.number().min(0).max(6),
  slot: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  time: z.string(),
  name: z.string(),
  recipeId: z.string().optional(),
  calories: z.number().nonnegative(),
  protein: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  fat: z.number().nonnegative(),
});

export const mealPlanSchema = z.object({
  recipes: z.array(recipeSchema),
  plannedMeals: z.array(plannedMealSchema),
  summary: z.string().optional(),
});

export type MealPlanResult = z.infer<typeof mealPlanSchema>;

export const mealPlanResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    recipes: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          id: { type: SchemaType.STRING },
          name: { type: SchemaType.STRING },
          servings: { type: SchemaType.NUMBER },
          ingredients: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                name: { type: SchemaType.STRING },
                amount: { type: SchemaType.STRING },
              },
              required: ['name', 'amount'],
            },
          },
          steps: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          caloriesPerServing: { type: SchemaType.NUMBER },
          proteinPerServing: { type: SchemaType.NUMBER },
          carbsPerServing: { type: SchemaType.NUMBER },
          fatPerServing: { type: SchemaType.NUMBER },
        },
        required: [
          'id',
          'name',
          'servings',
          'ingredients',
          'steps',
          'caloriesPerServing',
          'proteinPerServing',
          'carbsPerServing',
          'fatPerServing',
        ],
      },
    },
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
          recipeId: { type: SchemaType.STRING },
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
  required: ['recipes', 'plannedMeals'],
};
