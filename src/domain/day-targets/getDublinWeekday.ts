import { isValidCivilDateISO } from './getDublinDateISO';
import type { Weekday } from './types';

/**
 * Converte Date.getUTCDay() / getDay() (domingo=0) para weekday Sláinte (segunda=0).
 */
export function jsDayToWeekday(jsDay: number): Weekday {
  return (jsDay === 0 ? 6 : jsDay - 1) as Weekday;
}

/**
 * Weekday civil (segunda=0 … domingo=6) para uma data YYYY-MM-DD.
 * Independente do fuso: o rótulo civil define o dia da semana.
 */
export function getDublinWeekday(dateISO: string): Weekday | null {
  if (!isValidCivilDateISO(dateISO)) return null;
  const [year, month, day] = dateISO.split('-').map(Number);
  const utcNoon = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return jsDayToWeekday(utcNoon.getUTCDay());
}
