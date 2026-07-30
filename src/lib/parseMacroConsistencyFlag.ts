/**
 * Parse explícito de EXPO_PUBLIC_USE_MACRO_CONSISTENCY.
 *
 * | Valor        | Resultado |
 * |--------------|-----------|
 * | ausente / "" | OFF       |
 * | "true"       | ON        |
 * | "false"      | OFF       |
 * | qualquer outro | OFF     |
 *
 * Default seguro: ausência da variável = OFF (sem bloqueio acidental em produção).
 */
export function parseMacroConsistencyFlag(value: string | undefined | null): boolean {
  if (value == null || value === '') return false;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return false;
}
