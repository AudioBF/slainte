import { SchemaType } from 'npm:@google/generative-ai@0.24.1';
import { z } from 'npm:zod@4.4.3';

const MAX_PHOTO_SIZE_BYTES = 4 * 1024 * 1024;
const SUPPORTED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const ANALYZE_MEAL_PROMPT = `You are a nutrition assistant for the Sláinte app (Dublin, Ireland).

Analyze the meal photo and decompose it into visible components (protein, sides, salad, sauces, etc.).

Rules:
- Return realistic portion estimates in grams for each component
- Estimate calories and macros (protein, carbs, fat in grams) per component
- Use common food names in Brazilian Portuguese
- Be conservative with oils, sauces, and hidden fats
- If uncertain, note it in "notes" and set confidence to "medium" or "low"
- All values are ESTIMATES for tracking trends, not medical advice

Respond only with valid JSON matching the schema.`;

function roundMacro(value: number): number {
  return Math.round(Number(value) || 0);
}

const macroInt = z.number().transform(roundMacro);

const mealComponentSchema = z.object({
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
  components: data.components.map((component) => ({
    ...component,
    weightGrams: roundMacro(component.weightGrams),
    calories: roundMacro(component.calories),
    protein: roundMacro(component.protein),
    carbs: roundMacro(component.carbs),
    fat: roundMacro(component.fat),
  })),
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

const analyzeMealRequestSchema = z.object({
  imageBase64: z.string().min(1),
  mimeType: z.string().min(1),
});

export type AnalyzeMealRequest = {
  imageBase64: string;
  mimeType: string;
};

type ValidationResult =
  | { ok: true; value: AnalyzeMealRequest }
  | { ok: false; error: string };

function stripDataUrl(value: string): string {
  const commaIndex = value.indexOf(',');
  return value.startsWith('data:') && commaIndex >= 0 ? value.slice(commaIndex + 1) : value;
}

function estimateBase64Bytes(value: string): number {
  const clean = stripDataUrl(value).replace(/\s/g, '');
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  return Math.floor((clean.length * 3) / 4) - padding;
}

export function validateAnalyzeMealRequest(body: unknown): ValidationResult {
  const parsed = analyzeMealRequestSchema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, error: 'Invalid request body.' };
  }

  const imageBase64 = stripDataUrl(parsed.data.imageBase64).replace(/\s/g, '');
  const mimeType = parsed.data.mimeType.toLowerCase();

  if (!SUPPORTED_MIME_TYPES.has(mimeType)) {
    return { ok: false, error: 'Unsupported image type. Use JPEG, PNG, or WebP.' };
  }

  if (estimateBase64Bytes(imageBase64) > MAX_PHOTO_SIZE_BYTES) {
    return { ok: false, error: 'Image is too large. Maximum size is 4 MB.' };
  }

  return { ok: true, value: { imageBase64, mimeType } };
}
