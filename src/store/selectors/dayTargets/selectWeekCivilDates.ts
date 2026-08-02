import { getWeekCivilDates } from '../../../domain/day-targets';

/**
 * Semana civil Mon–Sun (Europe/Dublin weekday) contendo a data de referência.
 * Retorna exatamente 7 ISOs, ou array vazio se a data for inválida.
 */
export function selectWeekCivilDates(referenceDateISO: string): string[] {
  return getWeekCivilDates(referenceDateISO) ?? [];
}
