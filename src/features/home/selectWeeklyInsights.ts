import {
  selectMealsForDate,
  selectRecentDates,
  selectWeekCalorieTrend,
  sumMacros,
} from '../../store/selectors';
import type { LoggedMeal, MacroGoals, MacroTotals, PlannedMeal } from '../../types';

const DAYS_IN_PERIOD = 7;

const MACRO_LABELS: Record<'protein' | 'carbs' | 'fat', string> = {
  protein: 'Proteína',
  carbs: 'Carboidrato',
  fat: 'Gordura',
};

export type WeeklyInsight = {
  id: string;
  message: string;
};

export type WeeklyStats = {
  daysLogged: number;
  daysInPeriod: number;
  avgCalories: number;
  calorieGoal: number;
  calorieDelta: number;
  weeklyActual: MacroTotals;
  weeklyGoal: MacroTotals;
  dominantMacroGap: { key: 'protein' | 'carbs' | 'fat'; deficitPct: number } | null;
  planMealsLogged: number;
  hasPlan: boolean;
};

export type SelectWeeklyInsightsInput = {
  loggedMeals: LoggedMeal[];
  plannedMeals: PlannedMeal[];
  dailyGoals: MacroGoals;
};

function scaleGoals(dailyGoals: MacroGoals, days: number): MacroTotals {
  return {
    calories: dailyGoals.calories * days,
    protein: dailyGoals.protein * days,
    carbs: dailyGoals.carbs * days,
    fat: dailyGoals.fat * days,
  };
}

function findDominantMacroGap(
  weeklyActual: MacroTotals,
  weeklyGoal: MacroTotals,
): WeeklyStats['dominantMacroGap'] {
  const keys = ['protein', 'carbs', 'fat'] as const;
  let best: WeeklyStats['dominantMacroGap'] = null;

  for (const key of keys) {
    const goal = weeklyGoal[key];
    const actual = weeklyActual[key];
    if (goal <= 0 || actual >= goal * 0.9) continue;
    const deficitPct = ((goal - actual) / goal) * 100;
    if (!best || deficitPct > best.deficitPct) {
      best = { key, deficitPct };
    }
  }

  return best;
}

export function selectWeeklyStats(input: SelectWeeklyInsightsInput): WeeklyStats {
  const { loggedMeals, plannedMeals, dailyGoals } = input;
  const dates = selectRecentDates(DAYS_IN_PERIOD);
  const weekDates = new Set(dates);

  const daysLogged = dates.filter(
    (date) => selectMealsForDate(loggedMeals, date).length > 0,
  ).length;

  const trend = selectWeekCalorieTrend(loggedMeals);
  const avgCalories = Math.round(
    trend.reduce((sum, v) => sum + v, 0) / DAYS_IN_PERIOD,
  );

  const weeklyActual = sumMacros(loggedMeals.filter((m) => weekDates.has(m.date)));
  const weeklyGoal = scaleGoals(dailyGoals, DAYS_IN_PERIOD);

  const planMealsLogged = loggedMeals.filter(
    (m) => weekDates.has(m.date) && m.fromPlan,
  ).length;

  return {
    daysLogged,
    daysInPeriod: DAYS_IN_PERIOD,
    avgCalories,
    calorieGoal: dailyGoals.calories,
    calorieDelta: avgCalories - dailyGoals.calories,
    weeklyActual,
    weeklyGoal,
    dominantMacroGap: findDominantMacroGap(weeklyActual, weeklyGoal),
    planMealsLogged,
    hasPlan: plannedMeals.length > 0,
  };
}

function consistencyMessage(stats: WeeklyStats): WeeklyInsight {
  const { daysLogged, daysInPeriod } = stats;
  if (daysLogged === 0) {
    return {
      id: 'logging_consistency',
      message: 'Você ainda não registrou refeições nos últimos 7 dias.',
    };
  }
  if (daysLogged === daysInPeriod) {
    return {
      id: 'logging_consistency',
      message: `Você registrou todos os ${daysInPeriod} dias — ótima consistência.`,
    };
  }
  return {
    id: 'logging_consistency',
    message: `Você registrou ${daysLogged} de ${daysInPeriod} dias esta semana.`,
  };
}

function calorieAverageMessage(stats: WeeklyStats): WeeklyInsight {
  const { avgCalories, calorieGoal, calorieDelta } = stats;
  const absDelta = Math.abs(Math.round(calorieDelta));
  const nearGoal = absDelta <= calorieGoal * 0.1;

  if (nearGoal) {
    return {
      id: 'calorie_average',
      message: `Média de ${avgCalories} kcal/dia — próximo da sua meta.`,
    };
  }
  if (calorieDelta < 0) {
    return {
      id: 'calorie_average',
      message: `Média de ${avgCalories} kcal/dia — ${absDelta} abaixo da sua meta.`,
    };
  }
  return {
    id: 'calorie_average',
    message: `Média de ${avgCalories} kcal/dia — ${absDelta} acima da sua meta.`,
  };
}

function macroGapMessage(stats: WeeklyStats): WeeklyInsight | null {
  if (!stats.dominantMacroGap) return null;
  const label = MACRO_LABELS[stats.dominantMacroGap.key];
  return {
    id: 'macro_gap',
    message: `${label} foi o macro mais distante da meta nesta semana.`,
  };
}

function sparseWeekNudge(): WeeklyInsight {
  return {
    id: 'sparse_week',
    message: 'Poucos registros esta semana. Comece registrando uma refeição por dia.',
  };
}

function zeroDaysNudge(): WeeklyInsight {
  return {
    id: 'zero_days_nudge',
    message: 'Poucos registros esta semana. Comece registrando uma refeição por dia.',
  };
}

function planAdherenceMessage(stats: WeeklyStats): WeeklyInsight | null {
  if (!stats.hasPlan || stats.planMealsLogged === 0) return null;
  const count = stats.planMealsLogged;
  return {
    id: 'plan_adherence',
    message: `${count} refeiç${count === 1 ? 'ão do cardápio foi' : 'ões do cardápio foram'} registrada${count === 1 ? '' : 's'} esta semana.`,
  };
}

/** Up to 3 weekly insight bullets for the Semana tab. */
export function selectWeeklyInsights(input: SelectWeeklyInsightsInput): WeeklyInsight[] {
  const stats = selectWeeklyStats(input);
  const bullets: WeeklyInsight[] = [];

  bullets.push(consistencyMessage(stats));

  if (stats.daysLogged === 0) {
    bullets.push(zeroDaysNudge());
    return bullets.slice(0, 3);
  }

  if (stats.daysLogged <= 2) {
    bullets.push(sparseWeekNudge());
    return bullets.slice(0, 3);
  }

  bullets.push(calorieAverageMessage(stats));

  const macro = macroGapMessage(stats);
  if (macro) bullets.push(macro);

  if (bullets.length < 3) {
    const plan = planAdherenceMessage(stats);
    if (plan) bullets.push(plan);
  }

  return bullets.slice(0, 3);
}

/** Hide Plano × Real when there is no plan or planned macros are all zero. */
export function shouldShowWeekComparison(plannedMeals: PlannedMeal[]): boolean {
  if (plannedMeals.length === 0) return false;
  const planned = plannedMeals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
  return planned.protein + planned.carbs + planned.fat > 0;
}
