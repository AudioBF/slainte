import { selectMealsForDate, selectActualForDate } from '../../selectors';
import type { LoggedMeal } from '../../../types';
import { selectDayLogStatus } from './selectDayLogStatus';
import { selectEffectiveNutritionTargetForDate } from './selectEffectiveNutritionTargetForDate';
import { selectWeekCivilDates } from './selectWeekCivilDates';
import type {
  SelectEffectiveNutritionTargetInput,
  WeekDayComparison,
  WeekNutritionComparison,
} from './types';

export type SelectWeekNutritionComparisonInput = {
  profile: SelectEffectiveNutritionTargetInput['profile'];
  dayTypeTemplates: SelectEffectiveNutritionTargetInput['dayTypeTemplates'];
  weeklySchedule: SelectEffectiveNutritionTargetInput['weeklySchedule'];
  dailyTargetOverrides: SelectEffectiveNutritionTargetInput['dailyTargetOverrides'];
  loggedMeals: LoggedMeal[];
  referenceDateISO: string;
  /** Hoje civil (Europe/Dublin quando no fluxo flag ON). */
  todayISO: string;
  flagEnabled: boolean;
};

/**
 * Comparação semanal estruturada (segunda–domingo).
 * Ausência ≠ zero; médias só sobre dias com log; futuros excluídos do realizado.
 */
export function selectWeekNutritionComparison(
  input: SelectWeekNutritionComparisonInput,
): WeekNutritionComparison | null {
  const dates = selectWeekCivilDates(input.referenceDateISO);
  if (dates.length !== 7) return null;

  const weekStartISO = dates[0];
  const weekEndISO = dates[6];

  const perDay: WeekDayComparison[] = dates.map((dateISO) => {
    const meals = selectMealsForDate(input.loggedMeals, dateISO);
    const mealCount = meals.length;
    const status = selectDayLogStatus({
      dateISO,
      todayISO: input.todayISO,
      mealCount,
    });
    const target = selectEffectiveNutritionTargetForDate({
      profile: input.profile,
      dayTypeTemplates: input.dayTypeTemplates,
      weeklySchedule: input.weeklySchedule,
      dailyTargetOverrides: input.dailyTargetOverrides,
      dateISO,
      flagEnabled: input.flagEnabled,
    });
    const actual =
      status === 'logged' ? selectActualForDate(input.loggedMeals, dateISO) : null;

    return {
      dateISO,
      weekday: target.weekday,
      status,
      target,
      actual,
      mealCount,
    };
  });

  const futureDays = perDay.filter((d) => d.status === 'future').length;
  const elapsedDays = perDay.filter((d) => d.status !== 'future').length;
  const consideredDays = elapsedDays;
  const daysWithLogs = perDay.filter((d) => d.status === 'logged').length;
  const daysWithoutLogs = perDay.filter((d) => d.status === 'no_log').length;

  const elapsed = perDay.filter((d) => d.status !== 'future');
  const logged = perDay.filter((d) => d.status === 'logged');

  const totalTargetCaloriesForElapsedDays = elapsed.reduce(
    (sum, d) => sum + d.target.dailyGoals.calories,
    0,
  );
  const totalTargetCaloriesForLoggedDays = logged.reduce(
    (sum, d) => sum + d.target.dailyGoals.calories,
    0,
  );
  const totalActualCaloriesForLoggedDays = logged.reduce(
    (sum, d) => sum + (d.actual?.calories ?? 0),
    0,
  );

  const averageTargetForLoggedDays =
    daysWithLogs === 0
      ? null
      : Math.round(totalTargetCaloriesForLoggedDays / daysWithLogs);
  const averageActualForLoggedDays =
    daysWithLogs === 0
      ? null
      : Math.round(totalActualCaloriesForLoggedDays / daysWithLogs);

  const isPartialWeek = futureDays > 0 || daysWithoutLogs > 0;

  return {
    referenceDateISO: input.referenceDateISO,
    weekStartISO,
    weekEndISO,
    isPartialWeek,
    elapsedDays,
    consideredDays,
    daysWithLogs,
    daysWithoutLogs,
    futureDays,
    totalTargetCaloriesForElapsedDays,
    totalTargetCaloriesForLoggedDays,
    totalActualCaloriesForLoggedDays,
    averageTargetForLoggedDays,
    averageActualForLoggedDays,
    perDay,
  };
}
