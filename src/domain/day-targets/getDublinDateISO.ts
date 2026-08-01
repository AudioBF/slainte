export const DUBLIN_TIME_ZONE = 'Europe/Dublin';

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Data civil YYYY-MM-DD em Europe/Dublin para um instante.
 * Não usa `toISOString().slice(0, 10)` (UTC).
 */
export function getDublinDateISO(instant: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: DUBLIN_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
}

/** Valida YYYY-MM-DD como data de calendário real (sem timezone). */
export function isValidCivilDateISO(dateISO: string): boolean {
  const match = ISO_DATE_RE.exec(dateISO);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const utc = new Date(Date.UTC(year, month - 1, day));
  return (
    utc.getUTCFullYear() === year &&
    utc.getUTCMonth() === month - 1 &&
    utc.getUTCDate() === day
  );
}
