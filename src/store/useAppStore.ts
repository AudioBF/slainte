import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mockMarkets } from '../data/mock';
import { DEFAULT_DAILY_GOALS, createDefaultAccount, type UserAccount } from '../features/profile/types';
import { APP } from '../constants/app';
import { createId } from '../lib/id';
import { roundMacro, roundMealComponent } from '../lib/macros';
import { STORAGE_KEYS } from '../services/storage';
import {
  LoggedMeal,
  MacroTotals,
  MealComponent,
  PlannedMeal,
  Recipe,
  ShoppingItem,
} from '../types';
import {
  selectTodayActual,
  selectTodayPlanned,
  selectWeekComparison,
  todayDayIndex,
  todayISO,
} from './selectors';

const initialProfile: UserAccount = {
  ...createDefaultAccount(),
  goal: 'maintain',
  restrictions: '',
  dailyGoals: DEFAULT_DAILY_GOALS.maintain,
};

function applyComponentPatch(component: MealComponent, patch: Partial<MealComponent>): MealComponent {
  const updated = { ...component, ...patch };
  if (patch.weightGrams !== undefined && component.weightGrams > 0) {
    const ratio = patch.weightGrams / component.weightGrams;
    updated.calories = roundMacro(component.calories * ratio);
    updated.protein = roundMacro(component.protein * ratio);
    updated.carbs = roundMacro(component.carbs * ratio);
    updated.fat = roundMacro(component.fat * ratio);
  }
  return roundMealComponent(updated);
}

type PersistedSlice = {
  profile: UserAccount;
  loggedMeals: LoggedMeal[];
  plannedMeals: PlannedMeal[];
  recipes: Recipe[];
  shopping: ShoppingItem[];
  mealPlanSummary: string | null;
  selectedHistoryDate: string;
};

type AppState = PersistedSlice & {
  markets: typeof mockMarkets;
  photoDraft: MealComponent[] | null;
  selectedDietDay: number;
  viewMode: 'today' | 'week';
  lastSyncedAt: string | null;
  updateProfile: (patch: Partial<UserAccount>) => void;
  completeOnboarding: (patch: Partial<UserAccount>) => void;
  resetOnboarding: () => void;
  toggleShoppingItem: (id: string) => void;
  addShoppingItem: (name: string, quantity: string) => void;
  removeShoppingItem: (id: string) => void;
  clearCheckedShopping: () => void;
  setSelectedDietDay: (day: number) => void;
  setViewMode: (mode: 'today' | 'week') => void;
  setSelectedHistoryDate: (date: string) => void;
  setPhotoDraft: (components: MealComponent[] | null) => void;
  updatePhotoComponent: (id: string, patch: Partial<MealComponent>) => void;
  removePhotoComponent: (id: string) => void;
  addPhotoComponent: (component: MealComponent) => void;
  confirmPhotoMeal: (
    slot: LoggedMeal['slot'],
    name: string,
    options?: { plannedMealId?: string },
  ) => void;
  logPlannedMeal: (meal: PlannedMeal) => boolean;
  updateLoggedMeal: (id: string, patch: Partial<Pick<LoggedMeal, 'name' | 'slot'>>) => void;
  removeLoggedMeal: (id: string) => void;
  updateLoggedComponent: (mealId: string, componentId: string, patch: Partial<MealComponent>) => void;
  removeLoggedComponent: (mealId: string, componentId: string) => void;
  addLoggedComponent: (mealId: string, component: MealComponent) => void;
  setMealPlan: (plannedMeals: PlannedMeal[], recipes: Recipe[], summary?: string) => void;
  setShopping: (items: ShoppingItem[]) => void;
  replacePersistedState: (slice: PersistedSlice) => void;
  setLastSyncedAt: (iso: string | null) => void;
  getTodayActual: () => MacroTotals;
  getTodayPlanned: () => MacroTotals;
  getWeekComparison: () => { planned: MacroTotals; actual: MacroTotals };
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      profile: initialProfile,
      loggedMeals: [],
      plannedMeals: [],
      shopping: [],
      recipes: [],
      markets: mockMarkets,
      photoDraft: null,
      selectedDietDay: todayDayIndex(),
      viewMode: 'today',
      mealPlanSummary: null,
      selectedHistoryDate: todayISO(),
      lastSyncedAt: null,

      updateProfile: (patch) =>
        set((s) => ({
          profile: { ...s.profile, ...patch, updatedAt: new Date().toISOString() },
        })),

      completeOnboarding: (patch) =>
        set((s) => ({
          profile: {
            ...s.profile,
            ...patch,
            onboardingComplete: true,
            updatedAt: new Date().toISOString(),
          },
          loggedMeals: [],
          plannedMeals: [],
          recipes: [],
          shopping: [],
          mealPlanSummary: null,
          selectedHistoryDate: todayISO(),
        })),

      resetOnboarding: () =>
        set((s) => ({
          profile: { ...s.profile, onboardingComplete: false },
        })),

      toggleShoppingItem: (id) =>
        set((s) => ({
          shopping: s.shopping.map((item) =>
            item.id === id ? { ...item, checked: !item.checked } : item,
          ),
        })),

      addShoppingItem: (name, quantity) =>
        set((s) => ({
          shopping: [
            ...s.shopping,
            { id: createId('shop'), name, quantity, checked: false, fromPlan: false },
          ],
        })),

      removeShoppingItem: (id) =>
        set((s) => ({
          shopping: s.shopping.filter((item) => item.id !== id),
        })),

      clearCheckedShopping: () =>
        set((s) => ({
          shopping: s.shopping.filter((item) => !item.checked),
        })),

      setMealPlan: (plannedMeals, recipes, summary) =>
        set((s) => ({
          plannedMeals,
          recipes,
          selectedDietDay: todayDayIndex(),
          mealPlanSummary: summary ?? null,
          profile: { ...s.profile, updatedAt: new Date().toISOString() },
        })),

      setShopping: (items) => set({ shopping: items }),

      replacePersistedState: (slice) => set(slice),

      setLastSyncedAt: (iso) => set({ lastSyncedAt: iso }),

      setSelectedDietDay: (day) => set({ selectedDietDay: day }),
      setViewMode: (mode) => set({ viewMode: mode }),
      setSelectedHistoryDate: (date) => set({ selectedHistoryDate: date }),
      setPhotoDraft: (components) => set({ photoDraft: components }),

      updatePhotoComponent: (id, patch) =>
        set((s) => {
          if (!s.photoDraft) return s;
          return {
            photoDraft: s.photoDraft.map((c) =>
              c.id === id ? applyComponentPatch(c, patch) : c,
            ),
          };
        }),

      addPhotoComponent: (component) =>
        set((s) => ({
          photoDraft: s.photoDraft ? [...s.photoDraft, component] : [component],
        })),

      removePhotoComponent: (id) =>
        set((s) => {
          if (!s.photoDraft) return s;
          const next = s.photoDraft.filter((c) => c.id !== id);
          return { photoDraft: next.length ? next : null };
        }),

      confirmPhotoMeal: (slot, name, options) => {
        const { photoDraft } = get();
        if (!photoDraft?.length) return;
        const now = new Date().toISOString();
        const meal: LoggedMeal = {
          id: createId('meal'),
          date: todayISO(),
          slot,
          name,
          components: photoDraft,
          fromPlan: Boolean(options?.plannedMealId),
          plannedMealId: options?.plannedMealId,
        };
        set((s) => ({
          loggedMeals: [...s.loggedMeals, meal],
          photoDraft: null,
          selectedHistoryDate: todayISO(),
          viewMode: 'today',
          profile: { ...s.profile, updatedAt: now },
        }));
      },

      logPlannedMeal: (meal) => {
        if (meal.dayIndex !== todayDayIndex()) {
          return false;
        }
        const { loggedMeals } = get();
        const today = todayISO();
        if (loggedMeals.some((m) => m.date === today && m.plannedMealId === meal.id)) {
          return false;
        }
        const logged: LoggedMeal = {
          id: createId('meal'),
          date: today,
          slot: meal.slot,
          name: meal.name,
          fromPlan: true,
          plannedMealId: meal.id,
          components: [
            {
              id: createId('comp'),
              name: meal.name,
              weightGrams: 0,
              calories: meal.calories,
              protein: meal.protein,
              carbs: meal.carbs,
              fat: meal.fat,
            },
          ],
        };
        set((s) => ({
          loggedMeals: [...s.loggedMeals, logged],
          selectedHistoryDate: todayISO(),
          viewMode: 'today',
          profile: { ...s.profile, updatedAt: new Date().toISOString() },
        }));
        return true;
      },

      updateLoggedMeal: (id, patch) =>
        set((s) => ({
          loggedMeals: s.loggedMeals.map((meal) =>
            meal.id === id ? { ...meal, ...patch } : meal,
          ),
        })),

      removeLoggedMeal: (id) =>
        set((s) => ({
          loggedMeals: s.loggedMeals.filter((meal) => meal.id !== id),
        })),

      updateLoggedComponent: (mealId, componentId, patch) =>
        set((s) => ({
          loggedMeals: s.loggedMeals.map((meal) => {
            if (meal.id !== mealId) return meal;
            return {
              ...meal,
              components: meal.components.map((c) =>
                c.id === componentId ? applyComponentPatch(c, patch) : c,
              ),
            };
          }),
        })),

      removeLoggedComponent: (mealId, componentId) =>
        set((s) => ({
          loggedMeals: s.loggedMeals.map((meal) => {
            if (meal.id !== mealId) return meal;
            const components = meal.components.filter((c) => c.id !== componentId);
            return components.length ? { ...meal, components } : meal;
          }),
        })),

      addLoggedComponent: (mealId, component) =>
        set((s) => ({
          loggedMeals: s.loggedMeals.map((meal) =>
            meal.id === mealId
              ? { ...meal, components: [...meal.components, component] }
              : meal,
          ),
        })),

      getTodayActual: () => selectTodayActual(get().loggedMeals),

      getTodayPlanned: () => selectTodayPlanned(get().plannedMeals),

      getWeekComparison: () => selectWeekComparison(get().loggedMeals, get().plannedMeals),
    }),
    {
      name: STORAGE_KEYS.appState,
      storage: createJSONStorage(() => AsyncStorage),
      version: APP.storageVersion,
      migrate: (persisted, version) => {
        const state = persisted as Partial<PersistedSlice & { profile?: Partial<UserAccount> }>;
        const profile: UserAccount = {
          ...createDefaultAccount(),
          ...state.profile,
          dailyGoals: state.profile?.dailyGoals ?? DEFAULT_DAILY_GOALS.maintain,
          onboardingComplete:
            state.profile?.onboardingComplete ??
            Boolean(state.profile?.displayName?.trim()),
        };
        return {
          ...state,
          profile,
          selectedHistoryDate: state.selectedHistoryDate ?? todayISO(),
        } as PersistedSlice;
      },
      partialize: (s) => ({
        profile: s.profile,
        loggedMeals: s.loggedMeals,
        plannedMeals: s.plannedMeals,
        recipes: s.recipes,
        shopping: s.shopping,
        mealPlanSummary: s.mealPlanSummary,
        selectedHistoryDate: s.selectedHistoryDate,
      }),
    },
  ),
);

/** True after persisted state has been restored from AsyncStorage. */
export function useStoreHydrated(): boolean {
  const [hydrated, setHydrated] = useState(useAppStore.persist.hasHydrated());

  useEffect(() => {
    const unsub = useAppStore.persist.onFinishHydration(() => setHydrated(true));
    return unsub;
  }, []);

  return hydrated;
}

export function getPersistedSlice(state: AppState): PersistedSlice {
  return {
    profile: state.profile,
    loggedMeals: state.loggedMeals,
    plannedMeals: state.plannedMeals,
    recipes: state.recipes,
    shopping: state.shopping,
    mealPlanSummary: state.mealPlanSummary,
    selectedHistoryDate: state.selectedHistoryDate,
  };
}
