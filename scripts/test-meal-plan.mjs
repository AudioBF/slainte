import { readFileSync } from 'fs';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

function loadEnv() {
  try {
    const raw = readFileSync('.env', 'utf8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const [key, ...rest] = trimmed.split('=');
      if (key && rest.length) process.env[key.trim()] = rest.join('=').trim();
    }
  } catch {}
}

loadEnv();

const key = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(key);

const schema = {
  type: SchemaType.OBJECT,
  properties: {
    recipes: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          id: { type: SchemaType.STRING },
          name: { type: SchemaType.STRING },
          servings: { type: SchemaType.NUMBER },
          ingredients: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                name: { type: SchemaType.STRING },
                amount: { type: SchemaType.STRING },
              },
              required: ['name', 'amount'],
            },
          },
          steps: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          caloriesPerServing: { type: SchemaType.NUMBER },
          proteinPerServing: { type: SchemaType.NUMBER },
          carbsPerServing: { type: SchemaType.NUMBER },
          fatPerServing: { type: SchemaType.NUMBER },
        },
        required: [
          'id', 'name', 'servings', 'ingredients', 'steps',
          'caloriesPerServing', 'proteinPerServing', 'carbsPerServing', 'fatPerServing',
        ],
      },
    },
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
          recipeId: { type: SchemaType.STRING },
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
  required: ['recipes', 'plannedMeals'],
};

const prompt = `Gere um cardápio mínimo de 2 dias (dayIndex 0-1) com café, almoço e jantar para hipertrofia, 2600 kcal. 2 receitas. JSON compacto.`;

const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  generationConfig: {
    responseMimeType: 'application/json',
    responseSchema: schema,
    temperature: 0.85,
  },
});

try {
  console.log('Generating meal plan...');
  const start = Date.now();
  const result = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }] });
  const text = result.response.text();
  console.log('Time:', Date.now() - start, 'ms');
  console.log('Length:', text.length);
  const parsed = JSON.parse(text);
  console.log('Recipes:', parsed.recipes?.length, 'Meals:', parsed.plannedMeals?.length);
  console.log('OK');
} catch (err) {
  console.error('FAIL:', err.message ?? err);
  process.exit(1);
}
