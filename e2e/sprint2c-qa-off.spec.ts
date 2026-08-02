import { expect, test } from '@playwright/test';
import {
  attachConsoleGuards,
  gotoHydrated,
  installNetworkGuards,
  openScheduleFromProfile,
  openWeekTab,
  screenshot2c,
  seedHomeState,
} from './sprint2c-helpers';

/**
 * Flag OFF — build com EXPO_PUBLIC_USE_DAY_TARGETS ausente/vazio.
 * Agenda pode existir; Hoje/Semana permanecem no perfil.
 */
test.describe('Sprint 2C — flag OFF', () => {
  test('agenda configurada não altera meta nem label em Hoje; Semana legada', async ({
    page,
  }, testInfo) => {
    const consoleGuard = attachConsoleGuards(page);
    const net = await installNetworkGuards(page);

    await seedHomeState(page, {
      withPersonalTargets: true,
      dailyGoals: { calories: 2100, protein: 140, carbs: 239, fat: 65 },
    });

    await openScheduleFromProfile(page);
    await expect(page.getByLabel('Tipo de dia Trabalho longo + bicicleta')).toBeVisible();

    await gotoHydrated(page, '/');
    await expect(
      page.getByLabel(/de 2100 calorias consumidas/i),
    ).toBeVisible();
    await expect(page.getByText(/Meta do dia:/i)).toHaveCount(0);
    await expect(page.getByText(/Meta personalizada para esta data/i)).toHaveCount(0);
    await expect(page.getByText(/Meta padrão do perfil/i)).toHaveCount(0);

    await openWeekTab(page);
    await expect(page.getByText(/Resumo da semana/i)).toBeVisible();
    await expect(page.getByText(/Semana em andamento/i)).toHaveCount(0);
    await expect(page.getByText(/Linha tracejada = meta diária \(2100 kcal\)/i)).toBeVisible();

    await screenshot2c(page, `${testInfo.project.name}-flag-off`);
    consoleGuard.assertClean();
    net.assertNoProductionCalls();
  });
});
