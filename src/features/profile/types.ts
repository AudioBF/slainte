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

/**
 * Defaults Atwater-coerentes (P×4 + C×4 + G×9 ≈ calorias, tolerância ≤5 kcal).
 * Carboidratos derivados da meta calórica mantendo proteína e gordura do desenho original.
 * Não migra automaticamente metas já persistidas pelo usuário.
 */
export const DEFAULT_DAILY_GOALS: Record<ProfileGoal, MacroGoals> = {
  lose: { calories: 1800, protein: 130, carbs: 196, fat: 55 },
  maintain: { calories: 2100, protein: 140, carbs: 239, fat: 65 },
  gain: { calories: 2600, protein: 160, carbs: 321, fat: 75 },
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
