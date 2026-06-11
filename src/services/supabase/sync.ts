import { getPersistedSlice, useAppStore } from '../../store/useAppStore';
import { hasPersistedData, mergePersistedSlice, mergeProfile } from '../../store/mergePersisted';
import { getSupabase } from './client';
import { profileToRow, rowToProfile, syncRowToSnapshot, type CloudSnapshot } from './types';

export type SyncResult =
  | { ok: true; direction: 'pull' | 'push' | 'noop'; updatedAt: string }
  | { ok: false; error: string };

function snapshotFromStore(): CloudSnapshot {
  const state = useAppStore.getState();
  const slice = getPersistedSlice(state);
  return {
    ...slice,
    updatedAt: state.profile.updatedAt,
  };
}

/** Pull cloud data if newer than local; otherwise push local to cloud. */
export async function syncWithCloud(userId: string): Promise<SyncResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'Supabase não configurado.' };

  const local = snapshotFromStore();
  const localUpdated = new Date(local.profile.updatedAt).getTime();

  const [{ data: profileRow, error: profileError }, { data: syncRow, error: syncError }] =
    await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('user_sync').select('*').eq('user_id', userId).maybeSingle(),
    ]);

  if (profileError) return { ok: false, error: profileError.message };
  if (syncError) return { ok: false, error: syncError.message };

  const cloudSyncUpdated = syncRow?.updated_at ? new Date(syncRow.updated_at).getTime() : 0;

  if (syncRow && cloudSyncUpdated > localUpdated) {
    const cloudProfile = profileRow ? rowToProfile(profileRow) : local.profile;
    const cloudSnapshot = syncRowToSnapshot(syncRow, cloudProfile);
    const localSlice = getPersistedSlice(useAppStore.getState());
    const cloudHasData = hasPersistedData(cloudSnapshot);
    const localHasData = hasPersistedData(localSlice);

    if (!cloudHasData && localHasData) {
      // Cloud sync row is newer but empty — keep local meals and push up.
    } else {
      const merged = mergePersistedSlice(localSlice, {
        profile: cloudSnapshot.profile,
        loggedMeals: cloudSnapshot.loggedMeals,
        plannedMeals: cloudSnapshot.plannedMeals,
        recipes: cloudSnapshot.recipes,
        shopping: cloudSnapshot.shopping,
        mealPlanSummary: cloudSnapshot.mealPlanSummary,
        selectedHistoryDate: cloudSnapshot.selectedHistoryDate,
      });

      useAppStore.getState().replacePersistedState(merged);
      useAppStore.getState().setLastSyncedAt(cloudSnapshot.updatedAt);
      return { ok: true, direction: 'pull', updatedAt: cloudSnapshot.updatedAt };
    }
  }

  if (profileRow && !syncRow) {
    const mergedProfile = mergeProfile(local.profile, rowToProfile(profileRow));
    useAppStore.getState().updateProfile(mergedProfile);
  }

  const now = new Date().toISOString();
  const current = snapshotFromStore();
  const profilePayload = profileToRow({ ...current.profile, id: userId, updatedAt: now });

  const { error: upsertProfileError } = await supabase.from('profiles').upsert({
    ...profilePayload,
    updated_at: now,
  });

  if (upsertProfileError) return { ok: false, error: upsertProfileError.message };

  const { error: upsertSyncError } = await supabase.from('user_sync').upsert({
    user_id: userId,
    logged_meals: current.loggedMeals,
    planned_meals: current.plannedMeals,
    recipes: current.recipes,
    shopping: current.shopping,
    meal_plan_summary: current.mealPlanSummary,
    selected_history_date: current.selectedHistoryDate,
    updated_at: now,
  });

  if (upsertSyncError) return { ok: false, error: upsertSyncError.message };

  useAppStore.getState().updateProfile({ id: userId, updatedAt: now });
  useAppStore.getState().setLastSyncedAt(now);
  return { ok: true, direction: 'push', updatedAt: now };
}

/** Force push local state to cloud (after login or manual sync). */
export async function pushToCloud(userId: string): Promise<SyncResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'Supabase não configurado.' };

  const local = snapshotFromStore();
  const now = new Date().toISOString();
  const profilePayload = profileToRow({ ...local.profile, id: userId, updatedAt: now });

  const { error: profileError } = await supabase.from('profiles').upsert({
    ...profilePayload,
    updated_at: now,
  });
  if (profileError) return { ok: false, error: profileError.message };

  const { error: syncError } = await supabase.from('user_sync').upsert({
    user_id: userId,
    logged_meals: local.loggedMeals,
    planned_meals: local.plannedMeals,
    recipes: local.recipes,
    shopping: local.shopping,
    meal_plan_summary: local.mealPlanSummary,
    selected_history_date: local.selectedHistoryDate,
    updated_at: now,
  });
  if (syncError) return { ok: false, error: syncError.message };

  useAppStore.getState().updateProfile({ id: userId, updatedAt: now });
  useAppStore.getState().setLastSyncedAt(now);
  return { ok: true, direction: 'push', updatedAt: now };
}
