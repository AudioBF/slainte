import { LoggedMeal, Market, PlannedMeal, Recipe, ShoppingItem, UserProfile } from '../types';

export const mockProfile: UserProfile = {
  goal: 'maintain',
  restrictions: 'Sem glúten. Prefiro refeições com frango e vegetais.',
  dailyGoals: {
    calories: 2100,
    protein: 140,
    carbs: 220,
    fat: 65,
  },
};

export const mockRecipes: Recipe[] = [
  {
    id: 'r1',
    name: 'Bowl de frango e arroz',
    servings: 4,
    ingredients: [
      { name: 'Peito de frango', amount: '600 g' },
      { name: 'Arroz basmati', amount: '300 g' },
      { name: 'Brócolis', amount: '400 g' },
      { name: 'Azeite', amount: '2 col. sopa' },
    ],
    steps: [
      'Cozinhe o arroz conforme a embalagem.',
      'Grelhe o frango temperado com sal, pimenta e alho.',
      'Refogue o brócolis no azeite até ficar al dente.',
      'Monte os bowls e divida em 4 porções.',
    ],
    caloriesPerServing: 485,
    proteinPerServing: 42,
    carbsPerServing: 48,
    fatPerServing: 12,
  },
  {
    id: 'r2',
    name: 'Omelete de legumes',
    servings: 2,
    ingredients: [
      { name: 'Ovos', amount: '4 un' },
      { name: 'Espinafre', amount: '100 g' },
      { name: 'Tomate cereja', amount: '150 g' },
      { name: 'Queijo cottage', amount: '80 g' },
    ],
    steps: [
      'Bata os ovos com sal e pimenta.',
      'Refogue os legumes rapidamente.',
      'Despeje os ovos e cozinhe em fogo médio.',
      'Finalize com cottage e dobre ao meio.',
    ],
    caloriesPerServing: 320,
    proteinPerServing: 24,
    carbsPerServing: 8,
    fatPerServing: 22,
  },
];

const today = new Date().toISOString().slice(0, 10);

export const mockLoggedMeals: LoggedMeal[] = [
  {
    id: 'm1',
    date: today,
    slot: 'breakfast',
    name: 'Omelete de legumes',
    fromPlan: true,
    components: [
      { id: 'c1', name: 'Ovos', weightGrams: 120, calories: 186, protein: 15, carbs: 1, fat: 13 },
      { id: 'c2', name: 'Espinafre', weightGrams: 50, calories: 12, protein: 1, carbs: 2, fat: 0 },
      { id: 'c3', name: 'Queijo cottage', weightGrams: 40, calories: 39, protein: 6, carbs: 2, fat: 1 },
    ],
  },
  {
    id: 'm2',
    date: today,
    slot: 'lunch',
    name: 'Bowl de frango',
    fromPlan: false,
    components: [
      { id: 'c4', name: 'Frango grelhado', weightGrams: 180, calories: 297, protein: 55, carbs: 0, fat: 7 },
      { id: 'c5', name: 'Arroz', weightGrams: 150, calories: 195, protein: 4, carbs: 43, fat: 0 },
      { id: 'c6', name: 'Brócolis', weightGrams: 100, calories: 34, protein: 3, carbs: 7, fat: 0 },
    ],
  },
];

export const mockPlannedMeals: PlannedMeal[] = [
  { id: 'p1', dayIndex: 0, slot: 'breakfast', time: '08:00', name: 'Omelete de legumes', recipeId: 'r2', calories: 320, protein: 24, carbs: 8, fat: 22 },
  { id: 'p2', dayIndex: 0, slot: 'lunch', time: '13:00', name: 'Bowl de frango e arroz', recipeId: 'r1', calories: 485, protein: 42, carbs: 48, fat: 12 },
  { id: 'p3', dayIndex: 0, slot: 'dinner', time: '19:30', name: 'Bowl de frango e arroz', recipeId: 'r1', calories: 485, protein: 42, carbs: 48, fat: 12 },
  { id: 'p4', dayIndex: 1, slot: 'breakfast', time: '08:00', name: 'Omelete de legumes', recipeId: 'r2', calories: 320, protein: 24, carbs: 8, fat: 22 },
  { id: 'p5', dayIndex: 1, slot: 'lunch', time: '13:00', name: 'Bowl de frango e arroz', recipeId: 'r1', calories: 485, protein: 42, carbs: 48, fat: 12 },
  { id: 'p6', dayIndex: 1, slot: 'dinner', time: '19:30', name: 'Salada com atum', calories: 380, protein: 35, carbs: 18, fat: 16 },
];

export const mockShopping: ShoppingItem[] = [
  { id: 's1', name: 'Peito de frango', quantity: 'aprox 1,2 kg', checked: false, fromPlan: true },
  { id: 's2', name: 'Arroz basmati', quantity: 'aprox 1 kg', checked: false, fromPlan: true },
  { id: 's3', name: 'Brócolis', quantity: 'aprox 800 g', checked: true, fromPlan: true },
  { id: 's4', name: 'Ovos', quantity: 'aprox 12 un', checked: false, fromPlan: true },
  { id: 's5', name: 'Espinafre', quantity: 'aprox 200 g', checked: false, fromPlan: true },
  { id: 's6', name: 'Banana', quantity: 'aprox 5 un', checked: false, fromPlan: false },
];

export const mockMarkets: Market[] = [
  { id: 'lidl', name: 'Lidl', color: '#0050AA', searchQuery: 'Lidl Dublin Ireland' },
  { id: 'aldi', name: 'Aldi', color: '#00005F', searchQuery: 'Aldi Dublin Ireland' },
  { id: 'tesco', name: 'Tesco', color: '#EE1C2E', searchQuery: 'Tesco Dublin Ireland' },
  { id: 'dunnes', name: 'Dunnes', color: '#C41230', searchQuery: 'Dunnes Stores Dublin Ireland' },
  { id: 'supervalu', name: 'SuperValu', color: '#E31837', searchQuery: 'SuperValu Dublin Ireland' },
  { id: 'centra', name: 'Centra / Spar', color: '#00A651', searchQuery: 'Centra Dublin Ireland' },
  { id: 'ms', name: 'M&S Food', color: '#000000', searchQuery: 'Marks and Spencer Food Dublin Ireland' },
];

export const weekCalorieTrend = [1980, 2150, 2050, 2200, 1890, 2100, 1920];

export const mockPhotoAnalysis = {
  components: [
    { id: 'a1', name: 'Bife grelhado', weightGrams: 180, calories: 360, protein: 48, carbs: 0, fat: 18 },
    { id: 'a2', name: 'Batata assada', weightGrams: 150, calories: 135, protein: 3, carbs: 31, fat: 0 },
    { id: 'a3', name: 'Salada mista', weightGrams: 80, calories: 25, protein: 2, carbs: 4, fat: 1 },
    { id: 'a4', name: 'Molho de ervas', weightGrams: 20, calories: 45, protein: 0, carbs: 2, fat: 4 },
  ],
};
