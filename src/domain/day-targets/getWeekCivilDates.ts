import { addCivilDays } from './addCivilDays';
import { getDublinWeekday } from './getDublinWeekday';
import { isValidCivilDateISO } from './getDublinDateISO';

/**
 * Semana civil segunda→domingo que contém `referenceDateISO`.
 * Retorna exatamente 7 datas ISO, ou `null` se a referência for inválida.
 */
export function getWeekCivilDates(referenceDateISO: string): string[] | null {
  if (!isValidCivilDateISO(referenceDateISO)) return null;
  const weekday = getDublinWeekday(referenceDateISO);
  if (weekday == null) return null;
  const monday = addCivilDays(referenceDateISO, -weekday);
  if (!monday) return null;
  const dates: string[] = [];
  for (let i = 0; i < 7; i += 1) {
    const next = addCivilDays(monday, i);
    if (!next) return null;
    dates.push(next);
  }
  return dates;
}
