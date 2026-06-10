import { readFileSync } from 'fs';

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
if (!key) {
  console.error('No API key in .env');
  process.exit(1);
}

const candidates = [
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-pro',
  'gemini-1.5-flash',
  'gemini-2.0-flash',
];

console.log('Checking model availability on your account...\n');

for (const model of candidates) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}?key=${key}`;
  try {
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const methods = data.supportedGenerationMethods?.join(', ') ?? '?';
      console.log(`✓ ${model} — ${data.displayName ?? 'ok'} [${methods}]`);
    } else {
      const err = await res.text();
      const short = err.slice(0, 120).replace(/\n/g, ' ');
      console.log(`✗ ${model} — ${res.status} ${short}`);
    }
  } catch (e) {
    console.log(`✗ ${model} — ${e.message}`);
  }
}
