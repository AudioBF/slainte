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
    plannedMeals: mergePlannedMeals(local.plannedMeals, cloud.plannedMeals),
    recipes: mergeRecipes(local.recipes, cloud.recipes),
    shopping: pickRicherArray(local.shopping, cloud.shopping),
    mealPlanSummary: cloud.mealPlanSummary ?? local.mealPlanSummary,
    selectedHistoryDate: cloud.selectedHistoryDate || local.selectedHistoryDate,
  };
}
