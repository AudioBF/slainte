import { SchemaType } from 'npm:@google/generative-ai@0.24.1';
import { z } from 'npm:zod@4.4.3';

const MAX_RECIPES = 30;
const MAX_PLANNED_MEALS = 35;
const MAX_INGREDIENTS_PER_RECIPE = 40;

const WEEK_DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

const ingredientSchema = z.object({
  name: z.string().min(1).max(120),
  amount: z.string().min(1).max(80),
});

const recipeSchema = z.object({
  name: z.string().min(1).max(160),
  servings: z.number().positive().max(100),
  ingredients: z.array(ingredientSchema).max(MAX_INGREDIENTS_PER_RECIPE),
});

const plannedMealShoppingSchema = z.object({
  name: z.string().min(1).max(200),
  slot: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  dayIndex: z.number().min(0).max(6),
});

export const shoppingListSchema = z.object({
  items: z.array(
    z.object({
      name: z.string(),
      quantity: z.string(),
    }),
  ),
});

export type ShoppingListResult = z.infer<typeof shoppingListSchema>;

export const shoppingListResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    items: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          quantity: { type: SchemaType.STRING },
        },
        required: ['name', 'quantity'],
      },
    },
  },
  required: ['items'],
};

type ShoppingListRecipe = z.infer<typeof recipeSchema>;
type ShoppingPlannedMeal = z.infer<typeof plannedMealShoppingSchema>;

const shoppingListRequestSchema = z.object({
  recipes: z.array(recipeSchema).max(MAX_RECIPES).optional().default([]),
  plannedMeals: z.array(plannedMealShoppingSchema).max(MAX_PLANNED_MEALS).optional(),
});

export type GenerateShoppingListRequest = {
  recipes: ShoppingListRecipe[];
  plannedMeals?: ShoppingPlannedMeal[];
};

type ValidationResult =
  | { ok: true; value: GenerateShoppingListRequest }
  | { ok: false; error: string };

export function validateShoppingListRequest(body: unknown): ValidationResult {
  const parsed = shoppingListRequestSchema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, error: 'Invalid request body.' };
  }

  const recipes = parsed.data.recipes ?? [];
  const plannedMeals = parsed.data.plannedMeals ?? [];

  if (recipes.length === 0 && plannedMeals.length === 0) {
    return { ok: false, error: 'Provide recipes or plannedMeals.' };
  }

  return { ok: true, value: { recipes, plannedMeals: plannedMeals.length ? plannedMeals : undefined } };
}

export function buildShoppingListPrompt(recipes: ShoppingListRecipe[]): string {
  const recipeSummary = recipes
    .map(
      (recipe) =>
        `- ${recipe.name} (${recipe.servings} porções): ${
          recipe.ingredients.map((ingredient) => `${ingredient.name} ${ingredient.amount}`).join(', ')
        }`,
    )
    .join('\n');

  return `Você monta listas de compras práticas para moradores de Dublin (Lidl, Aldi, Tesco, Dunnes, SuperValu).

Consolide estas receitas em UMA lista de compras da semana.

Receitas:
${recipeSummary}

Regras:
- Una ingredientes repetidos em uma única linha com quantidade total da semana
- Nomes simples em português brasileiro, como no supermercado
- Quantidades práticas (kg, g, un, pacotes, caixas); use "aprox" quando estimar (ex.: "aprox 1 kg")
- Não inclua sal, pimenta ou água salvo quantidade grande
- Evite itens vagos ("temperos", "legumes variados") — seja específico ou omita
- Ingredientes comuns e compráveis na Irlanda; nada gourmet ou exótico

Responda APENAS com JSON válido no schema solicitado.`;
}

const SLOT_LABELS: Record<ShoppingPlannedMeal['slot'], string> = {
  breakfast: 'Café da manhã',
  lunch: 'Almoço',
  dinner: 'Jantar',
  snack: 'Lanche',
};

function groupPlannedMealsByDay(plannedMeals: ShoppingPlannedMeal[]): string {
  const byDay = new Map<number, ShoppingPlannedMeal[]>();
  for (const meal of plannedMeals) {
    const list = byDay.get(meal.dayIndex) ?? [];
    list.push(meal);
    byDay.set(meal.dayIndex, list);
  }

  const lines: string[] = [];
  for (let day = 0; day <= 6; day++) {
    const meals = byDay.get(day);
    if (!meals?.length) continue;
    lines.push(`${WEEK_DAYS[day]}:`);
    for (const meal of meals) {
      lines.push(`  - ${SLOT_LABELS[meal.slot]}: ${meal.name}`);
    }
  }
  return lines.join('\n');
}

export function buildShoppingListFromPlannedMealsPrompt(plannedMeals: ShoppingPlannedMeal[]): string {
  const mealSummary = groupPlannedMealsByDay(plannedMeals);
  const mealCount = plannedMeals.length;

  return `Você monta listas de compras práticas para moradores de Dublin (Lidl, Aldi, Tesco, Dunnes, SuperValu).

O cardápio abaixo tem ${mealCount} refeições planejadas (nomes apenas — sem receitas completas). Infira ingredientes realistas e monte UMA lista consolidada para a SEMANA INTEIRA.

Cardápio:
${mealSummary}

Regras obrigatórias:
1. Cobrir todas as refeições da semana — não liste só um dia
2. Una duplicatas: se frango, arroz ou ovos aparecem em vários dias, UMA linha com quantidade semanal total
3. Meta: 30–50 itens distintos para ~21 refeições (nem lista vazia, nem 80 linhas microscópicas)
4. Nomes simples em português brasileiro: "Peito de frango", "Ovos grandes", "Arroz integral", "Iogurte natural"
5. Quantidades semanais práticas (pacotes/caixas do supermercado); use "aprox" ao estimar (ex.: "aprox 1,2 kg", "aprox 12 un")
6. Ingredientes plausíveis a partir do nome da refeição — não invente pratos ou itens que não aparecem no plano
7. Evite gourmet, exótico ou genérico demais: não use "legumes variados", "temperos", "acompanhamento" — nomeie o item (cenoura, brócolis, etc.) ou omita
8. Não inclua sal, pimenta, água ou óleo em quantidade pequena (despensa básica)
9. Priorize proteína, carboidrato, hortifruti e laticínios que existem em supermercados irlandeses comuns

Responda APENAS com JSON válido no schema solicitado.`;
}

/** Merge duplicate item names (case/diacritic insensitive) after Gemini output. */
export function consolidateShoppingListItems(
  items: ShoppingListResult['items'],
): ShoppingListResult['items'] {
  const merged = new Map<string, { name: string; quantities: string[] }>();

  for (const item of items) {
    const name = item.name.trim();
    const quantity = item.quantity.trim();
    if (!name) continue;

    const key = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{M}/gu, '');

    const existing = merged.get(key);
    if (existing) {
      if (quantity && !existing.quantities.includes(quantity)) {
        existing.quantities.push(quantity);
      }
    } else {
      merged.set(key, { name, quantities: quantity ? [quantity] : [] });
    }
  }

  return Array.from(merged.values()).map(({ name, quantities }) => ({
    name,
    quantity:
      quantities.length === 0
        ? 'aprox 1 un'
        : quantities.length === 1
          ? quantities[0]
          : quantities.join(' + '),
  }));
}

export function buildShoppingListRequestPrompt(request: GenerateShoppingListRequest): string {
  if (request.plannedMeals?.length) {
    return buildShoppingListFromPlannedMealsPrompt(request.plannedMeals);
  }
  if (request.recipes.length > 0) {
    return buildShoppingListPrompt(request.recipes);
  }
  return buildShoppingListFromPlannedMealsPrompt([]);
}
