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
 */
import { parseMacroConsistencyFlag } from './parseMacroConsistencyFlag';

export { parseMacroConsistencyFlag } from './parseMacroConsistencyFlag';

export const env = {
  geminiApiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '',
  aiMock: process.env.EXPO_PUBLIC_AI_MOCK !== 'false',
  useEdgeMealPlan: process.env.EXPO_PUBLIC_USE_EDGE_MEAL_PLAN === 'true',
  useMacroConsistency: parseMacroConsistencyFlag(
    process.env.EXPO_PUBLIC_USE_MACRO_CONSISTENCY,
  ),
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  isDev: __DEV__,
} as const;

export function hasGeminiKey(): boolean {
  return env.geminiApiKey.length > 0;
}

export function hasSupabase(): boolean {
  return env.supabaseUrl.length > 0 && env.supabaseAnonKey.length > 0;
}
