/**
 * Test Supabase connectivity and RLS tables (no auth required for table probe).
 * Usage: node scripts/test-supabase.mjs
 */
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

function loadEnv() {
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!url || !key) {
  console.error('❌ EXPO_PUBLIC_SUPABASE_URL ou EXPO_PUBLIC_SUPABASE_ANON_KEY ausentes no .env');
  process.exit(1);
}

console.log('URL:', url.replace(/https:\/\/([^.]+).*/, 'https://$1...'));
console.log('Key:', key.slice(0, 12) + '...');

const supabase = createClient(url, key);

const { data: health, error: healthError } = await supabase.from('profiles').select('id', { count: 'exact', head: true });

if (healthError) {
  console.error('❌ Falha ao acessar tabela profiles:', healthError.message);
  if (healthError.message.includes('relation') || healthError.code === '42P01') {
    console.error('   → Rode supabase/schema.sql no SQL Editor.');
  }
  process.exit(1);
}

console.log('✅ Tabela profiles acessível (RLS ativo — leitura anônima retorna vazio, ok)');

const { error: syncError } = await supabase.from('user_sync').select('user_id', { head: true });
if (syncError) {
  console.error('❌ Falha ao acessar tabela user_sync:', syncError.message);
  process.exit(1);
}
console.log('✅ Tabela user_sync acessível');

const { data: authData, error: authError } = await supabase.auth.getSession();
if (authError) {
  console.error('❌ Auth client error:', authError.message);
  process.exit(1);
}
console.log('✅ Auth client OK (sessão:', authData.session ? 'ativa' : 'nenhuma', ')');
console.log('\nPróximo passo: reinicie o Expo (npm start) e crie conta em Perfil → Entrar / Criar conta');
