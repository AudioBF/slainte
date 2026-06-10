import { useCloudSync } from './useCloudSync';

/** Mount once at app root to enable debounced cloud sync. */
export function CloudSyncProvider() {
  useCloudSync();
  return null;
}
