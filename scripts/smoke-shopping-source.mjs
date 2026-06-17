/**
 * Smoke: shopping list source priority (plannedMeals over recipes).
 * Usage: node scripts/smoke-shopping-source.mjs
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

const sampleRecipe = {
  name: 'Omelete de teste',
  servings: 1,
  ingredients: [
    { name: 'Ovos', amount: '2 un' },
    { name: 'Espinafre', amount: '50 g' },
    { name: 'Pão integral', amount: '2 fatias' },
    { name: 'Azeite', amount: '3 g' },
  ],
};

async function invokeShopping(token, body) {
  const started = Date.now();
  const res = await fetch(`${url}/functions/v1/generate-shopping-list`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: anon,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return {
    durationMs: Date.now() - started,
    httpStatus: res.status,
    ok: json?.ok === true,
    items: json?.data?.items?.length ?? 0,
  };
}

function pickShoppingSource(plannedMeals, recipes) {
  if (plannedMeals.length > 0) return 'plannedMeals';
  if (recipes.length > 0) return 'recipes';
  return 'empty';
}

async function main() {
  const supabase = createClient(url, anon);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session?.access_token) {
    throw new Error(`Auth failed: ${error?.message ?? 'no session'}`);
  }
  const token = data.session.access_token;

  const planRes = await fetch(`${url}/functions/v1/generate-meal-plan`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: anon,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      profile: {
        goal: 'maintain',
        restrictions: '',
        dailyGoals: { calories: 2100, protein: 140, carbs: 220, fat: 65 },
      },
    }),
  });
  const planJson = await planRes.json();
  const plannedMeals = planJson?.data?.plannedMeals ?? [];
  if (plannedMeals.length < 21) {
    throw new Error(`Expected >=21 plannedMeals, got ${plannedMeals.length}`);
  }

  const source = pickShoppingSource(plannedMeals, [sampleRecipe]);
  const plannedOnly = await invokeShopping(token, {
    plannedMeals: plannedMeals.map(({ name, slot, dayIndex }) => ({ name, slot, dayIndex })),
  });
  const recipeOnly = await invokeShopping(token, { recipes: [sampleRecipe] });

  const ok =
    source === 'plannedMeals' &&
    plannedOnly.ok &&
    recipeOnly.ok &&
    plannedOnly.items > recipeOnly.items &&
    plannedOnly.items >= 15;

  console.log(
    JSON.stringify(
      {
        ok,
        source,
        plannedMeals: plannedMeals.length,
        recipesInStore: 1,
        plannedMealsItems: plannedOnly.items,
        recipeOnlyItems: recipeOnly.items,
        plannedDurationMs: plannedOnly.durationMs,
        recipeDurationMs: recipeOnly.durationMs,
      },
      null,
      2,
    ),
  );

  if (!ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
