import { getDublinDateISO } from '../../../domain/day-targets';
import { todayISO } from '../../selectors';

/**
 * “Hoje” para o fluxo Hoje/Semana.
 * Flag OFF: UTC legado (`todayISO`) — equivalência pós-Sprint 2B.
 * Flag ON: data civil Europe/Dublin.
 */
export function selectHomeTodayISO(
  flagEnabled: boolean,
  instant: Date = new Date(),
): string {
  if (flagEnabled) return getDublinDateISO(instant);
  // todayISO() ignora o instante; preservamos o contrato legado.
  void instant;
  return todayISO();
}
