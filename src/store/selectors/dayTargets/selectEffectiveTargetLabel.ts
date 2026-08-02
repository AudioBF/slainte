import type {
  DayTypeTemplate,
  EffectiveNutritionTarget,
  TargetSource,
} from '../../../domain/day-targets';

/**
 * Rótulo discreto para a meta efetiva (apenas flag ON).
 * Flag OFF / source flag_off → null.
 */
export function selectEffectiveTargetLabel(
  target: Pick<EffectiveNutritionTarget, 'source' | 'templateId'>,
  templates: DayTypeTemplate[],
): string | null {
  const source: TargetSource = target.source;
  if (source === 'flag_off') return null;

  if (source === 'date_override') {
    return 'Meta personalizada para esta data';
  }

  if (source === 'weekly_schedule' && target.templateId) {
    const template = templates.find((t) => t.id === target.templateId);
    if (template?.label) {
      return `Meta do dia: ${template.label}`;
    }
  }

  return 'Meta padrão do perfil';
}
