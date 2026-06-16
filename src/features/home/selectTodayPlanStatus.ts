import { SLOT_ORDER } from '../../constants/meals';
import { isPlannedMealLoggedToday, todayDayIndex } from '../../store/selectors';
import type { LoggedMeal, PlannedMeal } from '../../types';

export type TodayPlanStatus = {
  dayIndex: number;
  plannedMealsToday: PlannedMeal[];
  loggedCount: number;
  totalCount: number;
  nextUnlogged: PlannedMeal | null;
  allLogged: boolean;
};

/** Today's planned meals vs logged status. Null when no plan or no meals for today. */
export function selectTodayPlanStatus(
  loggedMeals: LoggedMeal[],
  plannedMeals: PlannedMeal[],
): TodayPlanStatus | null {
  if (plannedMeals.length === 0) return null;

  const dayIndex = todayDayIndex();
  const plannedMealsToday = plannedMeals
    .filter((m) => m.dayIndex === dayIndex)
    .sort((a, b) => SLOT_ORDER[a.slot] - SLOT_ORDER[b.slot]);

  if (plannedMealsToday.length === 0) return null;

  const loggedCount = plannedMealsToday.filter((m) =>
    isPlannedMealLoggedToday(loggedMeals, m.id),
  ).length;

  const nextUnlogged =
    plannedMealsToday.find((m) => !isPlannedMealLoggedToday(loggedMeals, m.id)) ?? null;

  return {
    dayIndex,
    plannedMealsToday,
    loggedCount,
    totalCount: plannedMealsToday.length,
    nextUnlogged,
    allLogged: loggedCount === plannedMealsToday.length,
  };
}
