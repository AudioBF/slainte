import type { MealPlanResult } from './schemas/meal-plan.schema';

export type MealPlanValidation = {
  ok: boolean;
  issues: string[];
};

function mealsForDay(plannedMeals: MealPlanResult['plannedMeals'], dayIndex: number) {
  return plannedMeals.filter((m) => m.dayIndex === dayIndex);
}

function daySignature(plannedMeals: MealPlanResult['plannedMeals'], dayIndex: number): string {
  return mealsForDay(plannedMeals, dayIndex)
    .sort((a, b) => a.slot.localeCompare(b.slot))
    .map((m) => `${m.slot}:${m.name.trim().toLowerCase()}`)
    .join('|');
}

function uniqueNamesForSlot(
  plannedMeals: MealPlanResult['plannedMeals'],
  slot: MealPlanResult['plannedMeals'][number]['slot'],
): number {
  return new Set(
    plannedMeals.filter((m) => m.slot === slot).map((m) => m.name.trim().toLowerCase()),
  ).size;
}

export function validateMealPlanVariety(plan: MealPlanResult): MealPlanValidation {
  const issues: string[] = [];

  const signatures = new Map<string, number>();
  for (let day = 0; day < 7; day++) {
    const sig = daySignature(plan.plannedMeals, day);
    if (!sig) {
      issues.push(`Dia ${day} está vazio — inclua café, almoço e jantar.`);
      continue;
    }
    signatures.set(sig, (signatures.get(sig) ?? 0) + 1);
  }

  const maxIdenticalDays = Math.max(0, ...signatures.values());
  if (maxIdenticalDays >= 3) {
    issues.push(
      `Cardápio repetido demais: ${maxIdenticalDays} dias idênticos. Máximo permitido: 2 dias iguais (sobras de meal-prep).`,
    );
  }

  const minBreakfast = 3;
  const minLunch = 4;
  const minDinner = 4;

  const breakfastCount = uniqueNamesForSlot(plan.plannedMeals, 'breakfast');
  const lunchCount = uniqueNamesForSlot(plan.plannedMeals, 'lunch');
  const dinnerCount = uniqueNamesForSlot(plan.plannedMeals, 'dinner');

  if (breakfastCount < minBreakfast) {
    issues.push(`Café da manhã: apenas ${breakfastCount} opções distintas (mínimo ${minBreakfast}).`);
  }
  if (lunchCount < minLunch) {
    issues.push(`Almoço: apenas ${lunchCount} pratos distintos (mínimo ${minLunch}).`);
  }
  if (dinnerCount < minDinner) {
    issues.push(`Jantar: apenas ${dinnerCount} pratos distintos (mínimo ${minDinner}).`);
  }

  const daysWithMeals = new Set(plan.plannedMeals.map((m) => m.dayIndex));
  if (daysWithMeals.size < 7) {
    issues.push(`Faltam dias no plano: apenas ${daysWithMeals.size} de 7.`);
  }

  return { ok: issues.length === 0, issues };
}
