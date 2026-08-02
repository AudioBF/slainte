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

export const ARTIFACTS_2C = path.join('artifacts', 'qa-sprint-2c');

/** Segunda da semana de referência usada nos testes ON (passado relativo a jul/2026). */
export const HIST_MONDAY = '2026-07-27';
export const HIST_TUESDAY = '2026-07-28';
export const HIST_SUNDAY = '2026-07-26';

export function ensureArtifacts2c() {
  fs.mkdirSync(ARTIFACTS_2C, { recursive: true });
}

export async function screenshot2c(page: Page, name: string) {
  ensureArtifacts2c();
  const file = path.join(ARTIFACTS_2C, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

/** Mesma estrutura de createPersonalDayTargetSeed (IDs estáveis). */
export function personalDayTargetsSeed() {
  return {
    dayTypeTemplates: [
      {
        id: 'personal-tpl-work_long_bike',
        code: 'work_long_bike',
        label: 'Trabalho longo + bicicleta',
        dailyGoals: { calories: 3350, protein: 160, carbs: 475, fat: 90 },
        isActive: true,
      },
      {
        id: 'personal-tpl-strength_training',
        code: 'strength_training',
        label: 'Musculação intensa',
        dailyGoals: { calories: 3150, protein: 160, carbs: 448, fat: 80 },
        isActive: true,
      },
      {
        id: 'personal-tpl-work_short_bike',
        code: 'work_short_bike',
        label: 'Trabalho reduzido + bicicleta',
        dailyGoals: { calories: 3150, protein: 160, carbs: 448, fat: 80 },
        isActive: true,
      },
    ],
    weeklySchedule: {
      entries: [
        { weekday: 0, templateId: 'personal-tpl-work_long_bike' },
        { weekday: 1, templateId: 'personal-tpl-strength_training' },
        { weekday: 2, templateId: 'personal-tpl-strength_training' },
        { weekday: 3, templateId: 'personal-tpl-work_long_bike' },
        { weekday: 4, templateId: 'personal-tpl-work_long_bike' },
        { weekday: 5, templateId: 'personal-tpl-work_long_bike' },
        { weekday: 6, templateId: 'personal-tpl-work_short_bike' },
      ],
    },
    dailyTargetOverrides: [],
  };
}

export async function seedHomeState(
  page: Page,
  options: {
    selectedHistoryDate?: string;
    withPersonalTargets?: boolean;
    loggedMeals?: unknown[];
    dailyGoals?: { calories: number; protein: number; carbs: number; fat: number };
  } = {},
) {
  const base = createSeedState({
    displayName: 'QA Sprint2C',
    dailyGoals: options.dailyGoals ?? {
      calories: 2100,
      protein: 140,
      carbs: 239,
      fat: 65,
    },
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
      selectedHistoryDate:
        options.selectedHistoryDate ?? base.state.selectedHistoryDate,
      loggedMeals: options.loggedMeals ?? [],
      ...targets,
    },
  };

  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, value);
    },
    { key: STORAGE_KEY, value: JSON.stringify(payload) },
  );
}

export async function openToday(page: Page) {
  await gotoHydrated(page, '/');
  await expect(page.getByLabel(/calorias consumidas/i)).toBeVisible({ timeout: 20_000 });
}

export async function openWeekTab(page: Page) {
  await page.getByText('Semana', { exact: true }).click();
}

export async function openScheduleFromProfile(page: Page) {
  await gotoHydrated(page, '/');
  await openProfile(page);
  await page.getByRole('button', { name: 'Agenda e tipos de dia' }).click();
  await expect(page.getByRole('heading', { name: /Agenda semanal/i })).toBeVisible();
}

export { attachConsoleGuards, gotoHydrated, installNetworkGuards, STORAGE_KEY };
