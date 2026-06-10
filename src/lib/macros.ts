/** Inteiro para kcal e gramas de macro — evita 48.09999999999994g na UI. */
export function roundMacro(value: number): number {
  return Math.round(Number(value) || 0);
}

export function roundMacros<T extends { calories: number; protein: number; carbs: number; fat: number }>(
  m: T,
): T {
  return {
    ...m,
    calories: roundMacro(m.calories),
    protein: roundMacro(m.protein),
    carbs: roundMacro(m.carbs),
    fat: roundMacro(m.fat),
  };
}

export function roundMealComponent<T extends {
  weightGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}>(c: T): T {
  return {
    ...c,
    ...roundMacros(c),
    weightGrams: roundMacro(c.weightGrams),
  };
}
