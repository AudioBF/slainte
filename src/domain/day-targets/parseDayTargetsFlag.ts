/**
 * Parse explícito de EXPO_PUBLIC_USE_DAY_TARGETS.
 *
 * | Valor          | Resultado |
 * |----------------|-----------|
 * | ausente / ""   | OFF       |
 * | "true"         | ON        |
 * | "false"        | OFF       |
 * | qualquer outro | OFF       |
 *
 * Default seguro: ausência = OFF (produção permanece com profile.dailyGoals).
 */
export function parseDayTargetsFlag(value: string | undefined | null): boolean {
  if (value == null || value === '') return false;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return false;
}
