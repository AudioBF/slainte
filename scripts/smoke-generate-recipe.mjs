/**
 * Smoke test for generate-recipe Edge function.
 * Usage: node scripts/smoke-generate-recipe.mjs
 */
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

function loadEnv() {
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    const k = t.slice(0, i);
    if (!process.env[k]) process.env[k] = t.slice(i + 1);
  }
}

loadEnv();

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const email = process.env.DIAG_EMAIL || 'slainte.phase3b.ui+1781627000000@example.com';
const password = process.env.DIAG_PASSWORD || 'Phase3BTest!123456';

const profile = {
  goal: 'maintain',
  restrictions: '',
  dailyGoals: { calories: 2100, protein: 140, carbs: 220, fat: 65 },
};

const plannedMeal = {
  id: 'smoke-meal-1',
  name: 'Frango grelhado com batata doce',
  slot: 'lunch',
  dayIndex: 1,
  calories: 520,
  protein: 42,
  carbs: 48,
  fat: 14,
};

async function main() {
  if (!url || !anon) {
    throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY');
  }

  const supabase = createClient(url, anon);
  const { data: auth, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (authError || !auth.session?.access_token) {
    throw new Error(`Auth failed: ${authError?.message ?? 'no session'}`);
  }

  const started = Date.now();
  const res = await fetch(`${url}/functions/v1/generate-recipe`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${auth.session.access_token}`,
      apikey: anon,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ profile, plannedMeal }),
  });
  const durationMs = Date.now() - started;
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }

  const recipe = json?.data;
  const ok =
    res.status === 200 &&
    json?.ok === true &&
    typeof recipe?.name === 'string' &&
    Array.isArray(recipe?.ingredients) &&
    recipe.ingredients.length > 0 &&
    Array.isArray(recipe?.steps) &&
    recipe.steps.length > 0;

  console.log(
    JSON.stringify(
      {
        ok,
        durationMs,
        httpStatus: res.status,
        code: json?.code,
        name: recipe?.name ?? null,
        ingredients: recipe?.ingredients?.length ?? null,
        steps: recipe?.steps?.length ?? null,
        servings: recipe?.servings ?? null,
        caloriesPerServing: recipe?.caloriesPerServing ?? null,
      },
      null,
      2,
    ),
  );

  if (!ok) {
    console.error('Response body:', text.slice(0, 500));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
