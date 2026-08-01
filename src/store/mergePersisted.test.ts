import { describe, expect, it } from 'vitest';
import { createPersonalDayTargetSeed } from '../domain/day-targets';
import { createDefaultAccount, DEFAULT_DAILY_GOALS } from '../features/profile/types';
import {
  mergeDayTargets,
  mergePersistedSlice,
  normalizeDayTargetsFields,
  type PersistedSlice,
} from './mergePersisted';

function baseSlice(overrides: Partial<PersistedSlice> = {}): PersistedSlice {
  return {
    profile: createDefaultAccount(),
    loggedMeals: [],
    plannedMeals: [],
    recipes: [],
    shopping: [],
    mealPlanSummary: null,
    selectedHistoryDate: '2026-08-01',
    dayTypeTemplates: [],
    weeklySchedule: { entries: [] },
    dailyTargetOverrides: [],
    ...overrides,
  };
}

describe('normalizeDayTargetsFields', () => {
  it('usuário antigo sem campos novos → estruturas vazias', () => {
    const normalized = normalizeDayTargetsFields({});
    expect(normalized.dayTypeTemplates).toEqual([]);
    expect(normalized.weeklySchedule).toEqual({ entries: [] });
    expect(normalized.dailyTargetOverrides).toEqual([]);
  });

  it('hydration com templates e agenda', () => {
    const seed = createPersonalDayTargetSeed();
    const normalized = normalizeDayTargetsFields(seed);
    expect(normalized.dayTypeTemplates).toHaveLength(3);
    expect(normalized.weeklySchedule.entries).toHaveLength(7);
  });
});

describe('mergeDayTargets / mergePersistedSlice', () => {
  it('cloud vazio preserva day targets locais', () => {
    const seed = createPersonalDayTargetSeed();
    const local = baseSlice(seed);
    const cloud = baseSlice();
    const merged = mergePersistedSlice(local, cloud);
    expect(merged.dayTypeTemplates).toHaveLength(3);
    expect(merged.weeklySchedule.entries).toHaveLength(7);
    expect(merged.profile.dailyGoals).toEqual(local.profile.dailyGoals);
  });

  it('local vazio recebe cloud com day targets', () => {
    const seed = createPersonalDayTargetSeed();
    const merged = mergeDayTargets(baseSlice(), baseSlice(seed));
    expect(merged.dayTypeTemplates).toHaveLength(3);
  });

  it('não sobrescreve profile.dailyGoals ao mesclar day targets', () => {
    const localGoals = { calories: 2500, protein: 150, carbs: 280, fat: 70 };
    const cloudGoals = DEFAULT_DAILY_GOALS.maintain;
    const local = baseSlice({
      profile: { ...createDefaultAccount(), dailyGoals: localGoals, updatedAt: '2026-08-02T00:00:00.000Z' },
      ...createPersonalDayTargetSeed(),
    });
    const cloud = baseSlice({
      profile: { ...createDefaultAccount(), dailyGoals: cloudGoals, updatedAt: '2026-08-01T00:00:00.000Z' },
    });
    const merged = mergePersistedSlice(local, cloud);
    // cloud dailyGoals.calories > 0 → mergeProfile usa cloud
    expect(merged.profile.dailyGoals).toEqual(cloudGoals);
    // day targets locais preservados
    expect(merged.dayTypeTemplates).toHaveLength(3);
  });

  it('reset equivalente: campos vazios após normalize', () => {
    const empty = normalizeDayTargetsFields({
      dayTypeTemplates: [],
      weeklySchedule: { entries: [] },
      dailyTargetOverrides: [],
    });
    expect(empty).toEqual({
      dayTypeTemplates: [],
      weeklySchedule: { entries: [] },
      dailyTargetOverrides: [],
    });
  });
});
