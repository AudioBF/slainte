import { MEAL_SLOTS, SLOT_LABELS, SLOT_ORDER } from '../../constants/meals';
import type { ProfileGoal } from '../profile/types';
import { isPlannedMealLoggedToday } from '../../store/selectors';
import type { LoggedMeal, MacroGoals, MacroTotals, MealSlot, PlannedMeal } from '../../types';
import type { DailyInsight } from './types';

export type SelectPrimaryDailyInsightInput = {
  loggedMeals: LoggedMeal[];
  plannedMeals: PlannedMeal[];
  dailyGoals: MacroGoals;
  profileGoal: ProfileGoal;
  dayMeals: LoggedMeal[];
  dayActual: MacroTotals;
  /** When TodayPlanSection shows the next meal, skip duplicate plan_pending insight. */
  skipPlanPending?: boolean;
  /** Optional for tests; defaults to current time. */
  now?: Date;
};

function todayDayIndex(): number {
  const day = new Date().getDay();
  return day === 0 ? 6 : day - 1;
}

function selectPlannedMealsForToday(plannedMeals: PlannedMeal[]): PlannedMeal[] {
  const dayIndex = todayDayIndex();
  return plannedMeals
    .filter((m) => m.dayIndex === dayIndex)
    .sort((a, b) => SLOT_ORDER[a.slot] - SLOT_ORDER[b.slot]);
}

function parseMealTimeMinutes(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function nowMinutes(now: Date): number {
  return now.getHours() * 60 + now.getMinutes();
}

/** Fallback when planned meal has no parseable time. */
const SLOT_DUE_HOUR: Record<MealSlot, number> = {
  breakfast: 11,
  lunch: 15,
  snack: 20,
  dinner: 21,
};

function isPlannedMealDue(meal: PlannedMeal, now: Date): boolean {
  const mealMinutes = parseMealTimeMinutes(meal.time);
  if (mealMinutes !== null) {
    return mealMinutes <= nowMinutes(now);
  }
  return now.getHours() >= SLOT_DUE_HOUR[meal.slot];
}

function shouldEvaluateLowProtein(dayMeals: LoggedMeal[], now: Date): boolean {
  if (dayMeals.length >= 2) return true;
  return now.getHours() >= 14;
}

function isDayComplete(
  loggedMeals: LoggedMeal[],
  todayPlanned: PlannedMeal[],
  dayMeals: LoggedMeal[],
): boolean {
  if (todayPlanned.length > 0) {
    return todayPlanned.every((m) => isPlannedMealLoggedToday(loggedMeals, m.id));
  }
  const loggedSlots = new Set(dayMeals.map((m) => m.slot));
  return MEAL_SLOTS.every((slot) => loggedSlots.has(slot));
}

function dayCompleteMessage(todayPlanned: PlannedMeal[]): string {
  if (todayPlanned.length > 0) {
    return 'Você registrou todas as refeições do cardápio de hoje. Manter o diário em dia ajuda a ver padrões.';
  }
  return 'Você registrou os quatro horários de refeição hoje. Boa consistência no diário.';
}

/** Insights after plan_pending (or when plan_pending is skipped). */
function selectNonPlanInsight(
  input: SelectPrimaryDailyInsightInput,
  todayPlanned: PlannedMeal[],
  now: Date,
): DailyInsight {
  const { loggedMeals, dailyGoals, dayMeals, dayActual } = input;

  const proteinGap = Math.round(dailyGoals.protein - dayActual.protein);
  if (
    shouldEvaluateLowProtein(dayMeals, now) &&
    dayActual.protein < dailyGoals.protein * 0.7
  ) {
    return {
      id: 'low_protein',
      severity: 'warning',
      title: 'Proteína abaixo do ideal',
      message: `Faltam ~${proteinGap}g de proteína para a meta. Priorize proteína no jantar.`,
    };
  }

  const calorieOver = Math.round(dayActual.calories - dailyGoals.calories);
  if (dayActual.calories > dailyGoals.calories * 1.1) {
    return {
      id: 'over_calories',
      severity: 'warning',
      title: 'Acima da meta de calorias',
      message: `Passou ~${calorieOver} kcal da meta. Amanhã volte ao plano sem culpa — consistência importa mais.`,
    };
  }

  const remaining = Math.round(dailyGoals.calories - dayActual.calories);
  if (remaining > 0 && dayActual.fat > dailyGoals.fat * 1.15) {
    return {
      id: 'fat_high',
      severity: 'warning',
      title: 'Atenção à gordura hoje',
      message:
        'Você ainda tem calorias disponíveis, mas a gordura já passou da meta. Nas próximas refeições, priorize opções mais leves.',
    };
  }

  if (remaining > 0) {
    return {
      id: 'on_track',
      severity: 'success',
      title: 'No caminho certo',
      message: `Você ainda tem ~${remaining} kcal para hoje.`,
    };
  }

  if (isDayComplete(loggedMeals, todayPlanned, dayMeals)) {
    return {
      id: 'day_complete',
      severity: 'success',
      title: 'Diário completo',
      message: dayCompleteMessage(todayPlanned),
    };
  }

  return {
    id: 'on_track',
    severity: 'success',
    title: 'No caminho certo',
    message: `Você consumiu ${Math.round(dayActual.calories)} de ${dailyGoals.calories} kcal.`,
  };
}

/** One primary insight for today's Home tab. Call only when viewing today. */
export function selectPrimaryDailyInsight(input: SelectPrimaryDailyInsightInput): DailyInsight | null {
  const { loggedMeals, plannedMeals, dayMeals } = input;
  const now = input.now ?? new Date();
  const todayPlanned = selectPlannedMealsForToday(plannedMeals);

  if (dayMeals.length === 0) {
    return {
      id: 'empty_day',
      severity: 'info',
      title: 'Dia ainda sem registros',
      message: 'Fotografe sua próxima refeição ou registre uma do cardápio.',
      actionLabel: 'Fotografar refeição',
      actionRoute: '/meal',
    };
  }

  if (!input.skipPlanPending) {
    const dueUnlogged = todayPlanned.find(
      (m) => !isPlannedMealLoggedToday(loggedMeals, m.id) && isPlannedMealDue(m, now),
    );
    if (dueUnlogged) {
      const slotLabel = SLOT_LABELS[dueUnlogged.slot];
      return {
        id: 'plan_pending',
        severity: 'info',
        title: `${slotLabel} do plano`,
        message: `Você ainda não registrou ${slotLabel.toLowerCase()} de hoje: ${dueUnlogged.name} (~${Math.round(dueUnlogged.calories)} kcal).`,
      };
    }
  }

  return selectNonPlanInsight(input, todayPlanned, now);
}
