import { expect, test } from '@playwright/test';
import {
  attachConsoleGuards,
  generateMealPlanMock,
  installNetworkGuards,
  openDiet,
  readPersistedAppState,
  screenshot2c3,
  seedDietState,
} from './sprint2c3-helpers';

/**
 * DAY ON + MULTI ON — V2 mock, snapshot, copy multi-meta.
 * Edge real bloqueada; AI_MOCK=true no build.
 */
test.describe('Sprint 2C.3 — ambas ON', () => {
  test('copy multi-meta, snapshot V2, compras e receita não quebram', async ({
    page,
  }, testInfo) => {
    const consoleGuard = attachConsoleGuards(page);
    const net = await installNetworkGuards(page);

    await seedDietState(page, { withPersonalTargets: true });
    await openDiet(page);

    await expect(page.getByLabel('Cardápio multi-meta')).toBeVisible();
    await expect(
      page.getByText(/Cardápio baseado nas metas da sua agenda semanal/i),
    ).toBeVisible();

    await generateMealPlanMock(page);

    const persisted = await readPersistedAppState(page);
    expect(persisted?.state?.plannedMeals?.length).toBeGreaterThan(0);
    expect(persisted?.state?.mealPlanGenerationMeta?.contractVersion).toBe(2);
    expect(persisted?.state?.mealPlanGenerationMeta?.perDay).toHaveLength(7);

    // Reload preserva snapshot
    await page.reload();
    await openDiet(page);
    await expect(page.getByLabel('Cardápio multi-meta')).toBeVisible();
    const afterReload = await readPersistedAppState(page);
    expect(afterReload?.state?.mealPlanGenerationMeta?.contractVersion).toBe(2);

    // Dia com label de agenda (segunda = Trabalho longo)
    await page.getByText(/Dia da semana/i).click();
    await page.getByText(/Segunda-feira/i).click();
    await expect(page.getByText(/Meta do dia: Trabalho longo/i)).toBeVisible({
      timeout: 8_000,
    });

    // Compras: slots/ingredientes continuam acessíveis (aba existe)
    await page.getByRole('tab', { name: 'Compras' }).click();
    await expect(page.getByRole('heading', { name: /Compras/i })).toBeVisible();

    await openDiet(page);
    await expect(page.getByText(/Omelete de legumes|Bowl de frango/i).first()).toBeVisible({
      timeout: 10_000,
    });

    await screenshot2c3(page, `${testInfo.project.name}-both-on`);
    consoleGuard.assertClean();
    net.assertNoProductionCalls();
  });
});
