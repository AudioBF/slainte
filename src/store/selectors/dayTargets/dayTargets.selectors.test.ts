import { describe, expect, it } from 'vitest';
import {
  addCivilDays,
  createPersonalDayTargetSeed,
  getDublinDateISO,
  getWeekCivilDates,
  type DayTypeTemplate,
  type WeeklySchedule,
} from '../../../domain/day-targets';
import type { LoggedMeal, UserProfile } from '../../../types';
import {
  selectDayLogStatus,
  selectEffectiveNutritionTargetForDate,
  selectEffectiveTargetLabel,
  selectHomeTodayISO,
  selectWeekCivilDates,
  selectWeekDiagnosisInsightsFromComparison,
  selectWeekNutritionComparison,
} from './index';

const profileGoals = { calories: 2100, protein: 140, carbs: 239, fat: 65 };

const profile = {
  dailyGoals: profileGoals,
} as Pick<UserProfile, 'dailyGoals'>;

const activeLong: DayTypeTemplate = {
  id: 'tpl-long',
  code: 'work_long_bike',
  label: 'Trabalho longo + bicicleta',
  dailyGoals: { calories: 3350, protein: 160, carbs: 475, fat: 90 },
  isActive: true,
};

const activeStrength: DayTypeTemplate = {
  id: 'tpl-strength',
  code: 'strength_training',
  label: 'Musculação intensa',
  dailyGoals: { calories: 3150, protein: 160, carbs: 448, fat: 80 },
  isActive: true,
};

function scheduleFor(map: Partial<Record<0 | 1 | 2 | 3 | 4 | 5 | 6, string>>): WeeklySchedule {
  return {
    entries: (Object.entries(map) as [string, string][]).map(([weekday, templateId]) => ({
      weekday: Number(weekday) as 0 | 1 | 2 | 3 | 4 | 5 | 6,
      templateId,
    })),
  };
}

function meal(date: string, calories = 500): LoggedMeal {
  return {
    id: `m-${date}-${calories}`,
    date,
    name: 'Teste',
    slot: 'lunch',
    fromPlan: false,
    components: [
      {
        id: `c-${date}`,
        name: 'Item',
        weightGrams: 100,
        calories,
        protein: 0,
        carbs: 0,
        fat: 0,
      },
    ],
  };
}

describe('selectEffectiveNutritionTargetForDate — Hoje', () => {
  it('flag OFF usa profile.dailyGoals e source flag_off', () => {
    const seed = createPersonalDayTargetSeed();
    const result = selectEffectiveNutritionTargetForDate({
      profile,
      dayTypeTemplates: seed.dayTypeTemplates,
      weeklySchedule: seed.weeklySchedule,
      dailyTargetOverrides: [],
      dateISO: '2026-07-27', // segunda
      flagEnabled: false,
    });
    expect(result.source).toBe('flag_off');
    expect(result.dailyGoals).toEqual(profileGoals);
    expect(result.label).toBeNull();
  });

  it('flag ON segunda usa seed 3350 e label de agenda', () => {
    const seed = createPersonalDayTargetSeed();
    const result = selectEffectiveNutritionTargetForDate({
      profile,
      dayTypeTemplates: seed.dayTypeTemplates,
      weeklySchedule: seed.weeklySchedule,
      dailyTargetOverrides: [],
      dateISO: '2026-07-27',
      flagEnabled: true,
    });
    expect(result.weekday).toBe(0);
    expect(result.dailyGoals.calories).toBe(3350);
    expect(result.source).toBe('weekly_schedule');
    expect(result.label).toBe('Meta do dia: Trabalho longo + bicicleta');
  });

  it('flag ON domingo usa 3150', () => {
    const seed = createPersonalDayTargetSeed();
    const result = selectEffectiveNutritionTargetForDate({
      profile,
      dayTypeTemplates: seed.dayTypeTemplates,
      weeklySchedule: seed.weeklySchedule,
      dailyTargetOverrides: [],
      dateISO: '2026-07-26',
      flagEnabled: true,
    });
    expect(result.weekday).toBe(6);
    expect(result.dailyGoals.calories).toBe(3150);
  });

  it('histórico usa weekday da data histórica, não de hoje', () => {
    const seed = createPersonalDayTargetSeed();
    const monday = selectEffectiveNutritionTargetForDate({
      profile,
      dayTypeTemplates: seed.dayTypeTemplates,
      weeklySchedule: seed.weeklySchedule,
      dailyTargetOverrides: [],
      dateISO: '2026-07-27',
      flagEnabled: true,
    });
    const tuesday = selectEffectiveNutritionTargetForDate({
      profile,
      dayTypeTemplates: seed.dayTypeTemplates,
      weeklySchedule: seed.weeklySchedule,
      dailyTargetOverrides: [],
      dateISO: '2026-07-28',
      flagEnabled: true,
    });
    expect(monday.dailyGoals.calories).toBe(3350);
    expect(tuesday.dailyGoals.calories).toBe(3150);
  });

  it('agenda vazia → fallback perfil', () => {
    const result = selectEffectiveNutritionTargetForDate({
      profile,
      dayTypeTemplates: [activeLong],
      weeklySchedule: { entries: [] },
      dailyTargetOverrides: [],
      dateISO: '2026-07-27',
      flagEnabled: true,
    });
    expect(result.source).toBe('profile_default');
    expect(result.dailyGoals).toEqual(profileGoals);
    expect(result.label).toBe('Meta padrão do perfil');
  });

  it('template removido → fallback', () => {
    const result = selectEffectiveNutritionTargetForDate({
      profile,
      dayTypeTemplates: [],
      weeklySchedule: scheduleFor({ 0: 'missing' }),
      dailyTargetOverrides: [],
      dateISO: '2026-07-27',
      flagEnabled: true,
    });
    expect(result.configStatus).toBe('missing_template');
    expect(result.source).toBe('profile_default');
  });

  it('template inativo → fallback', () => {
    const inactive = { ...activeLong, isActive: false };
    const result = selectEffectiveNutritionTargetForDate({
      profile,
      dayTypeTemplates: [inactive],
      weeklySchedule: scheduleFor({ 0: inactive.id }),
      dailyTargetOverrides: [],
      dateISO: '2026-07-27',
      flagEnabled: true,
    });
    expect(result.configStatus).toBe('inactive_template');
    expect(result.dailyGoals).toEqual(profileGoals);
  });

  it('weekday duplicado → fallback', () => {
    const result = selectEffectiveNutritionTargetForDate({
      profile,
      dayTypeTemplates: [activeLong, activeStrength],
      weeklySchedule: {
        entries: [
          { weekday: 0, templateId: activeLong.id },
          { weekday: 0, templateId: activeStrength.id },
        ],
      },
      dailyTargetOverrides: [],
      dateISO: '2026-07-27',
      flagEnabled: true,
    });
    expect(result.configStatus).toBe('duplicate_weekday');
    expect(result.source).toBe('profile_default');
  });

  it('override tem prioridade e label personalizado', () => {
    const result = selectEffectiveNutritionTargetForDate({
      profile,
      dayTypeTemplates: [activeLong],
      weeklySchedule: scheduleFor({ 0: activeLong.id }),
      dailyTargetOverrides: [
        {
          dateISO: '2026-07-27',
          dailyGoals: { calories: 2800, protein: 150, carbs: 300, fat: 80 },
          source: 'date_override',
        },
      ],
      dateISO: '2026-07-27',
      flagEnabled: true,
    });
    expect(result.source).toBe('date_override');
    expect(result.dailyGoals.calories).toBe(2800);
    expect(result.label).toBe('Meta personalizada para esta data');
  });

  it('não muta inputs', () => {
    const templates = [activeLong];
    const schedule = scheduleFor({ 0: activeLong.id });
    const goalsBefore = { ...profile.dailyGoals };
    selectEffectiveNutritionTargetForDate({
      profile,
      dayTypeTemplates: templates,
      weeklySchedule: schedule,
      dailyTargetOverrides: [],
      dateISO: '2026-07-27',
      flagEnabled: true,
    });
    expect(templates[0].dailyGoals.calories).toBe(3350);
    expect(profile.dailyGoals).toEqual(goalsBefore);
  });

  it('perfil inconsistente: exibe valores e isConsistent false', () => {
    const inconsistent = {
      dailyGoals: { calories: 3000, protein: 200, carbs: 100, fat: 90 },
    };
    const result = selectEffectiveNutritionTargetForDate({
      profile: inconsistent,
      dayTypeTemplates: [],
      weeklySchedule: { entries: [] },
      dailyTargetOverrides: [],
      dateISO: '2026-07-27',
      flagEnabled: true,
    });
    expect(result.dailyGoals).toEqual(inconsistent.dailyGoals);
    expect(result.isConsistent).toBe(false);
  });

  it('selectEffectiveTargetLabel cobre sources', () => {
    expect(
      selectEffectiveTargetLabel({ source: 'flag_off', templateId: null }, []),
    ).toBeNull();
    expect(
      selectEffectiveTargetLabel({ source: 'date_override', templateId: null }, []),
    ).toBe('Meta personalizada para esta data');
    expect(
      selectEffectiveTargetLabel(
        { source: 'weekly_schedule', templateId: activeLong.id },
        [activeLong],
      ),
    ).toBe('Meta do dia: Trabalho longo + bicicleta');
    expect(
      selectEffectiveTargetLabel({ source: 'profile_default', templateId: null }, []),
    ).toBe('Meta padrão do perfil');
  });
});

describe('Dublin week helpers', () => {
  it('inverno / verão / DST via getDublinDateISO', () => {
    expect(getDublinDateISO(new Date('2026-01-15T00:30:00.000Z'))).toBe('2026-01-15');
    expect(getDublinDateISO(new Date('2026-07-01T23:30:00.000Z'))).toBe('2026-07-02');
    expect(getDublinDateISO(new Date('2026-03-29T00:30:00.000Z'))).toBe('2026-03-29');
  });

  it('UTC ainda no dia anterior vs Dublin seguinte', () => {
    const instant = new Date('2026-07-01T23:30:00.000Z');
    expect(instant.toISOString().slice(0, 10)).toBe('2026-07-01');
    expect(getDublinDateISO(instant)).toBe('2026-07-02');
  });

  it('UTC já no dia seguinte enquanto Dublin ainda no anterior (inverno)', () => {
    // GMT = UTC; 00:30 UTC = 00:30 Dublin no mesmo dia
    expect(getDublinDateISO(new Date('2026-01-15T00:30:00.000Z'))).toBe('2026-01-15');
  });

  it('semana atravessa mês e ano; domingo→segunda', () => {
    const dec = getWeekCivilDates('2025-12-31');
    expect(dec).toEqual([
      '2025-12-29',
      '2025-12-30',
      '2025-12-31',
      '2026-01-01',
      '2026-01-02',
      '2026-01-03',
      '2026-01-04',
    ]);
    expect(addCivilDays('2026-08-09', 1)).toBe('2026-08-10'); // dom→seg
    const jul = selectWeekCivilDates('2026-07-31');
    expect(jul[0]).toBe('2026-07-27');
    expect(jul[6]).toBe('2026-08-02');
  });

  it('selectHomeTodayISO OFF usa UTC legado; ON usa Dublin', () => {
    const summer = new Date('2026-07-01T23:30:00.000Z');
    expect(selectHomeTodayISO(true, summer)).toBe('2026-07-02');
    expect(selectHomeTodayISO(false, summer)).toBe(new Date().toISOString().slice(0, 10));
  });
});

describe('Semana — comparação e estados', () => {
  const seed = createPersonalDayTargetSeed();
  const today = '2026-07-29'; // quarta

  it('sete datas Mon–Sun', () => {
    const dates = selectWeekCivilDates(today);
    expect(dates).toHaveLength(7);
    expect(dates[0]).toBe('2026-07-27');
    expect(dates[6]).toBe('2026-08-02');
  });

  it('metas diferentes por dia + futuros + sem registro + médias', () => {
    const loggedMeals: LoggedMeal[] = [
      meal('2026-07-27', 3000),
      meal('2026-07-28', 0), // zero real com log
    ];
    const comparison = selectWeekNutritionComparison({
      profile,
      dayTypeTemplates: seed.dayTypeTemplates,
      weeklySchedule: seed.weeklySchedule,
      dailyTargetOverrides: [],
      loggedMeals,
      referenceDateISO: today,
      todayISO: today,
      flagEnabled: true,
    });
    expect(comparison).not.toBeNull();
    if (!comparison) return;

    expect(comparison.perDay[0].target.dailyGoals.calories).toBe(3350);
    expect(comparison.perDay[1].target.dailyGoals.calories).toBe(3150);
    expect(comparison.perDay[0].status).toBe('logged');
    expect(comparison.perDay[1].status).toBe('logged');
    expect(comparison.perDay[1].actual?.calories).toBe(0);
    expect(comparison.perDay[2].status).toBe('no_log'); // quarta sem log
    expect(comparison.perDay[3].status).toBe('future');
    expect(comparison.futureDays).toBe(4);
    expect(comparison.daysWithLogs).toBe(2);
    expect(comparison.daysWithoutLogs).toBe(1);
    expect(comparison.elapsedDays).toBe(3);
    expect(comparison.averageActualForLoggedDays).toBe(1500);
    expect(comparison.averageTargetForLoggedDays).toBe(Math.round((3350 + 3150) / 2));
    expect(comparison.isPartialWeek).toBe(true);

    const sources = comparison.perDay.map((d) => d.target.source);
    expect(sources.every((s) => s === 'weekly_schedule' || s === 'profile_default')).toBe(true);
  });

  it('nenhum log → médias null; ausência ≠ zero no diagnóstico', () => {
    const comparison = selectWeekNutritionComparison({
      profile,
      dayTypeTemplates: seed.dayTypeTemplates,
      weeklySchedule: seed.weeklySchedule,
      dailyTargetOverrides: [],
      loggedMeals: [],
      referenceDateISO: today,
      todayISO: today,
      flagEnabled: true,
    });
    expect(comparison?.averageActualForLoggedDays).toBeNull();
    expect(comparison?.averageTargetForLoggedDays).toBeNull();
    const insights = selectWeekDiagnosisInsightsFromComparison(comparison!);
    expect(insights.some((i) => /não há registros|Dados incompletos|sem registro/i.test(i.message))).toBe(
      true,
    );
    expect(insights.some((i) => /abaixo da sua meta/i.test(i.message))).toBe(false);
  });

  it('flag OFF na comparação ainda resolve source flag_off por dia', () => {
    const comparison = selectWeekNutritionComparison({
      profile,
      dayTypeTemplates: seed.dayTypeTemplates,
      weeklySchedule: seed.weeklySchedule,
      dailyTargetOverrides: [],
      loggedMeals: [meal('2026-07-27')],
      referenceDateISO: today,
      todayISO: today,
      flagEnabled: false,
    });
    expect(comparison?.perDay.every((d) => d.target.source === 'flag_off')).toBe(true);
    expect(comparison?.perDay[0].target.dailyGoals.calories).toBe(2100);
  });

  it('toggle ON/OFF não apaga configuração (inputs intactos)', () => {
    const templates = [...seed.dayTypeTemplates];
    const schedule = { entries: [...seed.weeklySchedule.entries] };
    selectWeekNutritionComparison({
      profile,
      dayTypeTemplates: templates,
      weeklySchedule: schedule,
      dailyTargetOverrides: [],
      loggedMeals: [],
      referenceDateISO: today,
      todayISO: today,
      flagEnabled: false,
    });
    selectWeekNutritionComparison({
      profile,
      dayTypeTemplates: templates,
      weeklySchedule: schedule,
      dailyTargetOverrides: [],
      loggedMeals: [],
      referenceDateISO: today,
      todayISO: today,
      flagEnabled: true,
    });
    expect(templates).toHaveLength(seed.dayTypeTemplates.length);
    expect(schedule.entries).toHaveLength(7);
  });

  it('selectDayLogStatus distingue future / no_log / logged', () => {
    expect(selectDayLogStatus({ dateISO: '2026-07-30', todayISO: '2026-07-29', mealCount: 0 })).toBe(
      'future',
    );
    expect(selectDayLogStatus({ dateISO: '2026-07-29', todayISO: '2026-07-29', mealCount: 0 })).toBe(
      'no_log',
    );
    expect(selectDayLogStatus({ dateISO: '2026-07-28', todayISO: '2026-07-29', mealCount: 1 })).toBe(
      'logged',
    );
  });
});

describe('regressão Dieta / legado', () => {
  it('flag OFF label null (UI não mostra tipo de dia)', () => {
    const result = selectEffectiveNutritionTargetForDate({
      profile,
      dayTypeTemplates: createPersonalDayTargetSeed().dayTypeTemplates,
      weeklySchedule: createPersonalDayTargetSeed().weeklySchedule,
      dailyTargetOverrides: [],
      dateISO: '2026-07-27',
      flagEnabled: false,
    });
    expect(result.label).toBeNull();
    expect(result.dailyGoals).toEqual(profileGoals);
  });
});
