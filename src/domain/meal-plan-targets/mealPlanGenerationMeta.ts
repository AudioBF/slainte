/**
 * Snapshot helpers for mealPlanGenerationMeta (device-local).
 */
import { cloneMacroGoals } from '../day-targets';
import type { BuildWeeklyMealPlanTargetsResult, MealPlanGenerationMeta } from './types';
import type { Weekday } from '../day-targets';

export function buildMealPlanGenerationMeta(input: {
  built: Extract<BuildWeeklyMealPlanTargetsResult, { ok: true }>;
  referenceWeekStartISO?: string;
  generatedAt?: string;
  validationStatus?: MealPlanGenerationMeta['validationStatus'];
  repairedDays?: Weekday[];
}): MealPlanGenerationMeta {
  const { built } = input;
  return {
    contractVersion: built.contractVersion,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    referenceWeekStartISO: input.referenceWeekStartISO,
    fallbackDailyGoals: cloneMacroGoals(built.fallbackDailyGoals),
    perDay: built.normalizedTargets.map((t) => ({
      dayIndex: t.dayIndex,
      dateISO: t.dateISO,
      dailyGoals: cloneMacroGoals(t.dailyGoals),
      source: t.source,
      templateId: t.templateId ?? null,
      dayTypeCode: t.dayTypeCode ?? null,
      label: t.label ?? null,
      validationStatus: 'ok' as const,
    })),
    validationStatus: input.validationStatus ?? 'ok',
    repairedDays: input.repairedDays,
    usedFallbackDays: [...built.usedFallbackDays],
  };
}

export function normalizeMealPlanGenerationMeta(
  raw: unknown,
): MealPlanGenerationMeta | null {
  if (raw == null || typeof raw !== 'object') return null;
  const m = raw as Partial<MealPlanGenerationMeta>;
  if (m.contractVersion !== 1 && m.contractVersion !== 2) return null;
  if (!m.fallbackDailyGoals || !Array.isArray(m.perDay)) return null;
  return {
    contractVersion: m.contractVersion,
    generatedAt: typeof m.generatedAt === 'string' ? m.generatedAt : new Date().toISOString(),
    referenceWeekStartISO: m.referenceWeekStartISO,
    fallbackDailyGoals: cloneMacroGoals(m.fallbackDailyGoals),
    perDay: m.perDay.map((d) => ({
      dayIndex: d.dayIndex,
      dateISO: d.dateISO,
      dailyGoals: cloneMacroGoals(d.dailyGoals),
      source: d.source,
      templateId: d.templateId ?? null,
      dayTypeCode: d.dayTypeCode ?? null,
      label: d.label ?? null,
      validationStatus: d.validationStatus,
    })),
    validationStatus: m.validationStatus,
    repairedDays: m.repairedDays,
    usedFallbackDays: m.usedFallbackDays,
  };
}
