import { SchemaType } from 'npm:@google/generative-ai@0.24.1';
import { z } from 'npm:zod@4.4.3';

const GOAL_LABELS = {
  lose: 'emagrecimento (déficit calórico moderado)',
  maintain: 'manutenção de peso',
  gain: 'hipertrofia (superávit calórico moderado)',
};

const WEEK_DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

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

export const mealPlanSchema = z.object({
  recipes: z.array(recipeSchema).optional(),
  plannedMeals: z.array(plannedMealSchema),
  summary: z.string().optional(),
});

export type UserProfile = z.infer<typeof userProfileSchema>;
export type MealPlanResult = {
  recipes: [];
  plannedMeals: Omit<z.infer<typeof plannedMealSchema>, 'recipeId'>[];
  summary?: string;
};

export function normalizeLightweightMealPlan(
  input: z.infer<typeof mealPlanSchema>,
): MealPlanResult {
  return {
    recipes: [],
    summary: input.summary,
    plannedMeals: input.plannedMeals.map(({ recipeId: _recipeId, ...meal }) => meal),
  };
}

export function parseMealPlanResult(raw: unknown): MealPlanResult {
  const parsed = mealPlanSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid meal plan: ${parsed.error.issues[0]?.message ?? 'schema'}`);
  }
  return normalizeLightweightMealPlan(parsed.data);
}

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

const generateMealPlanRequestSchema = z.object({
  profile: userProfileSchema,
});

export type GenerateMealPlanRequest = {
  profile: UserProfile;
};

type ValidationResult =
  | { ok: true; value: GenerateMealPlanRequest }
  | { ok: false; error: string };

export function validateMealPlanRequest(body: unknown): ValidationResult {
  const parsed = generateMealPlanRequestSchema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, error: 'Invalid request body.' };
  }

  return { ok: true, value: parsed.data };
}

export function buildMealPlanPrompt(profile: UserProfile): string {
  return `Você é um nutricionista prático que monta cardápios semanais para moradores de Dublin, Irlanda.
Escreva como um humano — nomes apetitosos, rotação inteligente, nada de planilha robótica.

## Perfil
- Objetivo: ${GOAL_LABELS[profile.goal]}
- Meta diária: ${profile.dailyGoals.calories} kcal · P ${profile.dailyGoals.protein}g · C ${profile.dailyGoals.carbs}g · G ${profile.dailyGoals.fat}g
- Restrições: ${profile.restrictions || 'nenhuma informada'}

## Formato da resposta (IMPORTANTE)
- Retorne APENAS plannedMeals + summary.
- NÃO inclua array recipes.
- NÃO inclua recipeId nas refeições.

## O que é meal-prep (IMPORTANTE)
Meal-prep NÃO é comer o MESMO prato 7 dias seguidos.
É variar proteínas e acompanhamentos ao longo da semana, reutilizando preparos quando fizer sentido.

Exemplo correto:
- Seg almoço: bowl de frango · Ter almoço: salada com atum · Qua almoço: bowl de frango (sobra) · Qui almoço: wrap de peru
- Proteínas diferentes ao longo da semana: frango, peixe, peru, ovos, leguminosas
- Acompanhar variando: arroz, batata, quinoa, massa integral, salada crua

Exemplo ERRADO (nunca faça):
- Seg-Dom: exatamente "Bowl de frango e arroz" em todo almoço e jantar

## Regras obrigatórias
1. 7 dias completos (dayIndex 0=Segunda … 6=Domingo), cada um com café, almoço e jantar
2. Mínimo 3 cafés diferentes, 4 almoços diferentes, 4 jantares diferentes na semana
3. No máximo 2 dias com cardápio 100% idêntico (sobras de prep)
4. Nomes descritivos o bastante para compras: inclua proteína + base + preparo (ex: "Bowl de frango grelhado, arroz integral e brócolis")
5. Ingredientes encontrados em Lidl, Aldi, Tesco, Dunnes, SuperValu
6. Horários realistas (HH:MM, 24h)
7. Macros por refeição coerentes com a meta diária (soma diária ~meta)
8. Textos em português brasileiro natural — evite nomes genéricos como "Refeição 1"
9. Campo "summary": 2–3 frases humanas explicando a lógica da semana
10. Respeite restrições alimentares rigorosamente
11. Sugestão automática — não substitui orientação médica

## Estrutura sugerida (adapte ao perfil)
${WEEK_DAYS.map((day, i) => `- ${day} (dayIndex ${i}): varie proteína e acompanhamento`).join('\n')}

Responda APENAS com JSON válido no schema solicitado.`;
}

export function buildMealPlanRetryPrompt(profile: UserProfile, issues: string[]): string {
  return `${buildMealPlanPrompt(profile)}

## CORREÇÃO NECESSÁRIA
Seu plano anterior foi REJEITADO por falta de variedade:
${issues.map((issue) => `- ${issue}`).join('\n')}

Gere um plano NOVO corrigindo todos os pontos. Priorize variedade real — o usuário percebe repetição imediatamente.`;
}

type MealPlanValidation = {
  ok: boolean;
  issues: string[];
};

function mealsForDay(plannedMeals: MealPlanResult['plannedMeals'], dayIndex: number) {
  return plannedMeals.filter((meal) => meal.dayIndex === dayIndex);
}

function daySignature(plannedMeals: MealPlanResult['plannedMeals'], dayIndex: number): string {
  return mealsForDay(plannedMeals, dayIndex)
    .sort((a, b) => a.slot.localeCompare(b.slot))
    .map((meal) => `${meal.slot}:${meal.name.trim().toLowerCase()}`)
    .join('|');
}

function uniqueNamesForSlot(
  plannedMeals: MealPlanResult['plannedMeals'],
  slot: MealPlanResult['plannedMeals'][number]['slot'],
): number {
  return new Set(
    plannedMeals.filter((meal) => meal.slot === slot).map((meal) => meal.name.trim().toLowerCase()),
  ).size;
}

export function validateMealPlanVariety(plan: MealPlanResult): MealPlanValidation {
  const issues: string[] = [];

  const signatures = new Map<string, number>();
  for (let day = 0; day < 7; day++) {
    const signature = daySignature(plan.plannedMeals, day);
    if (!signature) {
      issues.push(`Dia ${day} está vazio — inclua café, almoço e jantar.`);
      continue;
    }
    signatures.set(signature, (signatures.get(signature) ?? 0) + 1);
  }

  const maxIdenticalDays = Math.max(0, ...signatures.values());
  if (maxIdenticalDays >= 3) {
    issues.push(
      `Cardápio repetido demais: ${maxIdenticalDays} dias idênticos. Máximo permitido: 2 dias iguais (sobras de meal-prep).`,
    );
  }

  const breakfastCount = uniqueNamesForSlot(plan.plannedMeals, 'breakfast');
  const lunchCount = uniqueNamesForSlot(plan.plannedMeals, 'lunch');
  const dinnerCount = uniqueNamesForSlot(plan.plannedMeals, 'dinner');

  if (breakfastCount < 3) {
    issues.push(`Café da manhã: apenas ${breakfastCount} opções distintas (mínimo 3).`);
  }
  if (lunchCount < 4) {
    issues.push(`Almoço: apenas ${lunchCount} pratos distintos (mínimo 4).`);
  }
  if (dinnerCount < 4) {
    issues.push(`Jantar: apenas ${dinnerCount} pratos distintos (mínimo 4).`);
  }

  const daysWithMeals = new Set(plan.plannedMeals.map((meal) => meal.dayIndex));
  if (daysWithMeals.size < 7) {
    issues.push(`Faltam dias no plano: apenas ${daysWithMeals.size} de 7.`);
  }

  return { ok: issues.length === 0, issues };
}
