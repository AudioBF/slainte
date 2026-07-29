import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TOLERANCE_KCAL,
  calculateCaloriesFromMacros,
  calculateCarbsForCalorieTarget,
  canPersistDailyGoals,
  canSaveNutritionTargetChanges,
  hasNutritionGoalsChanged,
  resolveConsistentDailyGoals,
  resolveGoalChangePatch,
  validateMacroCalorieConsistency,
} from './index';
import { DEFAULT_DAILY_GOALS } from '../../features/profile/types';
import { parseMacroConsistencyFlag } from '../../lib/parseMacroConsistencyFlag';

const LEGACY_INCONSISTENT = {
  calories: 3260,
  protein: 160,
  carbs: 450,
  fat: 80,
};

describe('calculateCaloriesFromMacros', () => {
  it('aplica Atwater básico', () => {
    const result = calculateCaloriesFromMacros({
      proteinGrams: 10,
      carbsGrams: 20,
      fatGrams: 5,
    });
    expect(result.exactCalories).toBe(10 * 4 + 20 * 4 + 5 * 9);
    expect(result.roundedCalories).toBe(165);
  });

  it('160 P / 450 C / 80 G = 3160 kcal', () => {
    const result = calculateCaloriesFromMacros({
      proteinGrams: 160,
      carbsGrams: 450,
      fatGrams: 80,
    });
    expect(result.exactCalories).toBe(3160);
    expect(result.roundedCalories).toBe(3160);
  });

  it('aceita zeros', () => {
    const result = calculateCaloriesFromMacros({
      proteinGrams: 0,
      carbsGrams: 0,
      fatGrams: 0,
    });
    expect(result.exactCalories).toBe(0);
    expect(result.roundedCalories).toBe(0);
  });

  it('aceita decimais e arredonda a exibição', () => {
    const result = calculateCaloriesFromMacros({
      proteinGrams: 10.4,
      carbsGrams: 20.2,
      fatGrams: 5.1,
    });
    expect(result.exactCalories).toBeCloseTo(10.4 * 4 + 20.2 * 4 + 5.1 * 9, 10);
    expect(result.roundedCalories).toBe(Math.round(result.exactCalories));
  });
});

describe('calculateCarbsForCalorieTarget', () => {
  it('3260 kcal / 160 P / 80 G resulta em 475 C', () => {
    const result = calculateCarbsForCalorieTarget({
      targetCalories: 3260,
      proteinGrams: 160,
      fatGrams: 80,
    });
    expect(result.isPossible).toBe(true);
    expect(result.exactCarbsGrams).toBe(475);
    expect(result.roundedCarbsGrams).toBe(475);
    expect(result.resultingCalories).toBe(3260);
    expect(result.differenceKcal).toBe(0);
  });

  it('arredonda carbs para o grama mais próximo e recalcula diferença', () => {
    const result = calculateCarbsForCalorieTarget({
      targetCalories: 2100,
      proteinGrams: 140,
      fatGrams: 65,
    });
    expect(result.exactCarbsGrams).toBeCloseTo(238.75, 10);
    expect(result.roundedCarbsGrams).toBe(239);
    expect(result.resultingCalories).toBe(2101);
    expect(result.differenceKcal).toBe(1);
    expect(Math.abs(result.differenceKcal ?? 99)).toBeLessThanOrEqual(DEFAULT_TOLERANCE_KCAL);
  });

  it('meta impossível não gera carboidrato negativo utilizável', () => {
    const result = calculateCarbsForCalorieTarget({
      targetCalories: 500,
      proteinGrams: 160,
      fatGrams: 80,
    });
    expect(result.isPossible).toBe(false);
    expect(result.status).toBe('impossible_target');
    expect(result.roundedCarbsGrams).toBeNull();
    expect(result.exactCarbsGrams).toBeLessThan(0);
  });

  it('rejeita entrada inválida', () => {
    const result = calculateCarbsForCalorieTarget({
      targetCalories: Number.NaN,
      proteinGrams: 100,
      fatGrams: 40,
    });
    expect(result.isPossible).toBe(false);
    expect(result.status).toBe('invalid_input');
  });
});

describe('validateMacroCalorieConsistency', () => {
  it('marca consistente quando diferença está na tolerância', () => {
    const result = validateMacroCalorieConsistency({
      targetCalories: 2100,
      proteinGrams: 140,
      carbsGrams: 239,
      fatGrams: 65,
    });
    expect(result.isConsistent).toBe(true);
    expect(result.status).toBe('consistent');
  });

  it('detecta diferença exata 3260 vs 160/450/80', () => {
    const result = validateMacroCalorieConsistency({
      targetCalories: 3260,
      proteinGrams: 160,
      carbsGrams: 450,
      fatGrams: 80,
      toleranceKcal: 5,
    });
    expect(result.calculatedCalories).toBe(3160);
    expect(result.differenceKcal).toBe(-100);
    expect(result.isConsistent).toBe(false);
  });

  it('respeita tolerância customizada', () => {
    const tight = validateMacroCalorieConsistency({
      targetCalories: 2100,
      proteinGrams: 140,
      carbsGrams: 239,
      fatGrams: 65,
      toleranceKcal: 0,
    });
    expect(tight.isConsistent).toBe(false);

    const loose = validateMacroCalorieConsistency({
      targetCalories: 2100,
      proteinGrams: 140,
      carbsGrams: 239,
      fatGrams: 65,
      toleranceKcal: 5,
    });
    expect(loose.isConsistent).toBe(true);
  });

  it('rejeita valores inválidos', () => {
    const result = validateMacroCalorieConsistency({
      targetCalories: -10,
      proteinGrams: 100,
      carbsGrams: 100,
      fatGrams: 40,
    });
    expect(result.isConsistent).toBe(false);
    expect(result.status).toBe('invalid_input');
  });
});

describe('DEFAULT_DAILY_GOALS', () => {
  it.each(Object.entries(DEFAULT_DAILY_GOALS) as [string, (typeof DEFAULT_DAILY_GOALS)['lose']][])(
    'objetivo %s é Atwater-coerente',
    (_goal, goals) => {
      const result = validateMacroCalorieConsistency({
        targetCalories: goals.calories,
        proteinGrams: goals.protein,
        carbsGrams: goals.carbs,
        fatGrams: goals.fat,
      });
      expect(result.isConsistent).toBe(true);
    },
  );
});

describe('parseMacroConsistencyFlag', () => {
  it('variável ausente = OFF', () => {
    expect(parseMacroConsistencyFlag(undefined)).toBe(false);
    expect(parseMacroConsistencyFlag(null)).toBe(false);
    expect(parseMacroConsistencyFlag('')).toBe(false);
  });

  it('"true" = ON', () => {
    expect(parseMacroConsistencyFlag('true')).toBe(true);
  });

  it('"false" = OFF', () => {
    expect(parseMacroConsistencyFlag('false')).toBe(false);
  });

  it('valor inválido = OFF', () => {
    expect(parseMacroConsistencyFlag('1')).toBe(false);
    expect(parseMacroConsistencyFlag('yes')).toBe(false);
    expect(parseMacroConsistencyFlag('TRUE')).toBe(false);
    expect(parseMacroConsistencyFlag('on')).toBe(false);
  });
});

describe('hasNutritionGoalsChanged / canSaveNutritionTargetChanges', () => {
  it('detecta mudança nutricional', () => {
    expect(hasNutritionGoalsChanged(LEGACY_INCONSISTENT, LEGACY_INCONSISTENT)).toBe(false);
    expect(
      hasNutritionGoalsChanged(LEGACY_INCONSISTENT, { ...LEGACY_INCONSISTENT, carbs: 400 }),
    ).toBe(true);
  });

  it('legado inconsistente + só nome/foto/prefs (macros iguais) = save permitido com flag ON', () => {
    const decision = canSaveNutritionTargetChanges({
      baselineGoals: LEGACY_INCONSISTENT,
      currentGoals: { ...LEGACY_INCONSISTENT },
      enforceConsistency: true,
    });
    expect(decision.canSave).toBe(true);
    expect(decision.reason).toBe('allowed_unchanged_legacy');
    expect(decision.isConsistent).toBe(false);
  });

  it('alteração nutricional inconsistente = save bloqueado com flag ON', () => {
    const decision = canSaveNutritionTargetChanges({
      baselineGoals: LEGACY_INCONSISTENT,
      currentGoals: { ...LEGACY_INCONSISTENT, carbs: 400 },
      enforceConsistency: true,
    });
    expect(decision.canSave).toBe(false);
    expect(decision.reason).toBe('blocked_inconsistent_edit');
  });

  it('alteração nutricional inconsistente = save permitido com flag OFF', () => {
    const decision = canSaveNutritionTargetChanges({
      baselineGoals: LEGACY_INCONSISTENT,
      currentGoals: { ...LEGACY_INCONSISTENT, carbs: 400 },
      enforceConsistency: false,
    });
    expect(decision.canSave).toBe(true);
    expect(decision.reason).toBe('allowed_flag_off');
  });

  it('alteração nutricional consistente = save permitido', () => {
    const fixed = { ...LEGACY_INCONSISTENT, carbs: 475 };
    const decision = canSaveNutritionTargetChanges({
      baselineGoals: LEGACY_INCONSISTENT,
      currentGoals: fixed,
      enforceConsistency: true,
    });
    expect(decision.canSave).toBe(true);
    expect(decision.reason).toBe('allowed_consistent');
  });

  it('recalcular carbs a partir do legado permite save', () => {
    const carbs = calculateCarbsForCalorieTarget({
      targetCalories: LEGACY_INCONSISTENT.calories,
      proteinGrams: LEGACY_INCONSISTENT.protein,
      fatGrams: LEGACY_INCONSISTENT.fat,
    });
    expect(carbs.roundedCarbsGrams).toBe(475);
    const decision = canSaveNutritionTargetChanges({
      baselineGoals: LEGACY_INCONSISTENT,
      currentGoals: { ...LEGACY_INCONSISTENT, carbs: carbs.roundedCarbsGrams! },
      enforceConsistency: true,
    });
    expect(decision.canSave).toBe(true);
  });
});

describe('resolveConsistentDailyGoals', () => {
  it('não muta o input', () => {
    const legacy = { ...LEGACY_INCONSISTENT };
    const snapshot = { ...legacy };
    const resolved = resolveConsistentDailyGoals(legacy);
    expect(legacy).toEqual(snapshot);
    expect(resolved.ok).toBe(true);
    if (resolved.ok) {
      expect(resolved.goals.carbs).toBe(475);
      expect(resolved.goals.protein).toBe(160);
      expect(resolved.goals.fat).toBe(80);
      expect(resolved.goals.calories).toBe(3260);
    }
  });

  it('resultado ajustado é Atwater-coerente', () => {
    const resolved = resolveConsistentDailyGoals(LEGACY_INCONSISTENT);
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(canPersistDailyGoals(resolved.goals).isConsistent).toBe(true);
  });

  it('meta impossível retorna erro estruturado sem carbs negativos no payload', () => {
    const resolved = resolveConsistentDailyGoals({
      calories: 500,
      protein: 160,
      carbs: 50,
      fat: 80,
    });
    expect(resolved.ok).toBe(false);
    if (resolved.ok) return;
    expect(resolved.goals).toBeNull();
    expect(resolved.reason).toBe('unresolvable');
    expect(resolved.message.length).toBeGreaterThan(0);
  });

  it('metas já consistentes não são ajustadas', () => {
    const goals = DEFAULT_DAILY_GOALS.maintain;
    const resolved = resolveConsistentDailyGoals(goals);
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.wasAdjusted).toBe(false);
    expect(resolved.goals).toEqual(goals);
  });
});

describe('resolveGoalChangePatch', () => {
  it('cancelar não altera nada', () => {
    expect(resolveGoalChangePatch('gain', 'cancel', DEFAULT_DAILY_GOALS)).toBeNull();
  });

  it('manter metas altera só o objetivo', () => {
    const patch = resolveGoalChangePatch('gain', 'keep_targets', DEFAULT_DAILY_GOALS);
    expect(patch).toEqual({ goal: 'gain' });
    expect(patch?.dailyGoals).toBeUndefined();
  });

  it('aplicar padrões altera goal + defaults Atwater-coerentes', () => {
    for (const goal of ['lose', 'maintain', 'gain'] as const) {
      const patch = resolveGoalChangePatch(goal, 'apply_defaults', DEFAULT_DAILY_GOALS);
      expect(patch?.goal).toBe(goal);
      expect(patch?.dailyGoals).toEqual(DEFAULT_DAILY_GOALS[goal]);
      expect(
        validateMacroCalorieConsistency({
          targetCalories: patch!.dailyGoals!.calories,
          proteinGrams: patch!.dailyGoals!.protein,
          carbsGrams: patch!.dailyGoals!.carbs,
          fatGrams: patch!.dailyGoals!.fat,
        }).isConsistent,
      ).toBe(true);
    }
  });
});
