/** 21-meal lightweight plan fixture for shopping smokes when Edge meal-plan is unavailable. */
const WEEK_MEALS = [
  ['Omelete de ovos e espinafre', 'Frango grelhado com arroz integral', 'Ensopado de lentilha com arroz'],
  ['Iogurte natural com granola', 'Salada de atum com quinoa', 'Peixe assado com legumes'],
  ['Pão integral com abacate e ovo', 'Carne moída magra com batata', 'Frango ao curry com arroz'],
  ['Smoothie de banana e whey', 'Wrap de frango e salada', 'Omelete de claras com vegetais'],
  ['Aveia com frutas vermelhas', 'Bowl de frango e brócolis', 'Sopa de legumes com pão'],
  ['Panqueca de aveia', 'Salmão grelhado com quinoa', 'Chili de carne com arroz'],
  ['Ovos mexidos com tomate', 'Peito de peru com batata doce', 'Frango assado com salada'],
];

const SLOTS = ['breakfast', 'lunch', 'dinner'];

export function fixturePlannedMeals() {
  const meals = [];
  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    const day = WEEK_MEALS[dayIndex];
    for (let i = 0; i < SLOTS.length; i++) {
      meals.push({
        name: day[i],
        slot: SLOTS[i],
        dayIndex,
      });
    }
  }
  return meals;
}

export async function fetchPlannedMealsFromEdge(url, anon, token) {
  const res = await fetch(`${url}/functions/v1/generate-meal-plan`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: anon,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      profile: {
        goal: 'maintain',
        restrictions: '',
        dailyGoals: { calories: 2100, protein: 140, carbs: 220, fat: 65 },
      },
    }),
  });
  const json = await res.json();
  const plannedMeals = json?.data?.plannedMeals ?? [];
  if (json?.ok === true && plannedMeals.length >= 21) {
    return { plannedMeals, source: 'edge' };
  }
  return { plannedMeals: fixturePlannedMeals(), source: 'fixture' };
}
