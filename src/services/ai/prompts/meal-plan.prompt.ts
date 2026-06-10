import type { UserProfile } from '../../../types';

const GOAL_LABELS = {
  lose: 'emagrecimento (déficit calórico moderado)',
  maintain: 'manutenção de peso',
  gain: 'hipertrofia (superávit calórico moderado)',
};

const WEEK_DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

export function buildMealPlanPrompt(profile: UserProfile): string {
  return `Você é um nutricionista prático que monta cardápios semanais para moradores de Dublin, Irlanda.
Escreva como um humano — nomes apetitosos, rotação inteligente, nada de planilha robótica.

## Perfil
- Objetivo: ${GOAL_LABELS[profile.goal]}
- Meta diária: ${profile.dailyGoals.calories} kcal · P ${profile.dailyGoals.protein}g · C ${profile.dailyGoals.carbs}g · G ${profile.dailyGoals.fat}g
- Restrições: ${profile.restrictions || 'nenhuma informada'}

## O que é meal-prep (IMPORTANTE)
Meal-prep NÃO é comer o MESMO prato 7 dias seguidos.
É cozinhar 5–8 receitas-base no fim de semana e ROTACIONAR combinações ao longo da semana.

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
4. 5 a 8 receitas-base reutilizáveis (recipeId nas refeições que usam receita)
5. Ingredientes encontrados em Lidl, Aldi, Tesco, Dunnes, SuperValu
6. Horários realistas (HH:MM, 24h)
7. Textos em português brasileiro natural — evite nomes genéricos como "Refeição 1"
8. Campo "summary": 2–3 frases humanas explicando a lógica da semana (ex: "Domingo preparamos frango e arroz; durante a semana alternamos bowls, wraps e saladas")
9. Respeite restrições alimentares rigorosamente
10. Sugestão automática — não substitui orientação médica

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
