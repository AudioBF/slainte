/**
 * Sprint 2A: templates/agenda/overrides vivem no Zustand + AsyncStorage.
 * O schema atual de `user_sync` não tem colunas para estes campos — sync cloud
 * exige GO de schema separado. Até lá, dispositivos podem divergir.
 */
export const DAY_TARGETS_SYNC_STATUS = 'device_local_only' as const;

export type DayTargetsSyncStatus = typeof DAY_TARGETS_SYNC_STATUS;
