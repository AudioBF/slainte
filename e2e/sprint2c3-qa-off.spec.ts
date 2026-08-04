import { expect, test } from '@playwright/test';
import {
  attachConsoleGuards,
  generateMealPlanMock,
  installNetworkGuards,
  openDiet,
  screenshot2c3,
  seedDietState,
} from './sprint2c3-helpers';

/**
 * Flags OFF — Dieta V1, sem copy multi-meta.
 * Build: EXPO_PUBLIC_USE_DAY_TARGETS / MULTI ausentes.
 */
test.describe('Sprint 2C.3 — flags OFF', () => {
  test('Dieta V1 sem copy multi-meta; geração mock funciona', async ({ page }, testInfo) => {
    const consoleGuard = attachConsoleGuards(page);
    const net = await installNetworkGuards(page);

    await seedDietState(page, { withPersonalTargets: true });
    await openDiet(page);

    await expect(page.getByLabel('Cardápio multi-meta')).toHaveCount(0);
    await expect(page.getByLabel('Cardápio meta padrão')).toHaveCount(0);
    await expect(
      page.getByText(/Cardápio baseado nas metas da sua agenda semanal/i),
    ).toHaveCount(0);

    await generateMealPlanMock(page);
    await expect(page.getByText(/Cardápio/i).first()).toBeVisible();
    await screenshot2c3(page, `${testInfo.project.name}-flags-off`);

    consoleGuard.assertClean();
    net.assertNoProductionCalls();
  });
});
