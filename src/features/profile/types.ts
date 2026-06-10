import type { MacroGoals, UserProfile } from '../../types';

export type ProfileGoal = UserProfile['goal'];

export type UserAccount = UserProfile & {
  id: string;
  displayName: string;
  avatarUri: string | null;
  onboardingComplete: boolean;
  createdAt: string;
  updatedAt: string;
};

export const DEFAULT_DAILY_GOALS: Record<ProfileGoal, MacroGoals> = {
  lose: { calories: 1800, protein: 130, carbs: 160, fat: 55 },
  maintain: { calories: 2100, protein: 140, carbs: 220, fat: 65 },
  gain: { calories: 2600, protein: 160, carbs: 280, fat: 75 },
};

export function createDefaultAccount(): UserAccount {
  const now = new Date().toISOString();
  return {
    id: 'local-user',
    displayName: '',
    avatarUri: null,
    onboardingComplete: false,
    goal: 'maintain',
    restrictions: '',
    dailyGoals: DEFAULT_DAILY_GOALS.maintain,
    createdAt: now,
    updatedAt: now,
  };
}
