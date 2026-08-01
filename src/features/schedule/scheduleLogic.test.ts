import { describe, expect, it } from 'vitest';
import { createPersonalDayTargetSeed } from '../../domain/day-targets';
import {
  ALL_WEEKDAYS,
  applyPersonalSeedState,
  buildTemplateFromDraft,
  canDeactivateTemplate,
  emptyTemplateDraft,
  hasExistingDayTargetsConfig,
  planRemoveDayTypeTemplate,
  recalculateDraftCarbs,
  resolveScheduleRow,
  scheduleWithoutTemplate,
  schedulesEqual,
  setScheduleEntryDraft,
  templateToDraft,
  weekdayLabel,
} from './scheduleLogic';

const sampleTemplate = {
  id: 'tpl-a',
  code: 'custom' as const,
  label: 'Treino',
  dailyGoals: { calories: 3150, protein: 160, carbs: 448, fat: 80 },
  isActive: true,
};

describe('weekday mapping', () => {
  it('segunda=0 e domingo=6', () => {
    expect(weekdayLabel(0)).toBe('Segunda-feira');
    expect(weekdayLabel(6)).toBe('Domingo');
    expect(ALL_WEEKDAYS).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
});

describe('buildTemplateFromDraft', () => {
  it('cria template válido Atwater-coerente', () => {
    const result = buildTemplateFromDraft(
      emptyTemplateDraft({
        label: 'Longo',
        code: 'work_long_bike',
        calories: '3350',
        protein: '160',
        carbs: '475',
        fat: '90',
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.template.label).toBe('Longo');
      expect(result.template.id).toMatch(/^tpl-/);
      expect(result.template.dailyGoals.calories).toBe(3350);
    }
  });

  it('rejeita template inconsistente', () => {
    const result = buildTemplateFromDraft(
      emptyTemplateDraft({
        label: 'Ruim',
        calories: '3000',
        protein: '160',
        carbs: '100',
        fat: '80',
      }),
    );
    expect(result.ok).toBe(false);
  });

  it('rejeita nome vazio e valores inválidos', () => {
    expect(buildTemplateFromDraft(emptyTemplateDraft({ label: '  ' })).ok).toBe(false);
    expect(
      buildTemplateFromDraft(
        emptyTemplateDraft({
          label: 'X',
          calories: 'abc',
          protein: '1',
          carbs: '1',
          fat: '1',
        }),
      ).ok,
    ).toBe(false);
  });

  it('editar preserva ID', () => {
    const result = buildTemplateFromDraft(
      templateToDraft(sampleTemplate),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.template.id).toBe('tpl-a');
  });

  it('recalcula carboidratos sem mutar P/G', () => {
    const draft = emptyTemplateDraft({
      label: 'X',
      calories: '3350',
      protein: '160',
      carbs: '100',
      fat: '90',
    });
    const next = recalculateDraftCarbs(draft);
    expect(next.protein).toBe('160');
    expect(next.fat).toBe('90');
    expect(next.carbs).toBe('475');
  });
});

describe('agenda draft', () => {
  it('associa e remove associação', () => {
    let schedule = { entries: [] as { weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6; templateId: string }[] };
    schedule = setScheduleEntryDraft(schedule, 0, 'tpl-a');
    expect(schedule.entries).toEqual([{ weekday: 0, templateId: 'tpl-a' }]);
    schedule = setScheduleEntryDraft(schedule, 0, null);
    expect(schedule.entries).toEqual([]);
  });

  it('resolve linha com fallback de perfil', () => {
    const row = resolveScheduleRow(1, { entries: [] }, [sampleTemplate]);
    expect(row.usingProfileDefault).toBe(true);
    expect(row.template).toBeNull();
  });
});

describe('remoção e desativação', () => {
  const schedule = { entries: [{ weekday: 0 as const, templateId: 'tpl-a' }] };

  it('remove template não usado', () => {
    const plan = planRemoveDayTypeTemplate(
      [sampleTemplate],
      { entries: [] },
      'tpl-a',
    );
    expect(plan.kind).toBe('unused');
  });

  it('impede remoção silenciosa com associações', () => {
    const plan = planRemoveDayTypeTemplate([sampleTemplate], schedule, 'tpl-a');
    expect(plan.kind).toBe('in_use');
    if (plan.kind === 'in_use') {
      expect(plan.weekdays).toEqual([0]);
      expect(plan.labels[0]).toBe('Segunda-feira');
    }
  });

  it('limpa referências ao remover do rascunho', () => {
    const cleaned = scheduleWithoutTemplate(schedule, 'tpl-a');
    expect(cleaned.entries).toEqual([]);
  });

  it('impede desativação de template associado', () => {
    const result = canDeactivateTemplate(schedule, 'tpl-a');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.labels).toContain('Segunda-feira');
  });

  it('permite desativação sem associação', () => {
    expect(canDeactivateTemplate({ entries: [] }, 'tpl-a').ok).toBe(true);
  });
});

describe('seed pessoal', () => {
  it('aplica seed com sete dias e templates esperados', () => {
    const seed = applyPersonalSeedState();
    expect(seed.dayTypeTemplates).toHaveLength(3);
    expect(seed.weeklySchedule.entries).toHaveLength(7);
    expect(seed.dayTypeTemplates.some((t) => t.code === 'rest')).toBe(false);
    expect(hasExistingDayTargetsConfig(seed)).toBe(true);
    expect(hasExistingDayTargetsConfig({ dayTypeTemplates: [], weeklySchedule: { entries: [] } })).toBe(
      false,
    );
  });

  it('createPersonalDayTargetSeed bate com applyPersonalSeedState', () => {
    const a = createPersonalDayTargetSeed();
    const b = applyPersonalSeedState();
    expect(a.weeklySchedule.entries).toEqual(b.weeklySchedule.entries);
    expect(schedulesEqual(a.weeklySchedule, b.weeklySchedule)).toBe(true);
  });
});
