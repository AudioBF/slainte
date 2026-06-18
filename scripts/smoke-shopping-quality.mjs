/**
 * Smoke: shopping list quality from plannedMeals (Shopping Quality v1).
 * Usage: node scripts/smoke-shopping-quality.mjs
 */
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { fetchPlannedMealsFromEdge } from './fixtures/lightweight-meal-plan.mjs';

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

function normalizeName(name) {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

function countDuplicateNames(items) {
  const seen = new Set();
  let dupes = 0;
  for (const item of items) {
    const key = normalizeName(item.name);
    if (!key) continue;
    if (seen.has(key)) dupes += 1;
    else seen.add(key);
  }
  return dupes;
}

function countVagueItems(items) {
  const vague = /variad|temperos?\b|acompanhamento|misc|assorted/i;
  return items.filter((i) => vague.test(i.name)).length;
}

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
    items: json?.data?.items ?? [],
  };
}

async function main() {
  const supabase = createClient(url, anon);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session?.access_token) {
    throw new Error(`Auth failed: ${error?.message ?? 'no session'}`);
  }
  const token = data.session.access_token;

  const { plannedMeals, source: planSource } = await fetchPlannedMealsFromEdge(
    url,
    anon,
    token,
  );
  if (plannedMeals.length < 21) {
    throw new Error(`Expected >=21 plannedMeals, got ${plannedMeals.length}`);
  }

  const plannedResult = await invokeShopping(token, {
    plannedMeals: plannedMeals.map(({ name, slot, dayIndex }) => ({ name, slot, dayIndex })),
  });
  const recipeResult = await invokeShopping(token, { recipes: [sampleRecipe] });

  const itemCount = plannedResult.items.length;
  const duplicateNames = countDuplicateNames(plannedResult.items);
  const vagueCount = countVagueItems(plannedResult.items);

  const plannedOk =
    plannedResult.ok &&
    itemCount >= 28 &&
    itemCount <= 55 &&
    duplicateNames === 0 &&
    vagueCount <= 2;

  const recipeFallbackOk = recipeResult.ok && recipeResult.items.length >= 3;

  const ok = plannedOk && recipeFallbackOk;

  console.log(
    JSON.stringify(
      {
        ok,
        planSource,
        plannedMeals: plannedMeals.length,
        itemCount,
        duplicateNames,
        vagueCount,
        recipeFallbackItems: recipeResult.items.length,
        plannedDurationMs: plannedResult.durationMs,
        recipeDurationMs: recipeResult.durationMs,
        sampleItems: plannedResult.items.slice(0, 5).map((i) => `${i.name} (${i.quantity})`),
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
