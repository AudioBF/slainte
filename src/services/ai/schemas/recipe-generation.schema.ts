import { SchemaType } from '@google/generative-ai';
import { z } from 'zod';
import { roundMacro } from '../../../lib/macros';

const macroInt = z.number().transform(roundMacro);

const ingredientSchema = z.object({
  name: z.string(),
  amount: z.string(),
});

export const recipeGenerationSchema = z.object({
  name: z.string(),
  servings: z.number().positive(),
  ingredients: z.array(ingredientSchema).min(1),
  steps: z.array(z.string()).min(1),
  caloriesPerServing: macroInt.pipe(z.number().nonnegative()),
  proteinPerServing: macroInt.pipe(z.number().nonnegative()),
  carbsPerServing: macroInt.pipe(z.number().nonnegative()),
  fatPerServing: macroInt.pipe(z.number().nonnegative()),
});

export type RecipeGenerationResult = z.infer<typeof recipeGenerationSchema>;

export const recipeGenerationResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
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
    'name',
    'servings',
    'ingredients',
    'steps',
    'caloriesPerServing',
    'proteinPerServing',
    'carbsPerServing',
    'fatPerServing',
  ],
};
