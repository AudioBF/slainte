import { describe, expect, it } from 'vitest';
import { validateMacroCalorieConsistency } from '../nutrition-targets';
import { createPersonalDayTargetSeed } from './createPersonalDayTargetSeed';
import { getDublinDateISO, isValidCivilDateISO } from './getDublinDateISO';
import { getDublinWeekday, jsDayToWeekday } from './getDublinWeekday';
import { getEffectiveTargetForDate } from './getEffectiveTargetForDate';
import { parseDayTargetsFlag } from './parseDayTargetsFlag';
import {
  cloneMacroGoals,
  type DayTypeTemplate,
  type WeeklySchedule,
} from './types';
import { validateDayTargetsConfig } from './validateDayTypeTemplate';

const legacy = { calories: 2100, protein: 140, carbs: 239, fat: 65 };

const activeLong: DayTypeTemplate = {
  id: 'tpl-long',
  code: 'work_long_bike',
  label: 'Longo',
  dailyGoals: { calories: 3350, protein: 160, carbs: 475, fat: 90 },
  isActive: true,
};

const activeStrength: DayTypeTemplate = {
  id: 'tpl-strength',
  code: 'strength_training',
  label: 'Força',
  dailyGoals: { calories: 3150, protein: 160, carbs: 448, fat: 80 },
  isActive: true,
};

function fullSchedule(templateId: string): WeeklySchedule {
  return {
    entries: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
      weekday: weekday as 0 | 1 | 2 | 3 | 4 | 5 | 6,
      templateId,
    })),
  };
}

describe('parseDayTargetsFlag', () => {
  it('OFF por ausência / vazio / false / inválido', () => {
    expect(parseDayTargetsFlag(undefined)).toBe(false);
    expect(parseDayTargetsFlag(null)).toBe(false);
    expect(parseDayTargetsFlag('')).toBe(false);
    expect(parseDayTargetsFlag('false')).toBe(false);
    expect(parseDayTargetsFlag('TRUE')).toBe(false);
    expect(parseDayTargetsFlag('1')).toBe(false);
    expect(parseDayTargetsFlag('yes')).toBe(false);
    expect(parseDayTargetsFlag('on')).toBe(false);
  });

  it('ON somente com string exata "true"', () => {
    expect(parseDayTargetsFlag('true')).toBe(true);
  });
});

describe('Dublin civil date', () => {
  it('inverno: UTC e Dublin alinhados perto da meia-noite', () => {
    expect(getDublinDateISO(new Date('2026-01-15T00:30:00.000Z'))).toBe('2026-01-15');
    expect(getDublinDateISO(new Date('2025-12-31T23:30:00.000Z'))).toBe('2025-12-31');
  });

  it('verão: UTC ainda no dia anterior enquanto Dublin já virou', () => {
    // IST = UTC+1 → 23:30Z = 00:30 Dublin no dia seguinte
    expect(getDublinDateISO(new Date('2026-07-01T23:30:00.000Z'))).toBe('2026-07-02');
    expect(getDublinDateISO(new Date('2026-07-01T22:30:00.000Z'))).toBe('2026-07-01');
  });

  it('não usa toISOString para o dia civil', () => {
    const instant = new Date('2026-07-01T23:30:00.000Z');
    expect(instant.toISOString().slice(0, 10)).toBe('2026-07-01');
    expect(getDublinDateISO(instant)).toBe('2026-07-02');
  });

  it('weekday segunda=0 … domingo=6', () => {
    // 2026-08-03 = segunda … 2026-08-09 = domingo
    expect(getDublinWeekday('2026-08-03')).toBe(0);
    expect(getDublinWeekday('2026-08-04')).toBe(1);
    expect(getDublinWeekday('2026-08-05')).toBe(2);
    expect(getDublinWeekday('2026-08-06')).toBe(3);
    expect(getDublinWeekday('2026-08-07')).toBe(4);
    expect(getDublinWeekday('2026-08-08')).toBe(5);
    expect(getDublinWeekday('2026-08-09')).toBe(6);
    expect(jsDayToWeekday(0)).toBe(6);
    expect(jsDayToWeekday(1)).toBe(0);
  });

  it('semana atravessando mês e ano', () => {
    expect(getDublinWeekday('2026-03-30')).toBe(0); // segunda
    expect(getDublinWeekday('2026-04-01')).toBe(2); // quarta
    expect(getDublinWeekday('2025-12-29')).toBe(0); // segunda
    expect(getDublinWeekday('2026-01-04')).toBe(6); // domingo
  });

  it('valida datas civis', () => {
    expect(isValidCivilDateISO('2026-02-28')).toBe(true);
    expect(isValidCivilDateISO('2026-02-29')).toBe(false);
    expect(isValidCivilDateISO('2024-02-29')).toBe(true);
    expect(isValidCivilDateISO('not-a-date')).toBe(false);
  });
});

describe('getEffectiveTargetForDate', () => {
  it('flag OFF ignora agenda, templates e overrides', () => {
    const result = getEffectiveTargetForDate({
      dateISO: '2026-08-03',
      flagEnabled: false,
      legacyDailyGoals: legacy,
      templates: [activeLong],
      weeklySchedule: fullSchedule('tpl-long'),
      dateOverrides: [
        {
          dateISO: '2026-08-03',
          dailyGoals: { calories: 4000, protein: 200, carbs: 400, fat: 100 },
          source: 'date_override',
        },
      ],
    });
    expect(result.target.source).toBe('flag_off');
    expect(result.target.dailyGoals).toEqual(legacy);
    expect(result.target.templateId).toBeNull();
  });

  it('flag OFF com configuração inválida ainda retorna legacy goals', () => {
    const result = getEffectiveTargetForDate({
      dateISO: '2026-08-03',
      flagEnabled: false,
      legacyDailyGoals: legacy,
      templates: [activeLong, { ...activeLong, label: 'dup' }],
      weeklySchedule: {
        entries: [
          { weekday: 0, templateId: 'tpl-long' },
          { weekday: 0, templateId: 'tpl-strength' },
        ],
      },
      dateOverrides: [
        {
          dateISO: '2026-08-03',
          dailyGoals: { calories: 9999, protein: 1, carbs: 1, fat: 1 },
          source: 'date_override',
        },
        {
          dateISO: '2026-08-03',
          dailyGoals: { calories: 8888, protein: 1, carbs: 1, fat: 1 },
          source: 'date_override',
        },
      ],
    });
    expect(result.target.source).toBe('flag_off');
    expect(result.target.dailyGoals).toEqual(legacy);
    expect(result.target.dailyGoals).not.toBe(legacy);
  });

  it('override vence agenda', () => {
    const overrideGoals = { calories: 2800, protein: 150, carbs: 300, fat: 80 };
    const result = getEffectiveTargetForDate({
      dateISO: '2026-08-03',
      flagEnabled: true,
      legacyDailyGoals: legacy,
      templates: [activeLong],
      weeklySchedule: fullSchedule('tpl-long'),
      dateOverrides: [
        {
          dateISO: '2026-08-03',
          dailyGoals: overrideGoals,
          source: 'date_override',
        },
      ],
    });
    expect(result.target.source).toBe('date_override');
    expect(result.target.dailyGoals).toEqual(overrideGoals);
  });

  it('agenda vence fallback legado', () => {
    const result = getEffectiveTargetForDate({
      dateISO: '2026-08-04', // terça = 1
      flagEnabled: true,
      legacyDailyGoals: legacy,
      templates: [activeLong, activeStrength],
      weeklySchedule: {
        entries: [{ weekday: 1, templateId: 'tpl-strength' }],
      },
      dateOverrides: [],
    });
    expect(result.target.source).toBe('weekly_schedule');
    expect(result.target.templateId).toBe('tpl-strength');
    expect(result.target.dayTypeCode).toBe('strength_training');
    expect(result.target.dailyGoals).toEqual(activeStrength.dailyGoals);
  });

  it('template ausente / inativo / agenda incompleta → fallback', () => {
    const missing = getEffectiveTargetForDate({
      dateISO: '2026-08-03',
      flagEnabled: true,
      legacyDailyGoals: legacy,
      templates: [],
      weeklySchedule: { entries: [{ weekday: 0, templateId: 'missing' }] },
      dateOverrides: [],
    });
    expect(missing.configStatus).toBe('missing_template');
    expect(missing.target.source).toBe('profile_default');

    const inactive = getEffectiveTargetForDate({
      dateISO: '2026-08-03',
      flagEnabled: true,
      legacyDailyGoals: legacy,
      templates: [{ ...activeLong, isActive: false }],
      weeklySchedule: { entries: [{ weekday: 0, templateId: 'tpl-long' }] },
      dateOverrides: [],
    });
    expect(inactive.configStatus).toBe('inactive_template');
    expect(inactive.target.source).toBe('profile_default');

    const incomplete = getEffectiveTargetForDate({
      dateISO: '2026-08-03',
      flagEnabled: true,
      legacyDailyGoals: legacy,
      templates: [activeLong],
      weeklySchedule: { entries: [] },
      dateOverrides: [],
    });
    expect(incomplete.target.source).toBe('profile_default');
    expect(incomplete.target.dailyGoals).toEqual(legacy);
  });

  it('override sem template usa dailyGoals próprios', () => {
    const goals = { calories: 3000, protein: 160, carbs: 400, fat: 80 };
    const result = getEffectiveTargetForDate({
      dateISO: '2026-08-03',
      flagEnabled: true,
      legacyDailyGoals: legacy,
      templates: [],
      weeklySchedule: { entries: [] },
      dateOverrides: [
        { dateISO: '2026-08-03', dailyGoals: goals, source: 'date_override' },
      ],
    });
    expect(result.target.source).toBe('date_override');
    expect(result.target.dailyGoals).toEqual(goals);
    expect(result.target.templateId).toBeNull();
  });

  it('isConsistent e source/template corretos; não muta inputs', () => {
    const templates = [activeLong];
    const schedule = fullSchedule('tpl-long');
    const templatesCopy = structuredClone(templates);
    const scheduleCopy = structuredClone(schedule);
    const legacyCopy = structuredClone(legacy);

    const result = getEffectiveTargetForDate({
      dateISO: '2026-08-03',
      flagEnabled: true,
      legacyDailyGoals: legacy,
      templates,
      weeklySchedule: schedule,
      dateOverrides: [],
    });

    expect(result.target.isConsistent).toBe(
      validateMacroCalorieConsistency({
        targetCalories: 3350,
        proteinGrams: 160,
        carbsGrams: 475,
        fatGrams: 90,
      }).isConsistent,
    );
    expect(result.target.source).toBe('weekly_schedule');
    expect(result.target.templateId).toBe('tpl-long');
    expect(result.target.dayTypeCode).toBe('work_long_bike');
    expect(templates).toEqual(templatesCopy);
    expect(schedule).toEqual(scheduleCopy);
    expect(legacy).toEqual(legacyCopy);
    expect(result.target.dailyGoals).not.toBe(activeLong.dailyGoals);
  });

  it('data inválida retorna resultado seguro tipado', () => {
    const result = getEffectiveTargetForDate({
      dateISO: '2026-13-40',
      flagEnabled: true,
      legacyDailyGoals: legacy,
      templates: [activeLong],
      weeklySchedule: fullSchedule('tpl-long'),
      dateOverrides: [],
    });
    expect(result.configStatus).toBe('invalid_date');
    expect(result.target.dailyGoals).toEqual(legacy);
  });

  it('duplicados não escolhem item arbitrário', () => {
    const dupWeekday = getEffectiveTargetForDate({
      dateISO: '2026-08-03',
      flagEnabled: true,
      legacyDailyGoals: legacy,
      templates: [activeLong, activeStrength],
      weeklySchedule: {
        entries: [
          { weekday: 0, templateId: 'tpl-long' },
          { weekday: 0, templateId: 'tpl-strength' },
        ],
      },
      dateOverrides: [],
    });
    expect(dupWeekday.configStatus).toBe('duplicate_weekday');
    expect(dupWeekday.target.source).toBe('profile_default');
    expect(dupWeekday.target.dailyGoals).toEqual(legacy);

    const dupTemplate = getEffectiveTargetForDate({
      dateISO: '2026-08-03',
      flagEnabled: true,
      legacyDailyGoals: legacy,
      templates: [activeLong, { ...activeLong, label: 'outro' }],
      weeklySchedule: { entries: [{ weekday: 0, templateId: 'tpl-long' }] },
      dateOverrides: [],
    });
    expect(dupTemplate.configStatus).toBe('duplicate_template_id');
    expect(dupTemplate.target.source).toBe('profile_default');

    const validation = validateDayTargetsConfig({
      dayTypeTemplates: [activeLong, { ...activeLong, label: 'dup' }],
      weeklySchedule: {
        entries: [
          { weekday: 0, templateId: 'tpl-long' },
          { weekday: 0, templateId: 'tpl-strength' },
        ],
      },
      dailyTargetOverrides: [],
    });
    expect(validation.ok).toBe(false);
    expect(validation.issues.some((i) => i.kind === 'duplicate_template_id')).toBe(true);
    expect(validation.issues.some((i) => i.kind === 'duplicate_weekday')).toBe(true);
  });

  it('segunda a domingo com seed pessoal', () => {
    const seed = createPersonalDayTargetSeed();
    const dates = [
      ['2026-08-03', 'work_long_bike', 3350],
      ['2026-08-04', 'strength_training', 3150],
      ['2026-08-05', 'strength_training', 3150],
      ['2026-08-06', 'work_long_bike', 3350],
      ['2026-08-07', 'work_long_bike', 3350],
      ['2026-08-08', 'work_long_bike', 3350],
      ['2026-08-09', 'work_short_bike', 3150],
    ] as const;

    for (const [dateISO, code, calories] of dates) {
      const result = getEffectiveTargetForDate({
        dateISO,
        flagEnabled: true,
        legacyDailyGoals: legacy,
        templates: seed.dayTypeTemplates,
        weeklySchedule: seed.weeklySchedule,
        dateOverrides: [],
      });
      expect(result.target.dayTypeCode).toBe(code);
      expect(result.target.dailyGoals.calories).toBe(calories);
      expect(result.target.source).toBe('weekly_schedule');
    }
  });
});

describe('createPersonalDayTargetSeed', () => {
  it('valores exatos, agenda correta, Atwater ok, sem descanso arbitrário', () => {
    const seed = createPersonalDayTargetSeed();
    expect(seed.dayTypeTemplates.map((t) => t.code)).toEqual([
      'work_long_bike',
      'strength_training',
      'work_short_bike',
    ]);
    expect(seed.dayTypeTemplates.some((t) => t.code === 'rest')).toBe(false);

    const long = seed.dayTypeTemplates.find((t) => t.code === 'work_long_bike')!;
    expect(long.dailyGoals).toEqual({
      calories: 3350,
      protein: 160,
      carbs: 475,
      fat: 90,
    });
    expect(
      validateMacroCalorieConsistency({
        targetCalories: long.dailyGoals.calories,
        proteinGrams: long.dailyGoals.protein,
        carbsGrams: long.dailyGoals.carbs,
        fatGrams: long.dailyGoals.fat,
      }).isConsistent,
    ).toBe(true);

    const strength = seed.dayTypeTemplates.find((t) => t.code === 'strength_training')!;
    expect(strength.dailyGoals).toEqual({
      calories: 3150,
      protein: 160,
      carbs: 448,
      fat: 80,
    });
    expect(
      validateMacroCalorieConsistency({
        targetCalories: strength.dailyGoals.calories,
        proteinGrams: strength.dailyGoals.protein,
        carbsGrams: strength.dailyGoals.carbs,
        fatGrams: strength.dailyGoals.fat,
      }).absoluteDifferenceKcal,
    ).toBeLessThanOrEqual(5);

    expect(seed.weeklySchedule.entries).toEqual([
      { weekday: 0, templateId: 'personal-tpl-work_long_bike' },
      { weekday: 1, templateId: 'personal-tpl-strength_training' },
      { weekday: 2, templateId: 'personal-tpl-strength_training' },
      { weekday: 3, templateId: 'personal-tpl-work_long_bike' },
      { weekday: 4, templateId: 'personal-tpl-work_long_bike' },
      { weekday: 5, templateId: 'personal-tpl-work_long_bike' },
      { weekday: 6, templateId: 'personal-tpl-work_short_bike' },
    ]);
  });

  it('cada chamada retorna novos objetos sem referências compartilhadas', () => {
    const a = createPersonalDayTargetSeed();
    const b = createPersonalDayTargetSeed();
    expect(a).not.toBe(b);
    expect(a.dayTypeTemplates).not.toBe(b.dayTypeTemplates);
    expect(a.dayTypeTemplates[0]).not.toBe(b.dayTypeTemplates[0]);
    expect(a.dayTypeTemplates[0].dailyGoals).not.toBe(b.dayTypeTemplates[0].dailyGoals);
    expect(a.weeklySchedule.entries).not.toBe(b.weeklySchedule.entries);
    a.dayTypeTemplates[0].dailyGoals.calories = 1;
    expect(b.dayTypeTemplates[0].dailyGoals.calories).toBe(3350);
  });

  it('rest só quando restGoals é fornecido', () => {
    const withRest = createPersonalDayTargetSeed({
      restGoals: { calories: 2500, protein: 140, carbs: 280, fat: 80 },
    });
    expect(withRest.dayTypeTemplates.some((t) => t.code === 'rest')).toBe(true);
  });

  it('cloneMacroGoals isola mutações', () => {
    const original = { calories: 1, protein: 2, carbs: 3, fat: 4 };
    const cloned = cloneMacroGoals(original);
    cloned.calories = 99;
    expect(original.calories).toBe(1);
  });
});
