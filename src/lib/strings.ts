/** Portuguese servings label: "1 porção" vs "N porções". */
export function formatServingsPt(servings: number): string {
  const n = Math.round(servings);
  if (n === 1) return '1 porção';
  return `${n} porções`;
}
