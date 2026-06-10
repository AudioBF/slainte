import { AI_MODELS } from '../../constants/ai';
import { hasGeminiKey } from '../../lib/env';

export type AiTask = 'vision' | 'mealPlan' | 'shoppingList';

export function getModelForTask(task: AiTask, useProFallback = false): string {
  switch (task) {
    case 'vision':
      return AI_MODELS.vision;
    case 'mealPlan':
      return useProFallback ? AI_MODELS.mealPlanPro : AI_MODELS.mealPlan;
    case 'shoppingList':
      return AI_MODELS.shoppingList;
  }
}

export function isAiAvailable(): boolean {
  return hasGeminiKey();
}
