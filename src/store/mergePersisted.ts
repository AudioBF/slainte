import {
  createEmptyDayTargetsState,
  type DailyNutritionTarget,
  type DayTypeTemplate,
  type WeeklySchedule,
  type WeeklyScheduleEntry,
  type Weekday,
} from '../domain/day-targets';
import type { UserAccount } from '../features/profile/types';
import type { LoggedMeal, MacroGoals, PlannedMeal, Recipe, ShoppingItem } from '../types';

export type PersistedSlice = {
  profile: UserAccount;
  loggedMeals: LoggedMeal[];
  plannedMeals: PlannedMeal[];
  recipes: Recipe[];
  shopping: ShoppingItem[];
  mealPlanSummary: string | null;
  selectedHistoryDate: string;
  dayTypeTemplates: DayTypeTemplate[];
  weeklySchedule: WeeklySchedule;
  dailyTargetOverrides: DailyNutritionTarget[];
};

function isMacroGoals(value: unknown): value is MacroGoals {
  if (!value || typeof value !== 'object') return false;
  const g = value as MacroGoals;
  return (
    Number.isFinite(g.calories) &&
    Number.isFinite(g.protein) &&
    Number.isFinite(g.carbs) &&
    Number.isFinite(g.fat)
  );
}

function normalizeTemplate(raw: unknown): DayTypeTemplate | null {
  if (!raw || typeof raw !== 'object') return null;
  const t = raw as Partial<DayTypeTemplate>;
  if (typeof t.id !== 'string' || !t.id.trim()) return null;
  if (typeof t.code !== 'string') return null;
  if (!isMacroGoals(t.dailyGoals)) return null;
  return {
    id: t.id,
    code: t.code as DayTypeTemplate['code'],
    label: typeof t.label === 'string' ? t.label : '',
    description: typeof t.description === 'string' ? t.description : undefined,
    dailyGoals: {
      calories: t.dailyGoals.calories,
      protein: t.dailyGoals.protein,
      carbs: t.dailyGoals.carbs,
      fat: t.dailyGoals.fat,
    },
    isActive: Boolean(t.isActive),
  };
}

function normalizeScheduleEntry(raw: unknown): WeeklyScheduleEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const e = raw as Partial<WeeklyScheduleEntry>;
  if (typeof e.templateId !== 'string' || !e.templateId.trim()) return null;
  if (typeof e.weekday !== 'number' || e.weekday < 0 || e.weekday > 6) return null;
  if (!Number.isInteger(e.weekday)) return null;
  return {
    weekday: e.weekday as Weekday,
    templateId: e.templateId,
  };
}

function normalizeOverride(raw: unknown): DailyNutritionTarget | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Partial<DailyNutritionTarget>;
  if (typeof o.dateISO !== 'string' || !o.dateISO.trim()) return null;
  if (!isMacroGoals(o.dailyGoals)) return null;
  if (
    o.source !== 'date_override' &&
    o.source !== 'weekly_schedule' &&
    o.source !== 'profile_default' &&
    o.source !== 'flag_off'
  ) {
    return null;
  }
  return {
    dateISO: o.dateISO,
    dailyGoals: {
      calories: o.dailyGoals.calories,
      protein: o.dailyGoals.protein,
      carbs: o.dailyGoals.carbs,
      fat: o.dailyGoals.fat,
    },
    templateId: o.templateId ?? null,
    source: o.source,
    note: typeof o.note === 'string' ? o.note : undefined,
  };
}

export function normalizeWeeklySchedule(value: unknown): WeeklySchedule {
  if (!value || typeof value !== 'object') {
    return { entries: [] };
  }
  const schedule = value as WeeklySchedule;
  const entries = Array.isArray(schedule.entries)
    ? schedule.entries
        .map(normalizeScheduleEntry)
        .filter((entry): entry is WeeklyScheduleEntry => entry != null)
    : [];
  const normalized: WeeklySchedule = { entries };
  if (typeof schedule.effectiveFrom === 'string') {
    normalized.effectiveFrom = schedule.effectiveFrom;
  }
  return normalized;
}

/**
 * Normaliza campos day-targets para hydration segura.
 * Ausência / undefined / tipos inválidos → estruturas vazias (nunca throw).
 */
export function normalizeDayTargetsFields(
  partial: Partial<PersistedSlice> | null | undefined,
): Pick<PersistedSlice, 'dayTypeTemplates' | 'weeklySchedule' | 'dailyTargetOverrides'> {
  const empty = createEmptyDayTargetsState();
  return {
    dayTypeTemplates: Array.isArray(partial?.dayTypeTemplates)
      ? partial!.dayTypeTemplates
          .map(normalizeTemplate)
          .filter((t): t is DayTypeTemplate => t != null)
      : empty.dayTypeTemplates,
    weeklySchedule: normalizeWeeklySchedule(partial?.weeklySchedule),
    dailyTargetOverrides: Array.isArray(partial?.dailyTargetOverrides)
      ? partial!.dailyTargetOverrides
          .map(normalizeOverride)
          .filter((o): o is DailyNutritionTarget => o != null)
      : empty.dailyTargetOverrides,
  };
}

export function mergeProfile(local: UserAccount, cloud: UserAccount): UserAccount {
  const cloudName = cloud.displayName?.trim() ?? '';
  const localName = local.displayName?.trim() ?? '';

  return {
    ...local,
    ...cloud,
    displayName: cloudName || localName,
    avatarUri: cloud.avatarUri ?? local.avatarUri,
    onboardingComplete: cloud.onboardingComplete || local.onboardingComplete,
    goal: cloud.goal ?? local.goal,
    restrictions: cloud.restrictions?.trim() ? cloud.restrictions : local.restrictions,
    dailyGoals: cloud.dailyGoals?.calories > 0 ? cloud.dailyGoals : local.dailyGoals,
    createdAt: local.createdAt || cloud.createdAt,
    updatedAt:
      new Date(cloud.updatedAt).getTime() > new Date(local.updatedAt).getTime()
        ? cloud.updatedAt
        : local.updatedAt,
  };
}

export function pickRicherArray<T>(local: T[], cloud: T[]): T[] {
  if (cloud.length === 0) return local;
  if (local.length === 0) return cloud;
  return cloud.length >= local.length ? cloud : local;
}

export function mergeRecipes(local: Recipe[], cloud: Recipe[]): Recipe[] {
  const byId = new Map<string, Recipe>();
  for (const recipe of cloud) byId.set(recipe.id, recipe);
  for (const recipe of local) byId.set(recipe.id, recipe);
  return Array.from(byId.values());
}

export function mergePlannedMeals(local: PlannedMeal[], cloud: PlannedMeal[]): PlannedMeal[] {
  if (cloud.length === 0) return local;
  if (local.length === 0) return cloud;

  const base = cloud.length >= local.length ? cloud : local;
  const other = base === cloud ? local : cloud;
  const otherById = new Map(other.map((meal) => [meal.id, meal]));

  return base.map((meal) => {
    const counterpart = otherById.get(meal.id);
    if (!counterpart) return meal;
    const recipeId = meal.recipeId ?? counterpart.recipeId;
    return recipeId && recipeId !== meal.recipeId ? { ...meal, recipeId } : meal;
  });
}

function dayTargetsWeight(slice: Pick<PersistedSlice, 'dayTypeTemplates' | 'weeklySchedule' | 'dailyTargetOverrides'>) {
  return (
    slice.dayTypeTemplates.length +
    slice.weeklySchedule.entries.length +
    slice.dailyTargetOverrides.length
  );
}

/**
 * Merge de metas por tipo de dia.
 * Cloud sem campos (schema atual / user_sync antigo) → preserva local.
 * Templates: union por id (local vence conflito).
 * Não executa seed pessoal.
 */
export function mergeDayTargets(
  local: Pick<PersistedSlice, 'dayTypeTemplates' | 'weeklySchedule' | 'dailyTargetOverrides'>,
  cloud: Pick<PersistedSlice, 'dayTypeTemplates' | 'weeklySchedule' | 'dailyTargetOverrides'>,
): Pick<PersistedSlice, 'dayTypeTemplates' | 'weeklySchedule' | 'dailyTargetOverrides'> {
  const localNorm = normalizeDayTargetsFields(local);
  const cloudNorm = normalizeDayTargetsFields(cloud);

  if (dayTargetsWeight(cloudNorm) === 0) {
    return localNorm;
  }
  if (dayTargetsWeight(localNorm) === 0) {
    return cloudNorm;
  }

  const byId = new Map<string, DayTypeTemplate>();
  for (const template of cloudNorm.dayTypeTemplates) byId.set(template.id, template);
  for (const template of localNorm.dayTypeTemplates) byId.set(template.id, template);

  return {
    dayTypeTemplates: Array.from(byId.values()),
    weeklySchedule:
      cloudNorm.weeklySchedule.entries.length >= localNorm.weeklySchedule.entries.length
        ? cloudNorm.weeklySchedule
        : localNorm.weeklySchedule,
    dailyTargetOverrides: pickRicherArray(
      localNorm.dailyTargetOverrides,
      cloudNorm.dailyTargetOverrides,
    ),
  };
}

export function hasPersistedData(slice: Pick<PersistedSlice, 'loggedMeals' | 'plannedMeals' | 'recipes' | 'shopping'>) {
  return (
    slice.loggedMeals.length > 0 ||
    slice.plannedMeals.length > 0 ||
    slice.recipes.length > 0 ||
    slice.shopping.length > 0
  );
}

export function mergePersistedSlice(local: PersistedSlice, cloud: PersistedSlice): PersistedSlice {
  const dayTargets = mergeDayTargets(local, cloud);
  return {
    profile: mergeProfile(local.profile, cloud.profile),
    loggedMeals: pickRicherArray(local.loggedMeals, cloud.loggedMeals),
    plannedMeals: mergePlannedMeals(local.plannedMeals, cloud.plannedMeals),
    recipes: mergeRecipes(local.recipes, cloud.recipes),
    shopping: pickRicherArray(local.shopping, cloud.shopping),
    mealPlanSummary: cloud.mealPlanSummary ?? local.mealPlanSummary,
    selectedHistoryDate: cloud.selectedHistoryDate || local.selectedHistoryDate,
    ...dayTargets,
  };
}

/**
 * Simula merge de um `user_sync` antigo (sem colunas day-targets).
 * Usado por sync.ts e testes de compatibilidade.
 */
export function mergeWithLegacyCloudSync(
  local: PersistedSlice,
  cloudWithoutDayTargets: Omit<
    PersistedSlice,
    'dayTypeTemplates' | 'weeklySchedule' | 'dailyTargetOverrides'
  >,
): PersistedSlice {
  return mergePersistedSlice(local, {
    ...cloudWithoutDayTargets,
    ...createEmptyDayTargetsState(),
  });
}
