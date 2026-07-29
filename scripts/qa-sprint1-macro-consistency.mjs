/**
 * QA determinística do patch de segurança Sprint 1 (sem UI / sem rede).
 * Usage: node scripts/qa-sprint1-macro-consistency.mjs
 */
import assert from 'node:assert/strict';

const KCAL_P = 4;
const KCAL_C = 4;
const KCAL_F = 9;
const TOLERANCE = 5;

function parseMacroConsistencyFlag(value) {
  if (value == null || value === '') return false;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return false;
}

function caloriesFromMacros({ protein, carbs, fat }) {
  return Math.round(protein * KCAL_P + carbs * KCAL_C + fat * KCAL_F);
}

function carbsForTarget({ calories, protein, fat }) {
  const exact = (calories - protein * KCAL_P - fat * KCAL_F) / KCAL_C;
  if (exact < 0) return { ok: false, carbs: null };
  const carbs = Math.round(exact);
  return { ok: true, carbs, resulting: caloriesFromMacros({ protein, carbs, fat }) };
}

function hasChanged(a, b) {
  return a.calories !== b.calories || a.protein !== b.protein || a.carbs !== b.carbs || a.fat !== b.fat;
}

function canSave({ baseline, current, enforce }) {
  const consistent =
    Math.abs(caloriesFromMacros(current) - current.calories) <= TOLERANCE;
  const changed = hasChanged(baseline, current);
  if (!enforce) return { canSave: true, reason: 'flag_off' };
  if (!changed) return { canSave: true, reason: 'legacy_unchanged' };
  if (consistent) return { canSave: true, reason: 'consistent_edit' };
  return { canSave: false, reason: 'blocked' };
}

function resolvePayload(goals) {
  const input = { ...goals };
  const snap = { ...goals };
  const calc = caloriesFromMacros(goals);
  if (Math.abs(calc - goals.calories) <= TOLERANCE) {
    return { ok: true, goals: { ...goals }, mutated: JSON.stringify(input) !== JSON.stringify(snap) };
  }
  const carbs = carbsForTarget(goals);
  if (!carbs.ok) return { ok: false, goals: null, inputUnchanged: JSON.stringify(input) === JSON.stringify(snap) };
  return {
    ok: true,
    goals: { calories: goals.calories, protein: goals.protein, carbs: carbs.carbs, fat: goals.fat },
    inputUnchanged: JSON.stringify(input) === JSON.stringify(snap),
  };
}

const DEFAULTS = {
  lose: { calories: 1800, protein: 130, carbs: 196, fat: 55 },
  maintain: { calories: 2100, protein: 140, carbs: 239, fat: 65 },
  gain: { calories: 2600, protein: 160, carbs: 321, fat: 75 },
};

const legacy = { calories: 3260, protein: 160, carbs: 450, fat: 80 };
const results = [];

function check(name, fn) {
  try {
    fn();
    results.push({ name, ok: true });
    console.log(`PASS  ${name}`);
  } catch (e) {
    results.push({ name, ok: false, error: e.message });
    console.error(`FAIL  ${name}: ${e.message}`);
  }
}

check('flag ausente = OFF', () => {
  assert.equal(parseMacroConsistencyFlag(undefined), false);
  assert.equal(parseMacroConsistencyFlag(''), false);
});
check('flag true = ON', () => assert.equal(parseMacroConsistencyFlag('true'), true));
check('flag false = OFF', () => assert.equal(parseMacroConsistencyFlag('false'), false));
check('flag inválida = OFF', () => assert.equal(parseMacroConsistencyFlag('TRUE'), false));

check('legado: aviso matemático (diff -100)', () => {
  assert.equal(caloriesFromMacros(legacy), 3160);
  assert.equal(3160 - 3260, -100);
});

check('legado + só nome (macros iguais) save ON', () => {
  assert.equal(canSave({ baseline: legacy, current: { ...legacy }, enforce: true }).canSave, true);
});

check('legado + carbs inconsistentes bloqueia ON', () => {
  assert.equal(
    canSave({ baseline: legacy, current: { ...legacy, carbs: 400 }, enforce: true }).canSave,
    false,
  );
});

check('legado + carbs inconsistentes permite OFF', () => {
  assert.equal(
    canSave({ baseline: legacy, current: { ...legacy, carbs: 400 }, enforce: false }).canSave,
    true,
  );
});

check('recalcular → 475 g e save ON', () => {
  const r = carbsForTarget(legacy);
  assert.equal(r.carbs, 475);
  assert.equal(
    canSave({
      baseline: legacy,
      current: { ...legacy, carbs: 475 },
      enforce: true,
    }).canSave,
    true,
  );
});

check('payload legado normalizado sem mutar input', () => {
  const input = { ...legacy };
  const resolved = resolvePayload(input);
  assert.equal(resolved.ok, true);
  assert.equal(resolved.goals.carbs, 475);
  assert.equal(input.carbs, 450);
  assert.equal(resolved.inputUnchanged, true);
});

check('payload impossível falha sem inventar', () => {
  const resolved = resolvePayload({ calories: 500, protein: 160, carbs: 10, fat: 80 });
  assert.equal(resolved.ok, false);
  assert.equal(resolved.goals, null);
});

for (const goal of Object.keys(DEFAULTS)) {
  check(`default ${goal} Atwater`, () => {
    const g = DEFAULTS[goal];
    assert.ok(Math.abs(caloriesFromMacros(g) - g.calories) <= TOLERANCE);
  });
}

const failed = results.filter((r) => !r.ok);
console.log(`\nQA script: ${results.length - failed.length}/${results.length} passed`);
if (failed.length) process.exit(1);
