import { expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {
  STORAGE_KEY,
  attachConsoleGuards,
  createSeedState,
  gotoHydrated,
  installNetworkGuards,
  openProfile,
} from './helpers';
import { personalDayTargetsSeed } from './sprint2c-helpers';

export const ARTIFACTS_2C3 = path.join('artifacts', 'qa-sprint-2c3');

export function ensureArtifacts2c3() {
  fs.mkdirSync(ARTIFACTS_2C3, { recursive: true });
}

export async function screenshot2c3(page: Page, name: string) {
  ensureArtifacts2c3();
  await page.screenshot({ path: path.join(ARTIFACTS_2C3, `${name}.png`), fullPage: true });
}

export async function seedDietState(
  page: Page,
  options: { withPersonalTargets?: boolean } = {},
) {
  const base = createSeedState({
    displayName: 'QA Sprint2C3',
    dailyGoals: { calories: 2100, protein: 140, carbs: 239, fat: 65 },
  });
  const targets = options.withPersonalTargets
    ? personalDayTargetsSeed()
    : {
        dayTypeTemplates: [],
        weeklySchedule: { entries: [] },
        dailyTargetOverrides: [],
      };

  const payload = {
    ...base,
    state: {
      ...base.state,
      ...targets,
      mealPlanGenerationMeta: null,
    },
  };

  await page.addInitScript(
    ({ key, value }) => {
      // Não sobrescrever no reload — preserva plano/snapshot gerados no teste.
      if (!window.localStorage.getItem(key)) {
        window.localStorage.setItem(key, value);
      }
    },
    { key: STORAGE_KEY, value: JSON.stringify(payload) },
  );
}

export async function openDiet(page: Page) {
  await gotoHydrated(page, '/');
  await page.getByRole('tab', { name: 'Dieta' }).click();
  await expect(page.getByRole('heading', { name: 'Dieta' })).toBeVisible({ timeout: 20_000 });
}

export async function generateMealPlanMock(page: Page) {
  await page.getByRole('button', { name: /Gerar cardápio da semana/i }).click();
  await expect(page.getByText(/Cardápio gerado/i)).toBeVisible({ timeout: 30_000 });
}

export async function readPersistedAppState(page: Page) {
  return page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as {
      state?: {
        plannedMeals?: unknown[];
        mealPlanGenerationMeta?: {
          contractVersion?: number;
          perDay?: unknown[];
        } | null;
        shopping?: unknown[];
      };
    };
  }, STORAGE_KEY);
}

export {
  attachConsoleGuards,
  gotoHydrated,
  installNetworkGuards,
  openProfile,
  STORAGE_KEY,
};
