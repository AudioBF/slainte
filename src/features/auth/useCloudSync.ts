import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { pushToCloud, syncWithCloud } from '../../services/supabase/sync';
import { useAppStore, useStoreHydrated } from '../../store/useAppStore';

const DEBOUNCE_MS = 2500;

/** Auto-sync when signed in; debounced push on local changes. */
export function useCloudSync() {
  const hydrated = useStoreHydrated();
  const { user, isSignedIn, configured } = useAuth();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (!hydrated || !configured || !isSignedIn || !user) return;

    if (lastUserRef.current !== user.id) {
      lastUserRef.current = user.id;
      syncWithCloud(user.id).catch(() => undefined);
    }
  }, [hydrated, configured, isSignedIn, user]);

  useEffect(() => {
    if (!hydrated || !configured || !isSignedIn || !user) return;

    const unsub = useAppStore.subscribe((state, prev) => {
      const changed =
        state.profile.updatedAt !== prev.profile.updatedAt ||
        state.loggedMeals !== prev.loggedMeals ||
        state.plannedMeals !== prev.plannedMeals ||
        state.recipes !== prev.recipes ||
        state.shopping !== prev.shopping ||
        state.mealPlanSummary !== prev.mealPlanSummary;

      if (!changed) return;

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        pushToCloud(user.id).catch(() => undefined);
      }, DEBOUNCE_MS);
    });

    return () => {
      unsub();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [hydrated, configured, isSignedIn, user]);
}

export async function manualSync(userId: string) {
  return syncWithCloud(userId);
}
