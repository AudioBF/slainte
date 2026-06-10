import type { Recipe } from '../../../types';

export function buildShoppingListPrompt(recipes: Recipe[]): string {
  const recipeSummary = recipes
    .map(
      (r) =>
        `- ${r.name} (${r.servings} porções): ${r.ingredients.map((i) => `${i.name} ${i.amount}`).join(', ')}`,
    )
    .join('\n');

  return `You are a shopping list assistant for Sláinte (Dublin, Ireland).

Consolidate these recipes into one practical shopping list for the week.

Recipes:
${recipeSummary}

Rules:
- Merge duplicate ingredients and sum quantities
- Use simple item names in Brazilian Portuguese
- Quantities should be practical for Irish supermarkets (kg, g, un, pacotes)
- Prefix approximate quantities with "aprox" (e.g. "aprox 1 kg")
- Do not include pantry staples assumed at home (salt, pepper, water) unless large amounts needed

Respond only with valid JSON matching the schema.`;
}
