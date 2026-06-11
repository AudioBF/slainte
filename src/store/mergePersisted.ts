import type { UserAccount } from '../features/profile/types';
import type { LoggedMeal, PlannedMeal, Recipe, ShoppingItem } from '../types';

export type PersistedSlice = {
  profile: UserAccount;
  loggedMeals: LoggedMeal[];
  plannedMeals: PlannedMeal[];
  recipes: Recipe[];
  shopping: ShoppingItem[];
  mealPlanSummary: string | null;
  selectedHistoryDate: string;
};

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

export function hasPersistedData(slice: Pick<PersistedSlice, 'loggedMeals' | 'plannedMeals' | 'recipes' | 'shopping'>) {
  return (
    slice.loggedMeals.length > 0 ||
    slice.plannedMeals.length > 0 ||
    slice.recipes.length > 0 ||
    slice.shopping.length > 0
  );
}

export function mergePersistedSlice(local: PersistedSlice, cloud: PersistedSlice): PersistedSlice {
  return {
    profile: mergeProfile(local.profile, cloud.profile),
    loggedMeals: pickRicherArray(local.loggedMeals, cloud.loggedMeals),
    plannedMeals: pickRicherArray(local.plannedMeals, cloud.plannedMeals),
    recipes: pickRicherArray(local.recipes, cloud.recipes),
    shopping: pickRicherArray(local.shopping, cloud.shopping),
    mealPlanSummary: cloud.mealPlanSummary ?? local.mealPlanSummary,
    selectedHistoryDate: cloud.selectedHistoryDate || local.selectedHistoryDate,
  };
}
