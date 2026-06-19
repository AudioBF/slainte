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

const SLOT_RULES = {
  breakfast: 'café da manhã rápido, pouca louça e sem forno longo',
  lunch: 'almoço completo, alto em proteína, com proteína + base + vegetal simples',
  dinner: 'jantar leve, confortável, poucos passos e sem preparo pesado',
  snack: 'lanche de montagem simples, de preferência sem fogão',
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

## Fonte da verdade
- A refeição planejada acima é a fonte da verdade.
- Respeite o nome/card da refeição. Não transforme em outro prato.
- Mantenha a proteína principal, a base e o estilo quando estiverem claros no nome.
- O resultado deve ser algo que uma pessoa com rotina corrida em Dublin consiga cozinhar e comer durante a semana.

## Qualidade esperada
- Português do Brasil, tom direto, caseiro e prático.
- Ingredientes comuns em Dublin, fáceis de achar em Lidl, Tesco, Aldi ou Dunnes.
- Não gourmetizar. Evite ingredientes caros, raros, técnicas avançadas e marinadas longas.
- Evite ingredientes muito brasileiros ou difíceis de achar na Irlanda, como tapioca, requeijão e leite condensado.
- Evite ervas frescas raras, farinhas especiais, molhos importados e protein powder como base da receita.
- Prefira proteínas simples: frango, peru, carne moída magra, ovos, atum em lata, salmão simples, sardinha, iogurte natural/grego, queijo simples, grão-de-bico, lentilha ou tofu básico.
- Prefira carboidratos simples: arroz, batata, batata doce, pão integral, wrap/tortilla, aveia, massa seca, quinoa ou granola simples.
- Use vegetais/frutas comuns: espinafre, brócolis, cenoura, abobrinha, tomate, alface, pepino, banana, maçã ou frutas vermelhas congeladas.
- Despensa básica permitida: azeite, óleo, sal, pimenta, alho, cebola, passata/tomate triturado, milho, ervilhas congeladas, pasta de amendoim e húmus.

## Regras do slot
- Para este slot: ${SLOT_RULES[meal.slot]}.

## Formato e execução
- Retorne exatamente o schema solicitado, sem campos extras.
- servings deve ser 1 por padrão.
- Use 2 porções apenas se o nome do card indicar claramente meal-prep, marmita, lote ou sobra planejada.
- Idealmente use no máximo 8 ingredientes.
- ingredients deve ter quantidades com unidade: g, ml, unidade, fatia, colher de sopa ou colher de chá.
- Evite "a gosto" sem uma quantidade padrão. Óleo/azeite sempre precisa de quantidade.
- steps deve ter entre 4 e 7 itens.
- Cada step deve ser uma ação clara, curta e executável.
- Não coloque numeração dentro do texto dos steps; a UI já numera.
- Respeite restrições alimentares rigorosamente.
- Sugestão automática; não substitui orientação médica.

## Macros
- Macros são estimativas, mas precisam ser plausíveis com os ingredientes listados.
- caloriesPerServing deve tentar ficar dentro de ±10% de ${meal.calories} kcal.
- proteinPerServing deve tentar ficar dentro de ±10% de ${meal.protein}g.
- Se o objetivo for hipertrofia, proteinPerServing nunca deve ficar abaixo de ${Math.round(meal.protein * 0.85)}g.
- carbsPerServing deve tentar ficar dentro de ±15% de ${meal.carbs}g.
- fatPerServing deve tentar ficar dentro de ±15% de ${meal.fat}g.
- Use números inteiros.

Responda APENAS com JSON válido no schema solicitado.`;
}
