import { SchemaType } from 'npm:@google/generative-ai@0.24.1';
import { z } from 'npm:zod@4.4.3';

const GOAL_LABELS = {
  lose: 'emagrecimento (déficit calórico moderado)',
  maintain: 'manutenção de peso',
  gain: 'hipertrofia (superávit calórico moderado)',
};

const SLOT_LABELS = {
  breakfast: 'Café da manhã',
  lunch: 'Almoço',
  dinner: 'Jantar',
  snack: 'Lanche',
};

function roundMacro(value: number): number {
  return Math.round(Number(value) || 0);
}

const macroInt = z.number().transform(roundMacro);

const macroGoalsSchema = z.object({
  calories: z.number().nonnegative(),
  protein: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  fat: z.number().nonnegative(),
});

const userProfileSchema = z.object({
  goal: z.enum(['lose', 'maintain', 'gain']),
  restrictions: z.string().max(2000),
  dailyGoals: macroGoalsSchema,
});

const plannedMealInputSchema = z.object({
  id: z.string(),
  name: z.string(),
  slot: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  dayIndex: z.number().min(0).max(6),
  calories: z.number().nonnegative(),
  protein: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  fat: z.number().nonnegative(),
});

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

export type UserProfile = z.infer<typeof userProfileSchema>;
export type PlannedMealInput = z.infer<typeof plannedMealInputSchema>;
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

const generateRecipeRequestSchema = z.object({
  profile: userProfileSchema,
  plannedMeal: plannedMealInputSchema,
});

export type GenerateRecipeRequest = z.infer<typeof generateRecipeRequestSchema>;

type ValidationResult =
  | { ok: true; value: GenerateRecipeRequest }
  | { ok: false; error: string };

export function validateGenerateRecipeRequest(body: unknown): ValidationResult {
  const parsed = generateRecipeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, error: 'Invalid request body.' };
  }
  return { ok: true, value: parsed.data };
}

export function buildRecipePrompt(profile: UserProfile, meal: PlannedMealInput): string {
  return `Você é um nutricionista prático criando uma receita para moradores de Dublin, Irlanda.

## Perfil
- Objetivo: ${GOAL_LABELS[profile.goal]}
- Restrições: ${profile.restrictions || 'nenhuma informada'}

## Refeição planejada
- Nome: ${meal.name}
- Momento: ${SLOT_LABELS[meal.slot]}
- Macros da refeição (referência): ${meal.calories} kcal · P ${meal.protein}g · C ${meal.carbs}g · G ${meal.fat}g

## Regras
1. Receita em português brasileiro, passos curtos e numerados (mínimo 3)
2. Ingredientes práticos para Lidl, Aldi, Tesco, Dunnes, SuperValu
3. Quantidades realistas com unidades (g, kg, un, colheres)
4. Macros por porção coerentes com a refeição planejada (±15%)
5. servings: 1 para refeição individual, ou 2–4 se meal-prep fizer sentido
6. Respeite restrições alimentares rigorosamente
7. Sugestão automática — não substitui orientação médica

Responda APENAS com JSON válido no schema solicitado.`;
}
