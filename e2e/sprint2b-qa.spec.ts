import { expect, test } from '@playwright/test';
import {
  attachConsoleGuards,
  fillTemplateForm,
  installNetworkGuards,
  openSchedule,
  screenshot2b,
  seedEmptyDayTargets,
} from './sprint2b-helpers';

test.describe('Sprint 2B — agenda e tipos de dia', () => {
  test.beforeEach(async ({ page }) => {
    await seedEmptyDayTargets(page);
  });

  test('estado vazio, aviso device-local e criar primeiro template', async ({ page }, testInfo) => {
    const consoleGuard = attachConsoleGuards(page);
    const net = await installNetworkGuards(page);

    await openSchedule(page);

    await expect(page.getByText(/salva apenas neste dispositivo/i)).toBeVisible();
    await expect(page.getByText(/quando as metas por tipo de dia forem ativadas/i)).toBeVisible();
    await expect(page.getByLabel('Nenhum tipo de dia configurado')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Usar minha rotina atual' }).first()).toBeVisible();

    await page.getByRole('button', { name: 'Criar primeiro tipo de dia' }).click();
    await expect(page.getByRole('heading', { name: 'Novo tipo de dia' })).toBeVisible();

    await fillTemplateForm(page, {
      name: 'Longo QA',
      calories: '3350',
      protein: '200',
      fat: '90',
      carbs: '100',
    });
    await expect(page.getByText(/Metas inconsistentes/i)).toBeVisible();
    await expect(page.getByText(/diferença/i)).toBeVisible();
    await page.getByRole('button', { name: 'Recalcular carboidratos' }).click();
    await page.getByRole('button', { name: 'Salvar tipo' }).click();

    await expect(page.getByLabel('Tipo de dia Longo QA')).toBeVisible();
    await screenshot2b(page, `${testInfo.project.name}-empty-create`);
    consoleGuard.assertClean();
    net.assertNoProductionCalls();
  });

  test('agenda: associar segunda e domingo, fallback padrão, salvar', async ({ page }, testInfo) => {
    const consoleGuard = attachConsoleGuards(page);
    const net = await installNetworkGuards(page);

    await openSchedule(page);

    await page.getByRole('button', { name: 'Criar primeiro tipo de dia' }).click();
    await fillTemplateForm(page, {
      name: 'Longo QA',
      calories: '3350',
      protein: '200',
      fat: '90',
      carbs: '100',
    });
    await page.getByRole('button', { name: 'Recalcular carboidratos' }).click();
    await page.getByRole('button', { name: 'Salvar tipo' }).click();
    await expect(page.getByLabel('Tipo de dia Longo QA')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Novo tipo de dia' })).toHaveCount(0);

    await page.getByRole('button', { name: /^Segunda-feira/i }).click();
    await page.getByRole('button', { name: /^Longo QA, \d+ kcal$/ }).click();
    await page.getByRole('button', { name: /^Domingo/i }).click();
    await page.getByRole('button', { name: /^Longo QA, \d+ kcal$/ }).click();

    await expect(page.getByText(/alterações não salvas na agenda/i)).toBeVisible();
    await page.getByRole('button', { name: 'Salvar agenda' }).click();
    await expect(page.getByText(/alterações não salvas na agenda/i)).toHaveCount(0);

    await page.getByRole('button', { name: /^Segunda-feira/i }).click();
    await page.getByRole('button', { name: 'Usar meta padrão do perfil', exact: true }).click();
    await page.getByRole('button', { name: 'Salvar agenda' }).click();

    await screenshot2b(page, `${testInfo.project.name}-agenda`);
    consoleGuard.assertClean();
    net.assertNoProductionCalls();
  });

  test('seed pessoal: cancelar e aplicar', async ({ page }, testInfo) => {
    const consoleGuard = attachConsoleGuards(page);
    const net = await installNetworkGuards(page);

    await openSchedule(page);

    await page.getByRole('button', { name: 'Usar minha rotina atual' }).first().click();
    await expect(page.getByRole('heading', { name: 'Usar minha rotina atual' })).toBeVisible();
    await expect(page.getByText(/3\.350 kcal/i).first()).toBeVisible();
    await page.getByRole('button', { name: 'Cancelar' }).click();

    await page.getByRole('button', { name: 'Usar minha rotina atual' }).first().click();
    await page.getByRole('button', { name: 'Aplicar configuração' }).click();

    await expect(page.getByLabel('Tipo de dia Trabalho longo + bicicleta')).toBeVisible();
    await expect(page.getByLabel('Tipo de dia Musculação intensa')).toBeVisible();
    await expect(page.getByLabel('Tipo de dia Trabalho reduzido + bicicleta')).toBeVisible();
    await expect(page.getByRole('button', { name: /Segunda-feira\. Trabalho longo/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Domingo\. Trabalho reduzido/i })).toBeVisible();

    await screenshot2b(page, `${testInfo.project.name}-seed`);
    consoleGuard.assertClean();
    net.assertNoProductionCalls();
  });

  test('editar, bloquear desativação associada e remover', async ({ page }, testInfo) => {
    const consoleGuard = attachConsoleGuards(page);
    const net = await installNetworkGuards(page);

    await openSchedule(page);

    await page.getByRole('button', { name: 'Usar minha rotina atual' }).first().click();
    await page.getByRole('button', { name: 'Aplicar configuração' }).click();
    await expect(page.getByLabel('Tipo de dia Trabalho longo + bicicleta')).toBeVisible();

    await page.getByRole('button', { name: 'Editar Trabalho longo + bicicleta' }).click();
    await expect(page.getByRole('heading', { name: 'Editar tipo de dia' })).toBeVisible();
    await page.getByLabel('Nome do tipo de dia').fill('Longo editado');
    await page.getByLabel('Template ativo').click();
    await expect(page.getByText(/ainda está associado a/i)).toBeVisible();
    await page
      .locator('div')
      .filter({ hasText: /^CancelarSalvar tipo$/ })
      .getByRole('button', { name: 'Cancelar' })
      .click();
    await expect(page.getByRole('heading', { name: 'Editar tipo de dia' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Remover Trabalho longo + bicicleta' }).click();
    await expect(page.getByRole('heading', { name: /Tipo em uso na agenda/i })).toBeVisible();
    await page.getByRole('button', { name: 'Remover e usar meta padrão' }).click();
    await expect(page.getByLabel('Tipo de dia Trabalho longo + bicicleta')).toHaveCount(0);

    await screenshot2b(page, `${testInfo.project.name}-edit-remove`);
    consoleGuard.assertClean();
    net.assertNoProductionCalls();
  });
});
