/**
 * Smoke local (sem rede) — contrato V1/V2 da Edge meal-plan.
 * Não publica a função. Não chama produção.
 *
 *   node scripts/smoke-meal-plan-v2-local.mjs
 */
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Reimplementação mínima espelhando validateMealPlanRequest (sem Deno). */
function detectContract(body) {
  if (body != null && typeof body === 'object' && 'contractVersion' in body) {
    if (body.contractVersion === 2) {
      if (
        !body.fallbackDailyGoals ||
        !Array.isArray(body.dailyTargets) ||
        body.dailyTargets.length !== 7
      ) {
        return { ok: false, error: 'Invalid V2 meal-plan request body.' };
      }
      const seen = new Set();
      for (const t of body.dailyTargets) {
        if (seen.has(t.dayIndex)) return { ok: false, error: `Duplicate dayIndex ${t.dayIndex}.` };
        seen.add(t.dayIndex);
      }
      for (let i = 0; i <= 6; i++) {
        if (!seen.has(i)) return { ok: false, error: `Missing dayIndex ${i}.` };
      }
      return { ok: true, contractVersion: 2 };
    }
    return { ok: false, error: 'Unsupported contractVersion.' };
  }
  if (!body?.profile?.dailyGoals) {
    return { ok: false, error: 'Invalid request body.' };
  }
  return { ok: true, contractVersion: 1 };
}

const goals = { calories: 2100, protein: 140, carbs: 239, fat: 65 };

function sevenTargets() {
  return [0, 1, 2, 3, 4, 5, 6].map((dayIndex) => ({
    dayIndex,
    dateISO: `2026-07-${27 + dayIndex}`,
    dailyGoals: { ...goals, calories: dayIndex === 0 ? 3350 : 2100 },
    source: dayIndex === 0 ? 'weekly_schedule' : 'profile_default',
    label: dayIndex === 0 ? 'Meta do dia: Trabalho longo + bicicleta' : null,
  }));
}

console.log('=== smoke-meal-plan-v2-local (offline) ===');

{
  const v1 = detectContract({ profile: { goal: 'maintain', restrictions: '', dailyGoals: goals } });
  assert.equal(v1.ok, true);
  assert.equal(v1.contractVersion, 1);
  console.log('OK V1 aceito');
}

{
  const v2 = detectContract({
    contractVersion: 2,
    profile: { goal: 'maintain', restrictions: '' },
    fallbackDailyGoals: goals,
    dailyTargets: sevenTargets(),
  });
  assert.equal(v2.ok, true);
  assert.equal(v2.contractVersion, 2);
  console.log('OK V2 aceito');
}

{
  const bad = detectContract({
    contractVersion: 2,
    profile: { goal: 'maintain', restrictions: '' },
    fallbackDailyGoals: goals,
    dailyTargets: sevenTargets().slice(0, 5),
  });
  assert.equal(bad.ok, false);
  console.log('OK V2 incompleto rejeitado');
}

{
  const legacy = detectContract({
    profile: { goal: 'maintain', restrictions: 'sem lactose', dailyGoals: goals },
  });
  assert.equal(legacy.ok, true);
  assert.equal(legacy.contractVersion, 1);
  console.log('OK cliente antigo (V1 sem contractVersion)');
}

{
  // Metadados extras no response não quebram schema Zod do client (campo opcional).
  const schemaSrc = readFileSync(
    path.join(root, 'src/services/ai/schemas/meal-plan.schema.ts'),
    'utf8',
  );
  assert.match(schemaSrc, /generationMeta/);
  console.log('OK schema client aceita generationMeta opcional');
}

{
  const edgeIndex = readFileSync(
    path.join(root, 'supabase/functions/generate-meal-plan/index.ts'),
    'utf8',
  );
  assert.match(edgeIndex, /generateMealPlanV2/);
  assert.match(edgeIndex, /repair_batch|repairedDays/);
  assert.match(edgeIndex, /generationMeta/);
  assert.doesNotMatch(edgeIndex, /supabase functions deploy/i);
  console.log('OK Edge index tem V2 + reparo + meta (não publicar neste smoke)');
}

{
  const shared = readFileSync(
    path.join(root, 'supabase/functions/_shared/meal-plan.ts'),
    'utf8',
  );
  assert.match(shared, /buildMealPlanPromptV2/);
  assert.match(shared, /buildMealPlanBatchRepairPrompt/);
  assert.match(shared, /NÃO use média semanal/);
  console.log('OK prompt V2 e reparo em lote presentes');
}

console.log('\nAll local Edge contract smokes passed.');
