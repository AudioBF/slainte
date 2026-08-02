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
  seedAppState,
} from './helpers';

export const ARTIFACTS_2B = path.join('artifacts', 'qa-sprint-2b');

export function ensureArtifacts2b() {
  fs.mkdirSync(ARTIFACTS_2B, { recursive: true });
}

export async function screenshot2b(page: Page, name: string) {
  ensureArtifacts2b();
  const file = path.join(ARTIFACTS_2B, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

export async function seedEmptyDayTargets(page: Page) {
  const base = createSeedState({ displayName: 'QA Schedule' });
  const payload = {
    ...base,
    state: {
      ...base.state,
      dayTypeTemplates: [],
      weeklySchedule: { entries: [] },
      dailyTargetOverrides: [],
    },
  };
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, value);
    },
    { key: STORAGE_KEY, value: JSON.stringify(payload) },
  );
}

export async function openSchedule(page: Page) {
  await gotoHydrated(page, '/');
  await openProfile(page);
  await page.getByRole('button', { name: 'Agenda e tipos de dia' }).click();
  await expect(page.getByRole('heading', { name: /Agenda semanal/i })).toBeVisible();
  await expect(
    page.getByText('Esta configuração está salva apenas neste dispositivo.'),
  ).toBeVisible();
}

export async function fillTemplateForm(
  page: Page,
  values: {
    name: string;
    calories: string;
    protein: string;
    carbs: string;
    fat: string;
    category?: string;
  },
) {
  await page.getByLabel('Nome do tipo de dia').fill(values.name);
  if (values.category) {
    await page.getByRole('button', { name: values.category, exact: true }).click();
  }
  await page.getByLabel('Calorias', { exact: true }).fill(values.calories);
  await page.getByLabel('Proteína', { exact: true }).fill(values.protein);
  await page.getByLabel('Carboidratos', { exact: true }).fill(values.carbs);
  await page.getByLabel('Gordura', { exact: true }).fill(values.fat);
}

export { attachConsoleGuards, gotoHydrated, installNetworkGuards, seedAppState, STORAGE_KEY };
