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
  generationMeta?: {
    contractVersion: 1 | 2;
    referenceWeekStartISO?: string;
    validationStatus: 'ok' | 'soft' | 'repaired' | 'rejected';
    repairedDays?: number[];
    usedFallbackDays?: number[];
  };
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

const mealPlanDayTargetSchema = z.object({
  dayIndex: z.number().int().min(0).max(6),
  dateISO: z.string().optional(),
  dailyGoals: macroGoalsSchema,
  source: z.enum(['date_override', 'weekly_schedule', 'profile_default', 'flag_off']),
  templateId: z.string().nullable().optional(),
  dayTypeCode: z.string().nullable().optional(),
  label: z.string().nullable().optional(),
});

const generateMealPlanRequestV2Schema = z.object({
  contractVersion: z.literal(2),
  profile: z.object({
    goal: z.enum(['lose', 'maintain', 'gain']),
    restrictions: z.string().max(2000),
  }),
  fallbackDailyGoals: macroGoalsSchema,
  dailyTargets: z.array(mealPlanDayTargetSchema).length(7),
});

export type GenerateMealPlanRequest = {
  profile: UserProfile;
};

export type GenerateMealPlanRequestV2 = z.infer<typeof generateMealPlanRequestV2Schema>;

export type NormalizedMealPlanRequest = {
  contractVersion: 1 | 2;
  profile: UserProfile;
  fallbackDailyGoals: z.infer<typeof macroGoalsSchema>;
  dailyTargets: z.infer<typeof mealPlanDayTargetSchema>[];
  usedFallbackDays: number[];
};

type ValidationResult =
  | { ok: true; value: NormalizedMealPlanRequest }
  | { ok: false; error: string };

function sortAndValidateTargets(
  targets: z.infer<typeof mealPlanDayTargetSchema>[],
): { ok: true; sorted: z.infer<typeof mealPlanDayTargetSchema>[] } | { ok: false; error: string } {
  const seen = new Set<number>();
  for (const t of targets) {
    if (seen.has(t.dayIndex)) {
      return { ok: false, error: `Duplicate dayIndex ${t.dayIndex}.` };
    }
    seen.add(t.dayIndex);
  }
  for (let i = 0; i <= 6; i++) {
    if (!seen.has(i)) {
      return { ok: false, error: `Missing dayIndex ${i}.` };
    }
  }
  const sorted = [...targets].sort((a, b) => a.dayIndex - b.dayIndex);
  return { ok: true, sorted };
}

/**
 * Aceita V1 ({ profile }) ou V2 ({ contractVersion: 2, ... }).
 * V2 incompleto NÃO cai silenciosamente para V1.
 */
export function validateMealPlanRequest(body: unknown): ValidationResult {
  if (body != null && typeof body === 'object' && 'contractVersion' in body) {
    const version = (body as { contractVersion?: unknown }).contractVersion;
    if (version === 2) {
      const parsed = generateMealPlanRequestV2Schema.safeParse(body);
      if (!parsed.success) {
        return { ok: false, error: 'Invalid V2 meal-plan request body.' };
      }
      const sorted = sortAndValidateTargets(parsed.data.dailyTargets);
      if (!sorted.ok) {
        return { ok: false, error: sorted.error };
      }
      const usedFallbackDays = sorted.sorted
        .filter((t) => t.source === 'profile_default' || t.source === 'flag_off')
        .map((t) => t.dayIndex);
      return {
        ok: true,
        value: {
          contractVersion: 2,
          profile: {
            goal: parsed.data.profile.goal,
            restrictions: parsed.data.profile.restrictions,
            dailyGoals: parsed.data.fallbackDailyGoals,
          },
          fallbackDailyGoals: parsed.data.fallbackDailyGoals,
          dailyTargets: sorted.sorted,
          usedFallbackDays,
        },
      };
    }
    return { ok: false, error: 'Unsupported contractVersion.' };
  }

  const parsed = generateMealPlanRequestSchema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, error: 'Invalid request body.' };
  }
  const dailyGoals = parsed.data.profile.dailyGoals;
  const dailyTargets = [0, 1, 2, 3, 4, 5, 6].map((dayIndex) => ({
    dayIndex: dayIndex as 0 | 1 | 2 | 3 | 4 | 5 | 6,
    dailyGoals,
    source: 'flag_off' as const,
  }));
  return {
    ok: true,
    value: {
      contractVersion: 1,
      profile: parsed.data.profile,
      fallbackDailyGoals: dailyGoals,
      dailyTargets,
      usedFallbackDays: [0, 1, 2, 3, 4, 5, 6],
    },
  };
}

export function buildMealPlanPrompt(profile: UserProfile): string {
  return `Você é um nutricionista prático que monta cardápios semanais para moradores de Dublin, Irlanda.
Escreva como um humano — nomes apetitosos, rotação inteligente, nada de planilha robótica.

## Perfil
- Objetivo: ${GOAL_LABELS[profile.goal]}
- Meta diária (fonte de verdade; valores Atwater-consistentes): ${profile.dailyGoals.calories} kcal · P ${profile.dailyGoals.protein}g · C ${profile.dailyGoals.carbs}g · G ${profile.dailyGoals.fat}g
- Preferências e restrições alimentares: ${profile.restrictions || 'nenhuma informada'}

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
7. Macros por refeição coerentes com a meta diária acima (soma diária ~meta; calorias e macros já são consistentes entre si)
8. Textos em português brasileiro natural — evite nomes genéricos como "Refeição 1"
9. Campo "summary": 2–3 frases humanas explicando a lógica da semana
10. Respeite restrições e preferências alimentares rigorosamente
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

const WEEK_DAY_LABELS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

export function buildMealPlanPromptV2(
  profile: Pick<UserProfile, 'goal' | 'restrictions'>,
  dailyTargets: Array<{
    dayIndex: number;
    dateISO?: string;
    dailyGoals: { calories: number; protein: number; carbs: number; fat: number };
    label?: string | null;
  }>,
): string {
  const dayBlocks = [...dailyTargets]
    .sort((a, b) => a.dayIndex - b.dayIndex)
    .map((t) => {
      const name = WEEK_DAY_LABELS[t.dayIndex] ?? `Dia ${t.dayIndex}`;
      const label = t.label ? ` — ${t.label}` : '';
      const date = t.dateISO ? ` (${t.dateISO})` : '';
      return `${name} (dayIndex ${t.dayIndex})${date}${label}:
  ${t.dailyGoals.calories} kcal · P ${t.dailyGoals.protein}g · C ${t.dailyGoals.carbs}g · G ${t.dailyGoals.fat}g`;
    })
    .join('\n\n');

  return `Você é um nutricionista prático que monta cardápios semanais para moradores de Dublin, Irlanda.
Escreva como um humano — nomes apetitosos, rotação inteligente, nada de planilha robótica.

## Perfil
- Objetivo: ${GOAL_LABELS[profile.goal]}
- Preferências e restrições alimentares: ${profile.restrictions || 'nenhuma informada'}

## Metas por dia (fonte de verdade — cada dia fecha a SUA meta)
NÃO use média semanal. NÃO compense déficit de um dia em outro.
Tolerâncias aproximadas por dia: calorias max(150 kcal, 8%); proteína max(8g, 10%); carbs/gordura max(15g/5g, 15%).

${dayBlocks}

## Formato da resposta (IMPORTANTE)
- Retorne APENAS plannedMeals + summary.
- NÃO inclua array recipes.
- NÃO inclua recipeId nas refeições.

## O que é meal-prep (IMPORTANTE)
Meal-prep NÃO é comer o MESMO prato 7 dias seguidos.
É variar proteínas e acompanhamentos ao longo da semana, reutilizando preparos quando fizer sentido.

## Regras obrigatórias
1. 7 dias completos (dayIndex 0=Segunda … 6=Domingo), cada um com café, almoço e jantar (snack opcional)
2. Mínimo 3 cafés diferentes, 4 almoços diferentes, 4 jantares diferentes na semana
3. No máximo 2 dias com cardápio 100% idêntico (sobras de prep)
4. Nomes descritivos o bastante para compras: inclua proteína + base + preparo
5. Ingredientes encontrados em Lidl, Aldi, Tesco, Dunnes, SuperValu
6. Horários realistas (HH:MM, 24h)
7. A soma das refeições de cada dayIndex deve atender à meta DAQUELE dia
8. Textos em português brasileiro natural
9. Campo "summary": 2–3 frases humanas explicando a lógica da semana (mencione variação de metas se útil)
10. Respeite restrições e preferências alimentares rigorosamente
11. Sugestão automática — não substitui orientação médica

Responda APENAS com JSON válido no schema solicitado.`;
}

export function buildMealPlanBatchRepairPrompt(
  profile: Pick<UserProfile, 'goal' | 'restrictions'>,
  dailyTargets: Array<{
    dayIndex: number;
    dateISO?: string;
    dailyGoals: { calories: number; protein: number; carbs: number; fat: number };
    label?: string | null;
  }>,
  invalidDays: number[],
  currentPlanJson: string,
  issues: string[],
): string {
  return `${buildMealPlanPromptV2(profile, dailyTargets)}

## REPARO EM LOTE
Corrija APENAS os dayIndex inválidos: ${invalidDays.join(', ')}.
Mantenha os demais dias do plano atual inalterados.
Problemas:
${issues.map((i) => `- ${i}`).join('\n')}

Plano atual (JSON):
${currentPlanJson}

Retorne o plano COMPLETO (7 dias) com os dayIndex inválidos corrigidos.`;
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
