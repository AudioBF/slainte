import { MealSlot } from '../types';

export const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: 'Café da manhã',
  lunch: 'Almoço',
  dinner: 'Jantar',
  snack: 'Lanche',
};

export const SLOT_SHORT: Record<MealSlot, string> = {
  breakfast: 'Café',
  lunch: 'Almoço',
  dinner: 'Jantar',
  snack: 'Lanche',
};

export const SLOT_ORDER: Record<MealSlot, number> = {
  breakfast: 0,
  lunch: 1,
  snack: 2,
  dinner: 3,
};

export const MEAL_SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export function isMealSlot(value: string | undefined): value is MealSlot {
  return MEAL_SLOTS.includes(value as MealSlot);
}
