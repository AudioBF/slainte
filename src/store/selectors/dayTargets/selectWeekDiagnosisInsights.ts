import type { WeeklyInsight } from '../../../features/home/selectWeeklyInsights';
import type { WeekNutritionComparison, WeekStatusSummaryLine } from './types';

function pluralDays(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

/**
 * Linhas de estado da semana (contagens / parcial / futuros).
 * Não emite diagnóstico nutricional de “baixo consumo” por ausência de logs.
 */
export function selectWeekStatusSummaryLines(
  comparison: WeekNutritionComparison,
): WeekStatusSummaryLine[] {
  const lines: WeekStatusSummaryLine[] = [];

  if (comparison.consideredDays > 0) {
    const withLogs = comparison.daysWithLogs;
    const considered = comparison.consideredDays;
    lines.push({
      id: 'days_with_logs',
      message:
        withLogs === 1 && considered === 1
          ? '1 de 1 dia com registro'
          : `${withLogs} de ${considered} dia${considered === 1 ? '' : 's'} com registro${withLogs === 1 ? '' : 's'}`,
    });
  }

  if (comparison.daysWithoutLogs > 0) {
    lines.push({
      id: 'days_without_logs',
      message: `${pluralDays(comparison.daysWithoutLogs, 'dia sem registro', 'dias sem registro')}`,
    });
  }

  if (comparison.futureDays > 0) {
    lines.push({
      id: 'partial_week',
      message: 'Semana em andamento',
    });
    lines.push({
      id: 'future_days',
      message: `${pluralDays(
        comparison.futureDays,
        'dia futuro não incluído',
        'dias futuros não incluídos',
      )}`,
    });
  }

  return lines;
}

/**
 * Insights de diagnóstico para Semana com flag ON.
 * Evita tratar ausência como consumo zero / baixa aderência definitiva.
 */
export function selectWeekDiagnosisInsightsFromComparison(
  comparison: WeekNutritionComparison,
): WeeklyInsight[] {
  const bullets: WeeklyInsight[] = [];
  const status = selectWeekStatusSummaryLines(comparison);

  for (const line of status) {
    bullets.push({ id: line.id, message: line.message });
  }

  if (comparison.daysWithLogs === 0) {
    bullets.push({
      id: 'no_logs_nudge',
      message:
        'Ainda não há registros nesta semana civil. Registre refeições para comparar com as metas do período.',
    });
    return bullets.slice(0, 4);
  }

  if (comparison.daysWithoutLogs > 0 || comparison.futureDays > 0) {
    bullets.push({
      id: 'incomplete_data',
      message:
        'Dados incompletos: dias sem registro não entram na média realizada (ausência não é consumo zero).',
    });
  }

  if (
    comparison.averageActualForLoggedDays != null &&
    comparison.averageTargetForLoggedDays != null
  ) {
    const avg = comparison.averageActualForLoggedDays;
    const targetAvg = comparison.averageTargetForLoggedDays;
    const delta = Math.abs(avg - targetAvg);
    const near = delta <= targetAvg * 0.1;
    if (near) {
      bullets.push({
        id: 'calorie_average_logged',
        message: `Média de ${avg} kcal nos dias com registro — próximo da meta média desses dias.`,
      });
    } else if (avg < targetAvg) {
      bullets.push({
        id: 'calorie_average_logged',
        message: `Média de ${avg} kcal nos dias com registro — ${delta} abaixo da meta média desses dias.`,
      });
    } else {
      bullets.push({
        id: 'calorie_average_logged',
        message: `Média de ${avg} kcal nos dias com registro — ${delta} acima da meta média desses dias.`,
      });
    }
  }

  return bullets.slice(0, 4);
}
