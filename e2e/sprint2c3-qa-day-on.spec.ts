import { expect, test } from '@playwright/test';
import {
  attachConsoleGuards,
  generateMealPlanMock,
  installNetworkGuards,
  openDiet,
  screenshot2c3,
  seedDietState,
} from './sprint2c3-helpers';
import { gotoHydrated, openScheduleFromProfile } from './sprint2c-helpers';

/**
 * DAY ON + MULTI OFF — Hoje/Semana podem usar agenda; Dieta V1 + copy informativa.
 */
test.describe('Sprint 2C.3 — DAY ON MULTI OFF', () => {
  test('Dieta permanece V1 com aviso de meta padrão', async ({ page }, testInfo) => {
    const consoleGuard = attachConsoleGuards(page);
    const net = await installNetworkGuards(page);

    await seedDietState(page, { withPersonalTargets: true });

    await openScheduleFromProfile(page);
    await expect(page.getByLabel('Tipo de dia Trabalho longo + bicicleta')).toBeVisible();

    await openDiet(page);
    await expect(page.getByLabel('Cardápio meta padrão')).toBeVisible();
    await expect(page.getByLabel('Cardápio multi-meta')).toHaveCount(0);
    await expect(
      page.getByText(/O cardápio ainda usa a meta padrão do perfil/i),
    ).toBeVisible();

    await generateMealPlanMock(page);
    await screenshot2c3(page, `${testInfo.project.name}-day-on-multi-off`);

    consoleGuard.assertClean();
    net.assertNoProductionCalls();
  });
});
