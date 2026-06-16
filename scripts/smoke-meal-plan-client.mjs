/**
 * Client-path meal plan smoke (production config: Edge flag off, client Gemini key).
 * Usage: node scripts/smoke-meal-plan-client.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

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

if (process.env.EXPO_PUBLIC_USE_EDGE_MEAL_PLAN === 'true') {
  console.error('FAIL: EXPO_PUBLIC_USE_EDGE_MEAL_PLAN must be false for client-path smoke');
  process.exit(1);
}

const key = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
if (!key) {
  console.error('FAIL: EXPO_PUBLIC_GEMINI_API_KEY missing');
  process.exit(1);
}

const responseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    plannedMeals: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          id: { type: SchemaType.STRING },
          dayIndex: { type: SchemaType.NUMBER },
          slot: { type: SchemaType.STRING, enum: ['breakfast', 'lunch', 'dinner', 'snack'] },
          time: { type: SchemaType.STRING },
          name: { type: SchemaType.STRING },
          calories: { type: SchemaType.NUMBER },
          protein: { type: SchemaType.NUMBER },
          carbs: { type: SchemaType.NUMBER },
          fat: { type: SchemaType.NUMBER },
        },
        required: ['id', 'dayIndex', 'slot', 'time', 'name', 'calories', 'protein', 'carbs', 'fat'],
      },
    },
    summary: { type: SchemaType.STRING },
  },
  required: ['plannedMeals'],
};

const prompt = `Você é um nutricionista prático em Dublin. Gere cardápio semanal (7 dias, dayIndex 0-6) com café, almoço e jantar.
Meta: 2100 kcal/dia. Objetivo: manutenção. Restrições: nenhuma.
Retorne APENAS plannedMeals + summary. NÃO inclua recipes nem recipeId.
Nomes descritivos (proteína + base + preparo). JSON no schema.`;

const model = new GoogleGenerativeAI(key).getGenerativeModel({
  model: 'gemini-2.5-flash',
  generationConfig: {
    responseMimeType: 'application/json',
    responseSchema,
    temperature: 0.85,
  },
});

const started = Date.now();
const result = await model.generateContent({
  contents: [{ role: 'user', parts: [{ text: prompt }] }],
});
const durationMs = Date.now() - started;
const parsed = JSON.parse(result.response.text());
const recipes = parsed.recipes?.length ?? 0;
const plannedMeals = parsed.plannedMeals?.length ?? 0;

const summary = {
  timestamp: new Date().toISOString(),
  path: 'client',
  edgeFlag: process.env.EXPO_PUBLIC_USE_EDGE_MEAL_PLAN ?? '(unset)',
  durationMs,
  recipes,
  plannedMeals,
  hasSummary: Boolean(parsed.summary),
  ok: recipes === 0 && plannedMeals >= 21,
};

writeFileSync('docs/private/.meal-plan-client-smoke.json', JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
process.exit(summary.ok ? 0 : 1);
