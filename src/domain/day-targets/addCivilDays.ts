import { isValidCivilDateISO } from './getDublinDateISO';

/**
 * Soma dias a uma data civil YYYY-MM-DD com aritmética UTC de calendário.
 * Não usa fuso local nem `toISOString` sobre `Date` local meia-noite.
 */
export function addCivilDays(dateISO: string, days: number): string | null {
  if (!isValidCivilDateISO(dateISO)) return null;
  const [year, month, day] = dateISO.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() + days);
  const y = utc.getUTCFullYear();
  const m = String(utc.getUTCMonth() + 1).padStart(2, '0');
  const d = String(utc.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
