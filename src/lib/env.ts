/**
 * Typed environment access for Expo.
 *
 * Security note: EXPO_PUBLIC_* vars ship in the client bundle.
 * For production, route Gemini calls through a backend proxy and keep the key server-side.
 *
 * EXPO_PUBLIC_USE_MACRO_CONSISTENCY (default OFF — só ON com "true"):
 * - ON: bloqueia save quando o usuário ALTERA metas nutricionais inconsistentes.
 * - OFF: save compatível com o comportamento anterior (sem bloqueio).
 *
 * A flag NÃO controla:
 * - funções puras Atwater (sempre disponíveis);
 * - aviso inline informativo no Perfil;
 * - ação manual “Recalcular carboidratos”;
 * - normalização determinística do payload do gerador de cardápio (proteção interna,
 *   sem mutar o store; meta impossível falha com erro controlado).
 *
 * EXPO_PUBLIC_USE_DAY_TARGETS (default OFF — só ON com "true"):
 * - ON: Hoje/Semana usam meta efetiva por data (override → agenda → perfil).
 * - OFF: Hoje/Semana usam profile.dailyGoals (source flag_off); /schedule não altera metas.
 *
 * EXPO_PUBLIC_USE_MULTI_TARGET_MEAL_PLAN (default OFF — só ON com "true"):
 * - Multi-target efetivo = useDayTargets && useMultiTargetMealPlan.
 * - Ambos ON: Dieta gera cardápio V2 com metas por dia (exige Edge, exceto mock/E2E).
 * - Caso contrário: Dieta permanece V1 mono-meta.
 */
import { parseDayTargetsFlag } from '../domain/day-targets';
import {
  isMultiTargetMealPlanEnabled,
  parseMultiTargetMealPlanFlag,
} from '../domain/meal-plan-targets';
import { parseMacroConsistencyFlag } from './parseMacroConsistencyFlag';

export { parseMacroConsistencyFlag } from './parseMacroConsistencyFlag';
export { parseDayTargetsFlag } from '../domain/day-targets';
export {
  parseMultiTargetMealPlanFlag,
  isMultiTargetMealPlanEnabled,
} from '../domain/meal-plan-targets';

export const env = {
  geminiApiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '',
  aiMock: process.env.EXPO_PUBLIC_AI_MOCK !== 'false',
  useEdgeMealPlan: process.env.EXPO_PUBLIC_USE_EDGE_MEAL_PLAN === 'true',
  useMacroConsistency: parseMacroConsistencyFlag(
    process.env.EXPO_PUBLIC_USE_MACRO_CONSISTENCY,
  ),
  useDayTargets: parseDayTargetsFlag(process.env.EXPO_PUBLIC_USE_DAY_TARGETS),
  useMultiTargetMealPlan: parseMultiTargetMealPlanFlag(
    process.env.EXPO_PUBLIC_USE_MULTI_TARGET_MEAL_PLAN,
  ),
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  isDev: __DEV__,
} as const;

/** Multi-target de cardápio só com DAY_TARGETS + MULTI_TARGET ambos ON. */
export function isMultiTargetMealPlanEffective(): boolean {
  return isMultiTargetMealPlanEnabled(env.useDayTargets, env.useMultiTargetMealPlan);
}

export function hasGeminiKey(): boolean {
  return env.geminiApiKey.length > 0;
}

export function hasSupabase(): boolean {
  return env.supabaseUrl.length > 0 && env.supabaseAnonKey.length > 0;
}
