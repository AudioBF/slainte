import { expect, type Page, type Request } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

export const STORAGE_KEY = '@slainte/app-state/v1';
export const ARTIFACTS = path.join('artifacts', 'qa-sprint-1');

export const LEGACY_GOALS = {
  calories: 3260,
  protein: 160,
  carbs: 450,
  fat: 80,
} as const;

export const DEFAULTS = {
  lose: { calories: 1800, protein: 130, carbs: 196, fat: 55 },
  maintain: { calories: 2100, protein: 140, carbs: 239, fat: 65 },
  gain: { calories: 2600, protein: 160, carbs: 321, fat: 75 },
} as const;

const BLOCKED_HOST_PARTS = [
  'supabase.co',
  'functions.supabase',
  'generativelanguage.googleapis.com',
  'googleapis.com',
];

export type SeedProfile = {
  displayName?: string;
  goal?: 'lose' | 'maintain' | 'gain';
  restrictions?: string;
  dailyGoals?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
};

export function ensureArtifactsDir() {
  fs.mkdirSync(ARTIFACTS, { recursive: true });
}

export async function screenshot(page: Page, name: string) {
  ensureArtifactsDir();
  const file = path.join(ARTIFACTS, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

export function createSeedState(profile: SeedProfile = {}) {
  const now = new Date().toISOString();
  return {
    state: {
      profile: {
        id: 'qa-local-user',
        displayName: profile.displayName ?? 'QA Local',
        avatarUri: null,
        onboardingComplete: true,
        goal: profile.goal ?? 'maintain',
        restrictions: profile.restrictions ?? '',
        dailyGoals: profile.dailyGoals ?? { ...DEFAULTS.maintain },
        createdAt: now,
        updatedAt: now,
      },
      loggedMeals: [],
      plannedMeals: [],
      recipes: [],
      shopping: [],
      mealPlanSummary: null,
      selectedHistoryDate: now.slice(0, 10),
    },
    version: 2,
  };
}

export async function seedAppState(page: Page, profile: SeedProfile = {}) {
  const payload = createSeedState(profile);
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, value);
    },
    { key: STORAGE_KEY, value: JSON.stringify(payload) },
  );
}

export async function installNetworkGuards(page: Page) {
  const blockedAttempts: string[] = [];
  const otherRemote: string[] = [];

  await page.route('**/*', async (route) => {
    const url = route.request().url();
    const isLocal =
      url.startsWith('http://127.0.0.1') ||
      url.startsWith('http://localhost') ||
      url.startsWith('data:') ||
      url.startsWith('blob:');

    if (!isLocal && BLOCKED_HOST_PARTS.some((part) => url.includes(part))) {
      blockedAttempts.push(url);
      await route.abort();
      return;
    }

    if (!isLocal && /^https?:\/\//i.test(url)) {
      otherRemote.push(url);
    }

    await route.continue();
  });

  return {
    getBlockedAttempts: () => [...blockedAttempts],
    getOtherRemote: () => [...otherRemote],
    assertNoProductionCalls: () => {
      expect(blockedAttempts, blockedAttempts.join('\n')).toEqual([]);
    },
  };
}

export function attachConsoleGuards(page: Page) {
  const errors: string[] = [];
  const warnings: string[] = [];

  page.on('pageerror', (err) => {
    errors.push(`pageerror: ${err.message}`);
  });
  page.on('console', (msg) => {
    const text = msg.text();
    if (msg.type() === 'error') {
      // RN Web / Expo noise known non-critical
      if (/Download the React DevTools/i.test(text)) return;
      if (/props\.pointerEvents is deprecated/i.test(text)) return;
      errors.push(`console.error: ${text}`);
    } else if (msg.type() === 'warning') {
      warnings.push(text);
    }
  });
  page.on('requestfailed', (req: Request) => {
    const url = req.url();
    if (url.startsWith('http://127.0.0.1') || url.startsWith('http://localhost')) {
      errors.push(`requestfailed local: ${url} — ${req.failure()?.errorText ?? 'unknown'}`);
    }
  });

  return {
    getErrors: () => [...errors],
    getWarnings: () => [...warnings],
    assertClean: () => {
      expect(errors, errors.join('\n')).toEqual([]);
    },
  };
}

export async function readPersistedProfile(page: Page) {
  return page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed.state?.profile ?? null;
  }, STORAGE_KEY);
}

export async function gotoHydrated(page: Page, path = '/') {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('tab', { name: 'Hoje' })).toBeVisible({ timeout: 20_000 });
}

export async function openProfile(page: Page) {
  await page.getByRole('button', { name: 'Abrir perfil' }).click();
  await expect(page.getByRole('heading', { name: /Perfil/i })).toBeVisible();
}

export async function openTab(page: Page, name: string) {
  await page.getByRole('tab', { name }).click();
  await expect(page.getByRole('tab', { name })).toBeVisible();
}

export function macroField(page: Page, kind: 'Calorias' | 'Proteína' | 'Carboidrato' | 'Gordura') {
  return page.getByRole('textbox', { name: new RegExp(`^${kind},`, 'i') });
}

export async function fillMacro(
  page: Page,
  kind: 'Calorias' | 'Proteína' | 'Carboidrato' | 'Gordura',
  value: string,
) {
  const field = macroField(page, kind);
  await field.click();
  await field.fill(value);
}

export async function expectMacroValues(
  page: Page,
  goals: { calories: number; protein: number; carbs: number; fat: number },
) {
  await expect(macroField(page, 'Calorias')).toHaveValue(String(goals.calories));
  await expect(macroField(page, 'Proteína')).toHaveValue(String(goals.protein));
  await expect(macroField(page, 'Carboidrato')).toHaveValue(String(goals.carbs));
  await expect(macroField(page, 'Gordura')).toHaveValue(String(goals.fat));
}
