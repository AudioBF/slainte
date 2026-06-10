import { readFileSync } from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';

function loadEnv() {
  try {
    const raw = readFileSync('.env', 'utf8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const [key, ...rest] = trimmed.split('=');
      if (key && rest.length) process.env[key.trim()] = rest.join('=').trim();
    }
  } catch {
    // ignore
  }
}

loadEnv();

const key = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const mock = process.env.EXPO_PUBLIC_AI_MOCK;

console.log('AI_MOCK:', mock);
console.log('Key present:', Boolean(key));
console.log('Key prefix:', key ? `${key.slice(0, 6)}...` : 'none');

if (!key) {
  console.error('FAIL: EXPO_PUBLIC_GEMINI_API_KEY missing');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(key);
const models = [
  'gemini-2.5-flash',
  'gemini-3.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-3.1-flash-lite',
];

let lastError = null;
for (const modelName of models) {
  try {
    console.log(`Trying ${modelName}...`);
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: 'Responda só com JSON: {"ok":true,"message":"Sláinte conectado"}',
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    console.log(`SUCCESS (${modelName}):`, result.response.text());
    process.exit(0);
  } catch (err) {
    lastError = err;
    console.error(`FAIL (${modelName}):`, err.message ?? err);
  }
}

console.error('All models failed.');
process.exit(1);
