/**
 * Sláinte AI stack — verified against live API (June 2026).
 *
 * Vision:       gemini-2.5-flash  — validated on real food photos
 * Meal plan:    gemini-2.5-flash — rápido; Pro só se restrições longas
 * Shopping:     gemini-2.5-flash-lite — simple consolidation, lowest cost
 * Complex diet: gemini-2.5-pro    — long medical restrictions only
 *
 * Deprecated — do NOT use: gemini-1.5-*, gemini-2.0-* (404 on generateContent)
 */
export const AI_MODELS = {
  vision: 'gemini-2.5-flash',
  mealPlan: 'gemini-2.5-flash',
  mealPlanPro: 'gemini-2.5-pro',
  shoppingList: 'gemini-2.5-flash-lite',
} as const;

/** Per-task fallback chains — only models confirmed available on the API */
export const AI_MODEL_FALLBACKS = {
  vision: ['gemini-3.5-flash', 'gemini-2.5-flash-lite', 'gemini-3.1-flash-lite'],
  mealPlan: ['gemini-3.5-flash', 'gemini-2.5-pro', 'gemini-2.5-flash-lite'],
  shoppingList: ['gemini-3.1-flash-lite', 'gemini-2.5-flash'],
} as const satisfies Record<'vision' | 'mealPlan' | 'shoppingList', readonly string[]>;

export const AI_LIMITS = {
  maxPhotoSizeMb: 4,
  mealPlanDays: 7,
  maxRetries: 2,
  mealPlanMaxRetries: 1,
  requestTimeoutMs: 50_000,
  mealPlanTimeoutMs: 120_000,
} as const;
