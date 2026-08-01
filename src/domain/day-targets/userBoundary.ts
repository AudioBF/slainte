/**
 * Day targets são device-local e ainda não viajam no `user_sync`.
 * Na troca de conta no mesmo dispositivo, limpar evita vazar a agenda
 * do utilizador anterior (o pull cloud chega vazio e preservaria o local).
 *
 * `previousUserId === null` (primeiro utilizador na sessão da app) → não resetar.
 */
export function shouldResetDayTargetsOnUserChange(
  previousUserId: string | null,
  nextUserId: string,
): boolean {
  return previousUserId !== null && previousUserId !== nextUserId;
}
