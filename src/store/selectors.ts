import { LoggedMeal, MacroTotals, MealComponent, PlannedMeal } from '../types';
import { SLOT_ORDER } from '../constants/meals';

export function sumMacros(meals: LoggedMeal[]): MacroTotals {
  return meals.reduce(
    (acc, meal) => {
      for (const c of meal.components) {
        acc.calories += c.calories;
        acc.protein += c.protein;
        acc.carbs += c.carbs;
        acc.fat += c.fat;
      }
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function selectTodayActual(loggedMeals: LoggedMeal[]): MacroTotals {
  const today = todayISO();
  return sumMacros(loggedMeals.filter((m) => m.date === today));
}

export function selectTodayPlanned(plannedMeals: PlannedMeal[]): MacroTotals {
  const day = new Date().getDay();
  const dayIndex = day === 0 ? 6 : day - 1;
  return plannedMeals
    .filter((m) => m.dayIndex === dayIndex)
    .reduce(
      (acc, m) => ({
        calories: acc.calories + m.calories,
        protein: acc.protein + m.protein,
        carbs: acc.carbs + m.carbs,
        fat: acc.fat + m.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );
}

export function selectWeekComparison(
  loggedMeals: LoggedMeal[],
  plannedMeals: PlannedMeal[],
) {
  const weekDates = new Set(selectRecentDates(7));
  const planned = plannedMeals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
  const actual = sumMacros(loggedMeals.filter((m) => weekDates.has(m.date)));
  return { planned, actual };
}

/** Calorias por dia (Seg–Dom) com base nos últimos 7 dias do calendário. */
export function selectWeekCalorieTrend(loggedMeals: LoggedMeal[]): number[] {
  const dates = selectRecentDates(7);
  return dates.map((date) => selectActualForDate(loggedMeals, date).calories);
}

export function selectTodayMeals(loggedMeals: LoggedMeal[]): LoggedMeal[] {
  return selectMealsForDate(loggedMeals, todayISO());
}

export function offsetDate(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatDateLabel(iso: string): string {
  const today = todayISO();
  if (iso === today) return 'Hoje';
  if (iso === offsetDate(today, -1)) return 'Ontem';
  return new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function selectMealsForDate(loggedMeals: LoggedMeal[], date: string): LoggedMeal[] {
  return loggedMeals
    .filter((m) => m.date === date)
    .sort((a, b) => SLOT_ORDER[a.slot] - SLOT_ORDER[b.slot]);
}

export function selectActualForDate(loggedMeals: LoggedMeal[], date: string): MacroTotals {
  return sumMacros(loggedMeals.filter((m) => m.date === date));
}

export function selectRecentDates(count = 7): string[] {
  const today = todayISO();
  return Array.from({ length: count }, (_, i) => offsetDate(today, i - (count - 1)));
}

export function isPlannedMealLoggedToday(
  loggedMeals: LoggedMeal[],
  plannedMealId: string,
): boolean {
  const today = todayISO();
  return loggedMeals.some((m) => m.date === today && m.plannedMealId === plannedMealId);
}

export function sumComponentMacros(components: MealComponent[]): MacroTotals {
  return components.reduce(
    (acc, c) => ({
      calories: acc.calories + c.calories,
      protein: acc.protein + c.protein,
      carbs: acc.carbs + c.carbs,
      fat: acc.fat + c.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}
