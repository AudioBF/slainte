import { cloneMacroGoals, type Weekday } from '../day-targets';
import type { MacroGoals } from '../../types';
import type { MealPlanDayTarget } from './types';

export function cloneMealPlanDayTarget(t: MealPlanDayTarget): MealPlanDayTarget {
  return {
    dayIndex: t.dayIndex,
    dateISO: t.dateISO,
    dailyGoals: cloneMacroGoals(t.dailyGoals),
    source: t.source,
    templateId: t.templateId ?? null,
    dayTypeCode: t.dayTypeCode ?? null,
    label: t.label ?? null,
  };
}

export function isFiniteNonNegativeMacroGoals(goals: MacroGoals): boolean {
  const vals = [goals.calories, goals.protein, goals.carbs, goals.fat];
  return vals.every((v) => typeof v === 'number' && Number.isFinite(v) && v >= 0);
}

/**
 * Valida array de sete targets V2 (dayIndex 0–6 únicos).
 * Não muta inputs.
 */
export function validateWeeklyMealPlanTargets(targets: MealPlanDayTarget[]): {
  ok: boolean;
  errors: string[];
  sorted: MealPlanDayTarget[] | null;
} {
  const errors: string[] = [];
  if (!Array.isArray(targets)) {
    return { ok: false, errors: ['dailyTargets deve ser um array.'], sorted: null };
  }
  if (targets.length !== 7) {
    errors.push(`dailyTargets deve ter exatamente 7 entradas (recebido ${targets.length}).`);
  }

  const seen = new Set<number>();
  for (const t of targets) {
    if (t == null || typeof t !== 'object') {
      errors.push('Entrada de dailyTargets inválida.');
      continue;
    }
    const di = t.dayIndex as number;
    if (!Number.isInteger(di) || di < 0 || di > 6) {
      errors.push(`dayIndex inválido: ${String(di)}.`);
      continue;
    }
    if (seen.has(di)) {
      errors.push(`dayIndex duplicado: ${di}.`);
    }
    seen.add(di);
    if (!t.dailyGoals || !isFiniteNonNegativeMacroGoals(t.dailyGoals)) {
      errors.push(`Metas inválidas no dayIndex ${di}.`);
    }
  }

  for (let i = 0; i <= 6; i++) {
    if (targets.length === 7 && !seen.has(i)) {
      errors.push(`Falta dayIndex ${i}.`);
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors, sorted: null };
  }

  const sorted = [...targets]
    .map(cloneMealPlanDayTarget)
    .sort((a, b) => a.dayIndex - b.dayIndex);

  for (let i = 0; i < 7; i++) {
    if (sorted[i].dayIndex !== (i as Weekday)) {
      return { ok: false, errors: ['Ordenação dayIndex inconsistente.'], sorted: null };
    }
  }

  return { ok: true, errors: [], sorted };
}
