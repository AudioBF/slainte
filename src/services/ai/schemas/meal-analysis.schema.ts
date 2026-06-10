import { SchemaType } from '@google/generative-ai';
import { z } from 'zod';

export const mealComponentSchema = z.object({
  name: z.string(),
  weightGrams: z.number().positive(),
  calories: z.number().nonnegative(),
  protein: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  fat: z.number().nonnegative(),
});

export const mealAnalysisSchema = z.object({
  mealName: z.string(),
  components: z.array(mealComponentSchema).min(1),
  confidence: z.enum(['high', 'medium', 'low']).optional(),
  notes: z.string().optional(),
});

export type MealAnalysisResult = z.infer<typeof mealAnalysisSchema>;

export const mealAnalysisResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    mealName: { type: SchemaType.STRING },
    components: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          weightGrams: { type: SchemaType.NUMBER },
          calories: { type: SchemaType.NUMBER },
          protein: { type: SchemaType.NUMBER },
          carbs: { type: SchemaType.NUMBER },
          fat: { type: SchemaType.NUMBER },
        },
        required: ['name', 'weightGrams', 'calories', 'protein', 'carbs', 'fat'],
      },
    },
    confidence: { type: SchemaType.STRING, enum: ['high', 'medium', 'low'] },
    notes: { type: SchemaType.STRING },
  },
  required: ['mealName', 'components'],
};
