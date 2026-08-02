import { env } from '../../../lib/env';
import {
  selectEffectiveNutritionTargetForDate,
} from './selectEffectiveNutritionTargetForDate';
import type { ResolvedEffectiveNutritionTarget } from './types';
import type { SelectEffectiveNutritionTargetInput } from './types';

/** Lê `env.useDayTargets` e delega à função pura (facilita testes ON/OFF via `flagEnabled`). */
export function selectEffectiveNutritionTargetForDateFromEnv(
  input: Omit<SelectEffectiveNutritionTargetInput, 'flagEnabled'>,
): ResolvedEffectiveNutritionTarget {
  return selectEffectiveNutritionTargetForDate({
    ...input,
    flagEnabled: env.useDayTargets,
  });
}
