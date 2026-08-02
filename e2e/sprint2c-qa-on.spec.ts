import { expect, test } from '@playwright/test';
import {
  HIST_MONDAY,
  HIST_SUNDAY,
  attachConsoleGuards,
  installNetworkGuards,
  openToday,
  openWeekTab,
  screenshot2c,
  seedHomeState,
} from './sprint2c-helpers';
import { getDublinDateISO, getWeekCivilDates } from '../src/domain/day-targets';

const flagOn = process.env.QA_DAY_TARGETS_ON === '1';

function dublinTodayISO() {
  return getDublinDateISO(new Date());
}

test.describe('Sprint 2C — flag ON', () => {
  test.skip(!flagOn, 'Requer build com EXPO_PUBLIC_USE_DAY_TARGETS=true (QA_DAY_TARGETS_ON=1)');

  test('Hoje: segunda 3350, terça 3150, domingo 3150 + labels', async ({ page }, testInfo) => {
    const consoleGuard = attachConsoleGuards(page);
    const net = await installNetworkGuards(page);

    await seedHomeState(page, {
      withPersonalTargets: true,
      selectedHistoryDate: HIST_MONDAY,
      dailyGoals: { calories: 2100, protein: 140, carbs: 239, fat: 65 },
    });
    await openToday(page);

    await expect(page.getByLabel(/de 3350 calorias consumidas/i)).toBeVisible();
    await expect(page.getByText('Meta do dia: Trabalho longo + bicicleta')).toBeVisible();

    await page.getByText('›').click();
    await expect(page.getByLabel(/de 3150 calorias consumidas/i)).toBeVisible();
    await expect(page.getByText('Meta do dia: Musculação intensa')).toBeVisible();

    await page.getByText('‹').click();
    await page.getByText('‹').click();
    await expect(page.getByLabel(/de 3150 calorias consumidas/i)).toBeVisible();
    await expect(page.getByText('Meta do dia: Trabalho reduzido + bicicleta')).toBeVisible();

    await screenshot2c(page, `${testInfo.project.name}-flag-on-today`);
    consoleGuard.assertClean();
    net.assertNoProductionCalls();
  });

  test('Semana: targets distintos, futuro/sem registro, zero real', async ({ page }, testInfo) => {
    const consoleGuard = attachConsoleGuards(page);
    const net = await installNetworkGuards(page);

    const today = dublinTodayISO();
    const week = getWeekCivilDates(today);
    expect(week).not.toBeNull();
    const mon = week![0];
    const tue = week![1];
    const futureDays = week!.filter((d) => d > today).length;
    const elapsedWithoutTueWed = week!.filter((d) => d <= today && d !== mon && d !== tue).length;

    await seedHomeState(page, {
      withPersonalTargets: true,
      selectedHistoryDate: today,
      loggedMeals: [
        {
          id: 'log-mon',
          date: mon,
          slot: 'lunch',
          name: 'Almoço',
          fromPlan: false,
          components: [
            {
              id: 'c1',
              name: 'Prato',
              weightGrams: 300,
              calories: 3000,
              protein: 40,
              carbs: 100,
              fat: 20,
            },
          ],
        },
        {
          id: 'log-tue-zero',
          date: tue,
          slot: 'lunch',
          name: 'Jejum registrado',
          fromPlan: false,
          components: [
            {
              id: 'c2',
              name: 'Zero',
              weightGrams: 0,
              calories: 0,
              protein: 0,
              carbs: 0,
              fat: 0,
            },
          ],
        },
      ],
    });

    await openToday(page);
    await openWeekTab(page);

    await expect(page.getByText(/\d+ de \d+ dias? com registros?/i).first()).toBeVisible();
    await expect(page.getByText(/Marcadores tracejados = meta de cada dia/i)).toBeVisible();
    await expect(page.getByText(/1 refeição · 0 kcal/i)).toBeVisible();

    if (elapsedWithoutTueWed > 0 || (tue <= today && mon <= today)) {
      // há pelo menos um dia decorrido sem log além dos dois com log, ou o próprio "hoje" sem log
      const noLogElapsed = week!.filter((d) => d <= today && d !== mon && d !== tue).length;
      if (noLogElapsed > 0) {
        await expect(page.getByText(/sem registro/i).first()).toBeVisible();
      }
    }

    if (futureDays > 0) {
      await expect(page.getByText(/Semana em andamento/i)).toBeVisible();
      await expect(page.getByText(/dias futuros não incluídos|dia futuro não incluído/i)).toBeVisible();
      await expect(page.getByText('Dia futuro').first()).toBeVisible();
    }

    await screenshot2c(page, `${testInfo.project.name}-flag-on-week`);
    consoleGuard.assertClean();
    net.assertNoProductionCalls();
  });

  test('histórico usa meta da data; domingo seed', async ({ page }) => {
    const consoleGuard = attachConsoleGuards(page);
    const net = await installNetworkGuards(page);

    // Domingo histórico estável (antes de hoje civil atual)
    const sunday = HIST_SUNDAY;
    expect(sunday < dublinTodayISO() || sunday <= dublinTodayISO()).toBeTruthy();

    await seedHomeState(page, {
      withPersonalTargets: true,
      selectedHistoryDate: sunday,
    });
    await openToday(page);
    await expect(page.getByLabel(/de 3150 calorias consumidas/i)).toBeVisible();
    await expect(page.getByText('Meta do dia: Trabalho reduzido + bicicleta')).toBeVisible();
    consoleGuard.assertClean();
    net.assertNoProductionCalls();
  });
});
