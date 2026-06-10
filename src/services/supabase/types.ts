import type { UserAccount } from '../../features/profile/types';
import type { LoggedMeal, PlannedMeal, Recipe, ShoppingItem } from '../../types';

export type CloudProfileRow = {
  id: string;
  display_name: string;
  avatar_uri: string | null;
  goal: UserAccount['goal'];
  restrictions: string;
  daily_goals: UserAccount['dailyGoals'];
  onboarding_complete: boolean;
  updated_at: string;
};

export type CloudSyncRow = {
  user_id: string;
  logged_meals: LoggedMeal[];
  planned_meals: PlannedMeal[];
  recipes: Recipe[];
  shopping: ShoppingItem[];
  meal_plan_summary: string | null;
  selected_history_date: string;
  updated_at: string;
};

export type CloudSnapshot = {
  profile: UserAccount;
  loggedMeals: LoggedMeal[];
  plannedMeals: PlannedMeal[];
  recipes: Recipe[];
  shopping: ShoppingItem[];
  mealPlanSummary: string | null;
  selectedHistoryDate: string;
  updatedAt: string;
};

export function profileToRow(profile: UserAccount): Omit<CloudProfileRow, 'updated_at'> {
  return {
    id: profile.id,
    display_name: profile.displayName,
    avatar_uri: profile.avatarUri,
    goal: profile.goal,
    restrictions: profile.restrictions,
    daily_goals: profile.dailyGoals,
    onboarding_complete: profile.onboardingComplete,
  };
}

export function rowToProfile(row: CloudProfileRow): UserAccount {
  return {
    id: row.id,
    displayName: row.display_name,
    avatarUri: row.avatar_uri,
    goal: row.goal,
    restrictions: row.restrictions,
    dailyGoals: row.daily_goals,
    onboardingComplete: row.onboarding_complete,
    createdAt: row.updated_at,
    updatedAt: row.updated_at,
  };
}

export function syncRowToSnapshot(row: CloudSyncRow, profile: UserAccount): CloudSnapshot {
  return {
    profile,
    loggedMeals: row.logged_meals ?? [],
    plannedMeals: row.planned_meals ?? [],
    recipes: row.recipes ?? [],
    shopping: row.shopping ?? [],
    mealPlanSummary: row.meal_plan_summary,
    selectedHistoryDate: row.selected_history_date,
    updatedAt: row.updated_at,
  };
}
