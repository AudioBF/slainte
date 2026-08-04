import { describe, expect, it } from 'vitest';
import { createPersonalDayTargetSeed } from '../day-targets';
import {
  buildWeeklyMealPlanTargets,
  decideMealPlanCorrection,
  isMultiTargetMealPlanEnabled,
  MEAL_PLAN_TOLERANCE_FIXTURE,
  parseMultiTargetMealPlanFlag,
  validateMealPlanAgainstDailyTargets,
  validateWeeklyMealPlanTargets,
  calorieToleranceKcal,
  proteinToleranceG,
  carbsToleranceG,
  fatToleranceG,
  softBand,
  toV2Request,
} from './index';
import type { MealPlanDayTarget } from './types';

const profileGoals = { calories: 2100, protein: 140, carbs: 239, fat: 65 };

function sevenUniform(goals = profileGoals): MealPlanDayTarget[] {
  return [0, 1, 2, 3, 4, 5, 6].map((dayIndex) => ({
    dayIndex: dayIndex as 0 | 1 | 2 | 3 | 4 | 5 | 6,
    dateISO: `2026-07-${27 + dayIndex}`,
    dailyGoals: { ...goals },
    source: 'profile_default' as const,
  }));
}

describe('parseMultiTargetMealPlanFlag', () => {
  it('OFF por ausência / vazio / false / inválido', () => {
    expect(parseMultiTargetMealPlanFlag(undefined)).toBe(false);
    expect(parseMultiTargetMealPlanFlag(null)).toBe(false);
    expect(parseMultiTargetMealPlanFlag('')).toBe(false);
    expect(parseMultiTargetMealPlanFlag('false')).toBe(false);
    expect(parseMultiTargetMealPlanFlag('TRUE')).toBe(false);
    expect(parseMultiTargetMealPlanFlag('1')).toBe(false);
  });
  it('ON só com "true"', () => {
    expect(parseMultiTargetMealPlanFlag('true')).toBe(true);
  });
});

describe('flag matrix', () => {
  it('multi efetivo só com ambas ON', () => {
    expect(isMultiTargetMealPlanEnabled(false, false)).toBe(false);
    expect(isMultiTargetMealPlanEnabled(true, false)).toBe(false);
    expect(isMultiTargetMealPlanEnabled(false, true)).toBe(false);
    expect(isMultiTargetMealPlanEnabled(true, true)).toBe(true);
  });
});

describe('tolerances', () => {
  it('matches fixture parity values', () => {
    expect(calorieToleranceKcal(3350)).toBe(MEAL_PLAN_TOLERANCE_FIXTURE.examples.calories_3350);
    expect(proteinToleranceG(160)).toBe(MEAL_PLAN_TOLERANCE_FIXTURE.examples.protein_160);
    expect(carbsToleranceG(475)).toBe(MEAL_PLAN_TOLERANCE_FIXTURE.examples.carbs_475);
    expect(fatToleranceG(90)).toBe(MEAL_PLAN_TOLERANCE_FIXTURE.examples.fat_90);
    expect(softBand(100)).toBe(125);
  });
});

describe('validateWeeklyMealPlanTargets', () => {
  it('aceita sete targets ordenáveis', () => {
    const shuffled = sevenUniform().reverse();
    const r = validateWeeklyMealPlanTargets(shuffled);
    expect(r.ok).toBe(true);
    expect(r.sorted?.map((t) => t.dayIndex)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
  it('rejeita incompleto e duplicado', () => {
    expect(validateWeeklyMealPlanTargets(sevenUniform().slice(0, 6)).ok).toBe(false);
    const dup = sevenUniform();
    dup[6] = { ...dup[0] };
    expect(validateWeeklyMealPlanTargets(dup).ok).toBe(false);
  });
  it('não muta input', () => {
    const targets = sevenUniform();
    const before = JSON.stringify(targets);
    validateWeeklyMealPlanTargets(targets);
    expect(JSON.stringify(targets)).toBe(before);
  });
});

describe('buildWeeklyMealPlanTargets', () => {
  const seed = createPersonalDayTargetSeed();
  const base = {
    profile: {
      dailyGoals: profileGoals,
      goal: 'maintain' as const,
      restrictions: '',
    },
    dayTypeTemplates: seed.dayTypeTemplates,
    weeklySchedule: seed.weeklySchedule,
    dailyTargetOverrides: [] as [],
    referenceDateISO: '2026-07-29',
  };

  it('V1 quando flags OFF', () => {
    const r = buildWeeklyMealPlanTargets({
      ...base,
      dayTargetsEnabled: false,
      multiTargetEnabled: false,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.contractVersion).toBe(1);
    expect(r.v1DailyGoals?.calories).toBe(2100);
    expect(r.normalizedTargets.every((t) => t.source === 'flag_off')).toBe(true);
  });

  it('V1 quando DAY ON + MULTI OFF', () => {
    const r = buildWeeklyMealPlanTargets({
      ...base,
      dayTargetsEnabled: true,
      multiTargetEnabled: false,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.contractVersion).toBe(1);
  });

  it('V2 com sete metas pessoais Mon–Sun Dublin', () => {
    const r = buildWeeklyMealPlanTargets({
      ...base,
      dayTargetsEnabled: true,
      multiTargetEnabled: true,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.contractVersion).toBe(2);
    expect(r.normalizedTargets).toHaveLength(7);
    expect(r.normalizedTargets[0].dateISO).toBe('2026-07-27');
    expect(r.normalizedTargets[0].dailyGoals.calories).toBe(3350);
    expect(r.normalizedTargets[1].dailyGoals.calories).toBe(3150);
    expect(r.normalizedTargets[6].dateISO).toBe('2026-08-02');
    const v2 = toV2Request(r, base.profile);
    expect(v2.contractVersion).toBe(2);
    expect(v2.dailyTargets).toHaveLength(7);
  });

  it('domingo referencia semana corrente não a próxima', () => {
    const r = buildWeeklyMealPlanTargets({
      ...base,
      referenceDateISO: '2026-08-02', // domingo
      dayTargetsEnabled: true,
      multiTargetEnabled: true,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.normalizedTargets[0].dateISO).toBe('2026-07-27');
    expect(r.normalizedTargets[6].dateISO).toBe('2026-08-02');
  });

  it('não muta profile.dailyGoals', () => {
    const goals = { ...profileGoals };
    buildWeeklyMealPlanTargets({
      ...base,
      profile: { ...base.profile, dailyGoals: goals },
      dayTargetsEnabled: true,
      multiTargetEnabled: true,
    });
    expect(goals).toEqual(profileGoals);
  });
});

describe('validateMealPlanAgainstDailyTargets', () => {
  const targets = sevenUniform({ calories: 2100, protein: 140, carbs: 239, fat: 65 });

  function mealsNearTarget() {
    return [0, 1, 2, 3, 4, 5, 6].flatMap((dayIndex) =>
      (['breakfast', 'lunch', 'dinner'] as const).map((slot, i) => ({
        dayIndex,
        slot,
        calories: i === 0 ? 500 : i === 1 ? 800 : 800,
        protein: i === 0 ? 30 : 55,
        carbs: i === 0 ? 60 : 90,
        fat: i === 0 ? 15 : 25,
      })),
    );
  }

  it('ok quando próximo da meta com slots obrigatórios', () => {
    const r = validateMealPlanAgainstDailyTargets({
      plannedMeals: mealsNearTarget(),
      dailyTargets: targets,
    });
    expect(r.valid).toBe(true);
    expect(r.severity).toBe('ok');
    expect(decideMealPlanCorrection(r, true)).toBe('accept');
  });

  it('hard se falta slot obrigatório', () => {
    const meals = mealsNearTarget().filter(
      (m) => !(m.dayIndex === 0 && m.slot === 'breakfast'),
    );
    const r = validateMealPlanAgainstDailyTargets({ plannedMeals: meals, dailyTargets: targets });
    expect(r.perDay[0].status).toBe('hard');
    expect(r.shouldRepair || r.shouldRetry).toBe(true);
  });

  it('snack opcional não é obrigatório', () => {
    const r = validateMealPlanAgainstDailyTargets({
      plannedMeals: mealsNearTarget(),
      dailyTargets: targets,
    });
    expect(r.perDay.every((d) => !d.reasons.some((x) => /snack/.test(x)))).toBe(true);
  });

  it('decide repair vs retry', () => {
    const hardOne = validateMealPlanAgainstDailyTargets({
      plannedMeals: mealsNearTarget().filter((m) => m.dayIndex !== 0),
      dailyTargets: targets,
    });
    // day 0 empty = hard; others ok → 1 hard day → repair
    expect(hardOne.invalidDays.length).toBeGreaterThanOrEqual(1);
    if (hardOne.invalidDays.length <= 3) {
      expect(decideMealPlanCorrection(hardOne, true)).toBe('repair_batch');
    }
  });

  it('variedade falha → retry integral (nunca repair)', () => {
    const ok = validateMealPlanAgainstDailyTargets({
      plannedMeals: mealsNearTarget(),
      dailyTargets: targets,
    });
    expect(decideMealPlanCorrection(ok, false)).toBe('retry_full');
  });

  it('>3 dias hard → retry integral', () => {
    const meals = mealsNearTarget().filter((m) => m.dayIndex > 3);
    const r = validateMealPlanAgainstDailyTargets({ plannedMeals: meals, dailyTargets: targets });
    expect(r.invalidDays.length).toBeGreaterThan(3);
    expect(decideMealPlanCorrection(r, true)).toBe('retry_full');
  });
});

describe('Dublin generation week', () => {
  it('domingo usa semana corrente Mon–Sun (não a próxima)', () => {
    const seed = createPersonalDayTargetSeed();
    // 2026-08-02 = domingo da semana 27/jul–02/ago
    const r = buildWeeklyMealPlanTargets({
      profile: {
        dailyGoals: profileGoals,
        goal: 'maintain',
        restrictions: '',
      },
      dayTypeTemplates: seed.dayTypeTemplates,
      weeklySchedule: seed.weeklySchedule,
      dailyTargetOverrides: [],
      referenceDateISO: '2026-08-02',
      dayTargetsEnabled: true,
      multiTargetEnabled: true,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.normalizedTargets[0].dateISO).toBe('2026-07-27');
    expect(r.normalizedTargets[6].dateISO).toBe('2026-08-02');
  });
});
