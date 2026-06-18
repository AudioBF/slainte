import type { PlannedMeal, Recipe } from '../../../types';

const WEEK_DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

const SLOT_LABELS: Record<PlannedMeal['slot'], string> = {
  breakfast: 'Café da manhã',
  lunch: 'Almoço',
  dinner: 'Jantar',
  snack: 'Lanche',
};

function groupPlannedMealsByDay(plannedMeals: Pick<PlannedMeal, 'name' | 'slot' | 'dayIndex'>[]): string {
  const byDay = new Map<number, typeof plannedMeals>();
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

/** Legacy fallback when only full recipes exist (no weekly plan). */
export function buildShoppingListPrompt(recipes: Recipe[]): string {
  const recipeSummary = recipes
    .map(
      (r) =>
        `- ${r.name} (${r.servings} porções): ${r.ingredients.map((i) => `${i.name} ${i.amount}`).join(', ')}`,
    )
    .join('\n');

  return `Você monta listas de compras práticas para moradores de Dublin (Lidl, Aldi, Tesco, Dunnes, SuperValu).

Consolide estas receitas em UMA lista de compras da semana.

Receitas:
${recipeSummary}

Regras:
- Una ingredientes repetidos em uma única linha com quantidade total da semana
- Nomes simples em português brasileiro, como no supermercado
- Quantidades práticas (kg, g, un, pacotes, caixas); use "aprox" quando estimar
- Não inclua sal, pimenta ou água salvo quantidade grande
- Evite itens vagos ("temperos", "legumes variados") — seja específico ou omita

Responda APENAS com JSON válido no schema solicitado.`;
}

/** Primary path: lightweight weekly plan (plannedMeals only). Mirrors Edge prompt. */
export function buildShoppingListFromPlannedMealsPrompt(
  plannedMeals: Pick<PlannedMeal, 'name' | 'slot' | 'dayIndex'>[],
): string {
  const mealSummary = groupPlannedMealsByDay(plannedMeals);
  const mealCount = plannedMeals.length;

  return `Você monta listas de compras práticas para moradores de Dublin (Lidl, Aldi, Tesco, Dunnes, SuperValu).

O cardápio abaixo tem ${mealCount} refeições planejadas (nomes apenas — sem receitas completas). Infira ingredientes realistas e monte UMA lista consolidada para a SEMANA INTEIRA.

Cardápio:
${mealSummary}

Regras obrigatórias:
1. Cobrir todas as refeições da semana — não liste só um dia
2. Una duplicatas: se frango, arroz ou ovos aparecem em vários dias, UMA linha com quantidade semanal total
3. Meta: 30–50 itens distintos para ~21 refeições
4. Nomes simples em português brasileiro
5. Quantidades semanais práticas; use "aprox" ao estimar
6. Ingredientes plausíveis — não invente itens fora do plano
7. Evite gourmet, exótico ou genérico demais
8. Não inclua sal, pimenta, água ou óleo em quantidade pequena

Responda APENAS com JSON válido no schema solicitado.`;
}
