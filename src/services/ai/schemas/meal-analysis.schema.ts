import { SchemaType } from '@google/generative-ai';
import { z } from 'zod';
import { roundMacro, roundMealComponent } from '../../../lib/macros';

const macroInt = z.number().transform(roundMacro);

export const mealComponentSchema = z.object({
  name: z.string(),
  weightGrams: macroInt.pipe(z.number().positive()),
  calories: macroInt.pipe(z.number().nonnegative()),
  protein: macroInt.pipe(z.number().nonnegative()),
  carbs: macroInt.pipe(z.number().nonnegative()),
  fat: macroInt.pipe(z.number().nonnegative()),
});

export const mealAnalysisSchema = z.object({
  mealName: z.string(),
  components: z.array(mealComponentSchema).min(1),
  confidence: z.enum(['high', 'medium', 'low']).optional(),
  notes: z.string().optional(),
}).transform((data) => ({
  ...data,
  components: data.components.map(roundMealComponent),
}));

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
