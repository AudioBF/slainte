export type MacroGoals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type MacroTotals = MacroGoals;

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type MealComponent = {
  id: string;
  name: string;
  weightGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type LoggedMeal = {
  id: string;
  date: string;
  slot: MealSlot;
  name: string;
  components: MealComponent[];
  fromPlan?: boolean;
  plannedMealId?: string;
};

export type PlannedMeal = {
  id: string;
  dayIndex: number;
  slot: MealSlot;
  time: string;
  name: string;
  recipeId?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type Recipe = {
  id: string;
  name: string;
  servings: number;
  ingredients: { name: string; amount: string }[];
  steps: string[];
  caloriesPerServing: number;
  proteinPerServing: number;
  carbsPerServing: number;
  fatPerServing: number;
};

export type ShoppingItem = {
  id: string;
  name: string;
  quantity: string;
  checked: boolean;
  fromPlan: boolean;
};

export type Market = {
  id: string;
  name: string;
  color: string;
  searchQuery: string;
};

export type UserProfile = {
  goal: 'lose' | 'maintain' | 'gain';
  restrictions: string;
  dailyGoals: MacroGoals;
};

export type DaySummary = {
  date: string;
  planned: MacroTotals;
  actual: MacroTotals;
  meals: LoggedMeal[];
};
