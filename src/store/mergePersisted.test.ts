import { describe, expect, it } from 'vitest';
import {
  createEmptyDayTargetsState,
  createPersonalDayTargetSeed,
  shouldResetDayTargetsOnUserChange,
} from '../domain/day-targets';
import { createDefaultAccount, DEFAULT_DAILY_GOALS } from '../features/profile/types';
import {
  mergeDayTargets,
  mergePersistedSlice,
  mergeWithLegacyCloudSync,
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

  it('undefined / null / tipos inválidos não quebram', () => {
    expect(normalizeDayTargetsFields(undefined).dayTypeTemplates).toEqual([]);
    expect(
      normalizeDayTargetsFields({
        dayTypeTemplates: null as unknown as [],
        weeklySchedule: 'bad' as unknown as { entries: [] },
        dailyTargetOverrides: undefined,
      }).weeklySchedule.entries,
    ).toEqual([]);
  });

  it('descarta entradas parcialmente inválidas e mantém válidas', () => {
    const normalized = normalizeDayTargetsFields({
      dayTypeTemplates: [
        null,
        { id: 'x' },
        {
          id: 'ok',
          code: 'rest',
          label: 'Ok',
          dailyGoals: { calories: 2000, protein: 100, carbs: 200, fat: 60 },
          isActive: true,
        },
      ] as unknown as PersistedSlice['dayTypeTemplates'],
      weeklySchedule: {
        entries: [
          { weekday: 0, templateId: 'ok' },
          { weekday: 99, templateId: 'ok' },
          { weekday: 1 },
        ] as unknown as PersistedSlice['weeklySchedule']['entries'],
      },
      dailyTargetOverrides: [
        {
          dateISO: '2026-08-01',
          dailyGoals: { calories: 2100, protein: 140, carbs: 239, fat: 65 },
          source: 'date_override',
        },
        { dateISO: 'bad' },
      ] as unknown as PersistedSlice['dailyTargetOverrides'],
    });
    expect(normalized.dayTypeTemplates).toHaveLength(1);
    expect(normalized.dayTypeTemplates[0].id).toBe('ok');
    expect(normalized.weeklySchedule.entries).toEqual([{ weekday: 0, templateId: 'ok' }]);
    expect(normalized.dailyTargetOverrides).toHaveLength(1);
  });

  it('hydration com templates e agenda', () => {
    const seed = createPersonalDayTargetSeed();
    const normalized = normalizeDayTargetsFields(seed);
    expect(normalized.dayTypeTemplates).toHaveLength(3);
    expect(normalized.weeklySchedule.entries).toHaveLength(7);
  });
});

describe('mergeDayTargets / legacy cloud pull', () => {
  it('user_sync antigo preserva day targets locais e não semeia', () => {
    const seed = createPersonalDayTargetSeed();
    const localGoals = { calories: 2500, protein: 150, carbs: 280, fat: 70 };
    const local = baseSlice({
      profile: {
        ...createDefaultAccount(),
        dailyGoals: localGoals,
        updatedAt: '2026-08-02T12:00:00.000Z',
      },
      ...seed,
    });
    const cloudLegacy = {
      profile: {
        ...createDefaultAccount(),
        dailyGoals: DEFAULT_DAILY_GOALS.maintain,
        updatedAt: '2026-08-03T12:00:00.000Z',
      },
      loggedMeals: [],
      plannedMeals: [],
      recipes: [],
      shopping: [],
      mealPlanSummary: null as string | null,
      selectedHistoryDate: '2026-08-03',
    };

    const merged = mergeWithLegacyCloudSync(local, cloudLegacy);

    expect(merged.dayTypeTemplates).toHaveLength(3);
    expect(merged.weeklySchedule.entries).toHaveLength(7);
    expect(merged.dailyTargetOverrides).toEqual([]);
    // mergeProfile continua a preferir cloud dailyGoals quando calories > 0 (pré-existente)
    expect(merged.profile.dailyGoals).toEqual(DEFAULT_DAILY_GOALS.maintain);
    // não cria seed automaticamente a partir do vazio
    const emptyLocal = mergeWithLegacyCloudSync(baseSlice(), cloudLegacy);
    expect(emptyLocal.dayTypeTemplates).toEqual([]);
    expect(emptyLocal.weeklySchedule.entries).toEqual([]);
  });

  it('cloud vazio preserva day targets locais', () => {
    const seed = createPersonalDayTargetSeed();
    const merged = mergePersistedSlice(baseSlice(seed), baseSlice());
    expect(merged.dayTypeTemplates).toHaveLength(3);
    expect(merged.weeklySchedule.entries).toHaveLength(7);
  });

  it('local vazio recebe cloud com day targets', () => {
    const seed = createPersonalDayTargetSeed();
    const merged = mergeDayTargets(baseSlice(), baseSlice(seed));
    expect(merged.dayTypeTemplates).toHaveLength(3);
  });
});

describe('shouldResetDayTargetsOnUserChange', () => {
  it('não reseta no primeiro utilizador; reseta na troca', () => {
    expect(shouldResetDayTargetsOnUserChange(null, 'user-a')).toBe(false);
    expect(shouldResetDayTargetsOnUserChange('user-a', 'user-a')).toBe(false);
    expect(shouldResetDayTargetsOnUserChange('user-a', 'user-b')).toBe(true);
  });
});

describe('createEmptyDayTargetsState (resetDayTargets payload)', () => {
  it('limpa templates/agenda/overrides com refs novas a cada chamada', () => {
    const a = createEmptyDayTargetsState();
    const b = createEmptyDayTargetsState();
    expect(a).toEqual({
      dayTypeTemplates: [],
      weeklySchedule: { entries: [] },
      dailyTargetOverrides: [],
    });
    expect(a).not.toBe(b);
    expect(a.dayTypeTemplates).not.toBe(b.dayTypeTemplates);
    expect(a.weeklySchedule).not.toBe(b.weeklySchedule);
    expect(a.weeklySchedule.entries).not.toBe(b.weeklySchedule.entries);
    expect(a.dailyTargetOverrides).not.toBe(b.dailyTargetOverrides);
  });

  it('merge com reset local não toca profile/meals de um slice rico', () => {
    const seed = createPersonalDayTargetSeed();
    const local = baseSlice({
      ...seed,
      loggedMeals: [
        {
          id: 'm1',
          date: '2026-08-01',
          slot: 'lunch',
          name: 'Almoço',
          components: [],
        },
      ],
      profile: {
        ...createDefaultAccount(),
        dailyGoals: { calories: 2222, protein: 111, carbs: 222, fat: 55 },
      },
    });
    const afterReset = {
      ...local,
      ...createEmptyDayTargetsState(),
    };
    expect(afterReset.dayTypeTemplates).toEqual([]);
    expect(afterReset.loggedMeals).toHaveLength(1);
    expect(afterReset.profile.dailyGoals.calories).toBe(2222);
  });
});
