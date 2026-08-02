/**
 * Classifica um dia civil face a “hoje” e à presença de registros.
 * Não usa macros zerados como proxy de “sem consumo”.
 */
export function selectDayLogStatus(input: {
  dateISO: string;
  todayISO: string;
  mealCount: number;
}): 'future' | 'no_log' | 'logged' {
  if (input.dateISO > input.todayISO) return 'future';
  if (input.mealCount <= 0) return 'no_log';
  return 'logged';
}
