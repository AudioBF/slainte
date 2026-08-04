import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPersonalDayTargetSeed } from '../../domain/day-targets';
import { MULTI_TARGET_REQUIRES_EDGE_MESSAGE } from './generate-meal-plan';

vi.mock('../../lib/env', () => ({
  env: {
    aiMock: true,
    useEdgeMealPlan: false,
    useDayTargets: false,
    useMultiTargetMealPlan: false,
    geminiApiKey: '',
  },
  hasGeminiKey: () => false,
}));

import { env } from '../../lib/env';
import { generateMealPlan } from './generate-meal-plan';

const seed = createPersonalDayTargetSeed();
const profile = {
  goal: 'maintain' as const,
  restrictions: '',
  dailyGoals: { calories: 2100, protein: 140, carbs: 239, fat: 65 },
};

describe('generateMealPlan multi-target', () => {
  beforeEach(() => {
    (env as { aiMock: boolean }).aiMock = true;
    (env as { useEdgeMealPlan: boolean }).useEdgeMealPlan = false;
    (env as { useDayTargets: boolean }).useDayTargets = false;
    (env as { useMultiTargetMealPlan: boolean }).useMultiTargetMealPlan = false;
  });

  it('V1 com flags OFF — sem dailyTargets no contrato efetivo', async () => {
    const result = await generateMealPlan(profile, {
      dayTargetsEnabled: false,
      multiTargetEnabled: false,
      dayTypeTemplates: seed.dayTypeTemplates,
      weeklySchedule: seed.weeklySchedule,
      dailyTargetOverrides: [],
    });
    expect(result.contractVersion).toBe(1);
    expect(result.v2Request).toBeUndefined();
    expect(result.plannedMeals.length).toBeGreaterThan(0);
    expect(result.generationMeta?.contractVersion).toBe(1);
  });

  it('DAY ON + MULTI OFF permanece V1', async () => {
    const result = await generateMealPlan(profile, {
      dayTargetsEnabled: true,
      multiTargetEnabled: false,
      dayTypeTemplates: seed.dayTypeTemplates,
      weeklySchedule: seed.weeklySchedule,
      dailyTargetOverrides: [],
      referenceDateISO: '2026-07-29',
    });
    expect(result.contractVersion).toBe(1);
    expect(result.v2Request).toBeUndefined();
  });

  it('V2 mock com ambas ON — sete targets e snapshot', async () => {
    (env as { aiMock: boolean }).aiMock = true;
    const result = await generateMealPlan(profile, {
      dayTargetsEnabled: true,
      multiTargetEnabled: true,
      dayTypeTemplates: seed.dayTypeTemplates,
      weeklySchedule: seed.weeklySchedule,
      dailyTargetOverrides: [],
      referenceDateISO: '2026-07-29',
    });
    expect(result.contractVersion).toBe(2);
    expect(result.v2Request?.dailyTargets).toHaveLength(7);
    expect(result.v2Request?.dailyTargets[0].dayIndex).toBe(0);
    expect(result.v2Request?.dailyTargets[6].dayIndex).toBe(6);
    expect(result.generationMeta?.contractVersion).toBe(2);
    expect(result.generationMeta?.perDay).toHaveLength(7);
    // Segunda = trabalho longo
    expect(result.v2Request?.dailyTargets[0].dailyGoals.calories).toBe(3350);
  });

  it('V2 sem Edge e sem mock → erro controlado', async () => {
    (env as { aiMock: boolean }).aiMock = false;
    (env as { useEdgeMealPlan: boolean }).useEdgeMealPlan = false;
    await expect(
      generateMealPlan(profile, {
        dayTargetsEnabled: true,
        multiTargetEnabled: true,
        dayTypeTemplates: seed.dayTypeTemplates,
        weeklySchedule: seed.weeklySchedule,
        dailyTargetOverrides: [],
        referenceDateISO: '2026-07-29',
      }),
    ).rejects.toThrow(MULTI_TARGET_REQUIRES_EDGE_MESSAGE);
  });
});
