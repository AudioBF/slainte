/**
 * Paridade app ↔ Edge para tolerâncias e decisão de correção.
 * Fixture compartilhada (valores estáveis) — evita drift silencioso.
 */
import { describe, expect, it } from 'vitest';
import {
  decideMealPlanCorrection,
  MEAL_PLAN_TOLERANCE_FIXTURE,
  softBand,
} from './index';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const EDGE_FIXTURE_PATH = path.join(
  process.cwd(),
  'supabase/functions/_shared/meal-plan-targets.ts',
);

describe('app/Edge meal-plan-targets parity', () => {
  it('tolerâncias do app batem com fixture exportada', () => {
    expect(MEAL_PLAN_TOLERANCE_FIXTURE.examples.calories_3350).toBe(268);
    expect(MEAL_PLAN_TOLERANCE_FIXTURE.examples.protein_160).toBe(16);
    expect(MEAL_PLAN_TOLERANCE_FIXTURE.examples.carbs_475).toBe(71);
    expect(MEAL_PLAN_TOLERANCE_FIXTURE.examples.fat_90).toBe(14);
    expect(softBand(268)).toBe(Math.round(268 * 1.25));
  });

  it('Edge copia contém mesmos valores de exemplo', () => {
    const edgeSrc = readFileSync(EDGE_FIXTURE_PATH, 'utf8');
    expect(edgeSrc).toContain('SOFT_BAND_FACTOR = 1.25');
    expect(edgeSrc).toContain('Math.max(150');
    expect(edgeSrc).toContain('Math.max(8');
    expect(edgeSrc).toContain('Math.max(15');
    expect(edgeSrc).toContain('Math.max(5');
    expect(edgeSrc).toMatch(/calories_3350:\s*calorieToleranceKcal\(3350\)/);
    expect(edgeSrc).toMatch(/protein_160:\s*proteinToleranceG\(160\)/);
  });

  it('política de correção: uma ação só', () => {
    expect(
      decideMealPlanCorrection(
        {
          valid: false,
          perDay: [],
          invalidDays: [0, 1],
          warnings: [],
          severity: 'hard',
          shouldRetry: false,
          shouldRepair: true,
          shouldReject: false,
        },
        true,
      ),
    ).toBe('repair_batch');

    expect(
      decideMealPlanCorrection(
        {
          valid: false,
          perDay: [],
          invalidDays: [0, 1, 2, 3],
          warnings: [],
          severity: 'hard',
          shouldRetry: true,
          shouldRepair: false,
          shouldReject: false,
        },
        true,
      ),
    ).toBe('retry_full');
  });
});
