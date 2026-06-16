/**
 * Ephemeral timeout-budget smoke — run after Edge deploy.
 * Usage: node scripts/smoke-meal-plan-budget.mjs [runs=5] [--delay ms]
 */
import { readFileSync, writeFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

function parseArgs(argv) {
  let runs = 5;
  let delayMs = 0;
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--delay') {
      delayMs = Number(argv[++i]);
      if (!Number.isFinite(delayMs) || delayMs < 0) {
        throw new Error('--delay must be a non-negative number (milliseconds)');
      }
    } else if (!Number.isNaN(Number(arg))) {
      runs = Number(arg);
    }
  }
  return { runs, delayMs };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
const { runs, delayMs } = parseArgs(process.argv);

const profile = {
  goal: 'maintain',
  restrictions: '',
  dailyGoals: { calories: 2100, protein: 140, carbs: 220, fat: 65 },
};

async function rawInvoke(token) {
  const started = Date.now();
  const res = await fetch(`${url}/functions/v1/generate-meal-plan`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: anon,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ profile }),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return {
    durationMs: Date.now() - started,
    httpStatus: res.status,
    envelopeCode: json?.code,
    ok: json?.ok,
    plannedMeals: json?.data?.plannedMeals?.length ?? null,
    plannedMealsData: json?.data?.plannedMeals ?? null,
    recipes: json?.data?.recipes?.length ?? 0,
    hasSummary: Boolean(json?.data?.summary),
    bodyPreview: text.slice(0, 200),
    is504Html: res.status === 504 && !json,
  };
}

async function main() {
  const supabase = createClient(url, anon);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const token = data.session?.access_token;
  if (!token) throw new Error('No session');

  const results = [];
  for (let i = 1; i <= runs; i++) {
    console.log(`Run ${i}/${runs}...`);
    results.push({ run: i, ...(await rawInvoke(token)) });
    if (i < runs && delayMs > 0) {
      console.log(`Waiting ${delayMs}ms before next run...`);
      await sleep(delayMs);
    }
  }

  const durations = results.map((r) => r.durationMs).sort((a, b) => a - b);
  const p95 = durations[Math.min(durations.length - 1, Math.ceil(durations.length * 0.95) - 1)];
  const lightweightOk = results
    .filter((r) => r.ok === true)
    .every((r) => r.recipes === 0 && (r.plannedMeals ?? 0) >= 21);

  let shoppingItems = null;
  const samplePlan = results.find((r) => r.ok && r.plannedMealsData?.length)?.plannedMealsData;
  if (samplePlan?.length) {
    console.log('Shopping smoke from plannedMeals...');
    const shopRes = await fetch(`${url}/functions/v1/generate-shopping-list`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: anon,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        plannedMeals: samplePlan.map(({ name, slot, dayIndex }) => ({ name, slot, dayIndex })),
      }),
    });
    const shopJson = await shopRes.json();
    shoppingItems = shopJson?.data?.items?.length ?? 0;
  }

  const summary = {
    timestamp: new Date().toISOString(),
    runs: results.length,
    delayMs,
    successCount: results.filter((r) => r.ok === true).length,
    lightweightOk,
    shoppingItems,
    timeoutStructured: results.filter((r) => r.envelopeCode === 'TIMEOUT').length,
    quotaExceeded: results.filter((r) => r.envelopeCode === 'QUOTA_EXCEEDED').length,
    platform504: results.filter((r) => r.is504Html).length,
    p95DurationMs: p95,
    results,
  };

  writeFileSync('docs/private/.meal-plan-budget-smoke.json', JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
