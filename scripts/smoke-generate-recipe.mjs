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
  goal: 'gain',
  restrictions: '',
  dailyGoals: { calories: 2600, protein: 170, carbs: 300, fat: 80 },
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

const rareOrGourmetTerms = [
  'trufa',
  'foie',
  'wagyu',
  'caviar',
  'vieira',
  'lagosta',
  'açafrão',
  'saffron',
  'tapioca',
  'requeijão',
  'leite condensado',
  'protein powder',
  'whey protein',
];

function isNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function outsidePercent(value, target, percent) {
  if (!isNumber(value) || !isNumber(target) || target <= 0) return false;
  return Math.abs(value - target) > target * percent;
}

function hasVagueQuantity(text) {
  return /\ba gosto\b/i.test(text) && !/\d/.test(text);
}

function allowsBatchServings(mealName) {
  return /\b(meal[- ]?prep|marmita|lote|sobras?|semana)\b/i.test(mealName);
}

function collectWarnings(recipe) {
  const warnings = [];

  if (recipe.ingredients.length > 8) {
    warnings.push(`ingredients.length > 8 (${recipe.ingredients.length})`);
  }

  if (recipe.steps.length < 4 || recipe.steps.length > 7) {
    warnings.push(`steps.length fora do intervalo 4-7 (${recipe.steps.length})`);
  }

  const numberedStep = recipe.steps.find((step) => /^\s*\d+[.)]/.test(step));
  if (numberedStep) {
    warnings.push(`step começa com numeração: "${numberedStep.slice(0, 60)}"`);
  }

  if (recipe.servings !== 1 && !allowsBatchServings(plannedMeal.name)) {
    warnings.push(`servings diferente de 1 sem card de meal-prep/lote (${recipe.servings})`);
  }

  if (outsidePercent(recipe.caloriesPerServing, plannedMeal.calories, 0.1)) {
    warnings.push(
      `caloriesPerServing fora de ±10% (${recipe.caloriesPerServing} vs ${plannedMeal.calories})`,
    );
  }

  if (profile.goal === 'gain' && recipe.proteinPerServing < plannedMeal.protein * 0.85) {
    warnings.push(
      `proteinPerServing abaixo de 85% do alvo em hipertrofia (${recipe.proteinPerServing} vs ${plannedMeal.protein})`,
    );
  } else if (outsidePercent(recipe.proteinPerServing, plannedMeal.protein, 0.1)) {
    warnings.push(
      `proteinPerServing fora de ±10% (${recipe.proteinPerServing} vs ${plannedMeal.protein})`,
    );
  }

  if (outsidePercent(recipe.carbsPerServing, plannedMeal.carbs, 0.15)) {
    warnings.push(`carbsPerServing fora de ±15% (${recipe.carbsPerServing} vs ${plannedMeal.carbs})`);
  }

  if (outsidePercent(recipe.fatPerServing, plannedMeal.fat, 0.15)) {
    warnings.push(`fatPerServing fora de ±15% (${recipe.fatPerServing} vs ${plannedMeal.fat})`);
  }

  for (const ingredient of recipe.ingredients) {
    const label = `${ingredient.name ?? ''} ${ingredient.amount ?? ''}`;
    const lower = label.toLowerCase();
    const rareTerm = rareOrGourmetTerms.find((term) => lower.includes(term));
    if (rareTerm) {
      warnings.push(`possível ingrediente gourmet/raro: "${rareTerm}"`);
    }
    if (hasVagueQuantity(label)) {
      warnings.push(`quantidade vaga sem número: "${label}"`);
    }
  }

  return warnings;
}

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
  const requiredMacroFields = [
    'caloriesPerServing',
    'proteinPerServing',
    'carbsPerServing',
    'fatPerServing',
  ];
  const hasRequiredShape =
    typeof recipe?.name === 'string' &&
    isNumber(recipe?.servings) &&
    Array.isArray(recipe?.ingredients) &&
    recipe.ingredients.length > 0 &&
    Array.isArray(recipe?.steps) &&
    recipe.steps.length > 0 &&
    requiredMacroFields.every((field) => isNumber(recipe?.[field]));
  const warnings = hasRequiredShape ? collectWarnings(recipe) : [];
  const ok =
    res.status === 200 &&
    json?.ok === true &&
    hasRequiredShape;

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
        proteinPerServing: recipe?.proteinPerServing ?? null,
        carbsPerServing: recipe?.carbsPerServing ?? null,
        fatPerServing: recipe?.fatPerServing ?? null,
        warnings,
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
