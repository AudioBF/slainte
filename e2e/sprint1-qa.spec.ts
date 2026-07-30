import { expect, test } from '@playwright/test';
import {
  DEFAULTS,
  LEGACY_GOALS,
  attachConsoleGuards,
  expectMacroValues,
  fillMacro,
  gotoHydrated,
  installNetworkGuards,
  openProfile,
  openTab,
  readPersistedProfile,
  screenshot,
  seedAppState,
} from './helpers';

const flagMode = process.env.QA_FLAG_MODE === 'on' ? 'on' : 'off';

test.describe(`Sprint 1 QA — flag ${flagMode}`, () => {
  test.beforeEach(async ({ page }) => {
    await seedAppState(page, {
      displayName: 'QA Local',
      goal: 'maintain',
      restrictions: 'sem lactose',
      dailyGoals: { ...LEGACY_GOALS },
    });
  });

  test('navegação: cinco abas + perfil sem tela branca', async ({ page }, testInfo) => {
    const consoleGuard = attachConsoleGuards(page);
    const net = await installNetworkGuards(page);

    await gotoHydrated(page, '/');
    await expect(page.getByRole('tab', { name: 'Hoje' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Refeição' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Dieta' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Compras' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Mercados' })).toBeVisible();

    for (const tab of ['Refeição', 'Dieta', 'Compras', 'Mercados', 'Hoje'] as const) {
      await openTab(page, tab);
      await expect(page.locator('body')).not.toBeEmpty();
      const text = await page.locator('body').innerText();
      expect(text.length).toBeGreaterThan(20);
    }

    await openProfile(page);
    await expect(page.getByRole('textbox', { name: /^Calorias,/i })).toBeVisible();

    consoleGuard.assertClean();
    net.assertNoProductionCalls();
    testInfo.annotations.push({
      type: 'network-other-remote',
      description: net.getOtherRemote().slice(0, 20).join('\n') || 'none',
    });
  });

  test('perfil: aviso legado, save nome, recalcular 475g', async ({ page }, testInfo) => {
    test.skip(flagMode === 'on', 'cenário OFF — save livre com inconsistência');
    const consoleGuard = attachConsoleGuards(page);
    const net = await installNetworkGuards(page);

    await gotoHydrated(page, '/');
    await openProfile(page);

    await expectMacroValues(page, LEGACY_GOALS);
    await expect(page.getByText(/diferença\s*[-−]?\s*100\s*kcal/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Recalcular carboidratos/i })).toContainText('475');

    await screenshot(page, `${testInfo.project.name}-01-perfil-aviso-menos-100`);

    const nameField = page.getByPlaceholder('Seu nome');
    await nameField.fill('QA Nome Off');
    const saveBtn = page.getByRole('button', { name: /Salvar alterações|Salvo/i });
    await expect(saveBtn).toBeEnabled();
    await expect(saveBtn).not.toHaveText(/Corrija as metas/i);
    await saveBtn.click();
    await expect(page.getByRole('button', { name: /Salvo/i })).toBeVisible();

    const prefs = page.getByPlaceholder(/Alergias, restrições/i);
    await prefs.fill('preferência QA');
    await page.getByRole('button', { name: /Salvar alterações|Salvo/i }).click();
    await expect(page.getByRole('button', { name: /Salvo/i })).toBeVisible();

    await page.getByRole('button', { name: /Recalcular carboidratos/i }).click();
    await expectMacroValues(page, {
      calories: 3260,
      protein: 160,
      carbs: 475,
      fat: 80,
    });
    await expect(page.getByText(/diferença\s*[-−]?\s*100\s*kcal/i)).toHaveCount(0);
    await screenshot(page, `${testInfo.project.name}-02-perfil-apos-recalculo-475`);

    consoleGuard.assertClean();
    net.assertNoProductionCalls();
  });

  test('perfil flag ON: nome/prefs ok; nutrição inconsistente bloqueia; 475 libera', async ({
    page,
  }, testInfo) => {
    test.skip(flagMode !== 'on', 'cenário ON');
    const consoleGuard = attachConsoleGuards(page);
    const net = await installNetworkGuards(page);

    await gotoHydrated(page, '/');
    await openProfile(page);
    await expectMacroValues(page, LEGACY_GOALS);
    await expect(page.getByText(/diferença\s*[-−]?\s*100\s*kcal/i)).toBeVisible();

    // Legado inconsistente + só nome → permite (nutritionChanged=false vs baseline)
    await page.getByPlaceholder('Seu nome').fill('QA Nome On');
    let saveBtn = page.getByRole('button', { name: /Salvar alterações|Salvo|Corrija/i });
    await expect(saveBtn).toBeEnabled();
    await expect(saveBtn).not.toHaveText(/Corrija as metas/i);
    await saveBtn.click();
    await expect(page.getByRole('button', { name: /Salvo/i })).toBeVisible();

    await page.getByPlaceholder(/Alergias, restrições/i).fill('prefs ON');
    await page.getByRole('button', { name: /Salvar alterações|Salvo/i }).click();
    await expect(page.getByRole('button', { name: /Salvo/i })).toBeVisible();

    // Alteração nutricional inconsistente → bloqueia
    await fillMacro(page, 'Carboidrato', '440');
    saveBtn = page.getByRole('button', { name: /Corrija as metas nutricionais|Salvar/i });
    await expect(saveBtn).toHaveText(/Corrija as metas nutricionais/i);
    await expect(saveBtn).toBeDisabled();

    // Voltar a 450 e recalcular → 475
    await fillMacro(page, 'Carboidrato', '450');
    await page.getByRole('button', { name: /Recalcular carboidratos/i }).click();
    await expectMacroValues(page, {
      calories: 3260,
      protein: 160,
      carbs: 475,
      fat: 80,
    });
    saveBtn = page.getByRole('button', { name: /Salvar alterações|Salvo/i });
    await expect(saveBtn).toBeEnabled();
    await expect(saveBtn).not.toHaveText(/Corrija/i);
    await saveBtn.click();
    await expect(page.getByRole('button', { name: /Salvo/i })).toBeVisible();

    consoleGuard.assertClean();
    net.assertNoProductionCalls();
  });

  test('dieta: modal cancel / keep / apply defaults', async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    test.skip(flagMode === 'on', 'modal exercitado no build OFF');
    const consoleGuard = attachConsoleGuards(page);
    const net = await installNetworkGuards(page);

    await seedAppState(page, {
      displayName: 'QA Local',
      goal: 'maintain',
      restrictions: 'sem lactose',
      dailyGoals: { ...DEFAULTS.maintain },
    });

    await gotoHydrated(page, '/');
    await openTab(page, 'Dieta');

    async function openGoalModal(label: 'Emagrecimento' | 'Manutenção' | 'Hipertrofia') {
      await page.getByRole('button', { name: label }).click();
      await expect(page.getByRole('heading', { name: 'Alterar objetivo' })).toBeVisible();
    }

    async function expectModalClosed() {
      await expect(page.getByRole('heading', { name: 'Alterar objetivo' })).toHaveCount(0, {
        timeout: 8_000,
      });
    }

    // Cancelar
    await openGoalModal('Emagrecimento');
    await expect(page.getByRole('button', { name: 'Manter minhas metas atuais' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Aplicar padrões' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancelar' })).toBeVisible();
    await screenshot(page, `${testInfo.project.name}-03-modal-dieta`);

    const modalCancel = page.getByRole('button', { name: 'Cancelar' });
    const tabBar = page.getByRole('tab', { name: 'Dieta' });
    const modalBox = await modalCancel.boundingBox();
    const tabBox = await tabBar.boundingBox();
    expect(modalBox).toBeTruthy();
    expect(tabBox).toBeTruthy();
    if (modalBox && tabBox) {
      expect(modalBox.y + modalBox.height).toBeLessThanOrEqual(tabBox.y + 8);
    }

    await modalCancel.click();
    await expectModalClosed();
    let profile = await readPersistedProfile(page);
    expect(profile.goal).toBe('maintain');
    expect(profile.dailyGoals).toEqual(DEFAULTS.maintain);

    // Backdrop fecha sem aplicar
    await openGoalModal('Hipertrofia');
    const backdrop = page.getByLabel('Fechar confirmação de objetivo');
    const box = await backdrop.boundingBox();
    expect(box).toBeTruthy();
    if (box) {
      await page.mouse.click(box.x + 12, box.y + 12);
    }
    await expectModalClosed();
    profile = await readPersistedProfile(page);
    expect(profile.goal).toBe('maintain');
    expect(profile.dailyGoals).toEqual(DEFAULTS.maintain);

    // Manter metas
    await openGoalModal('Emagrecimento');
    await page.getByRole('button', { name: 'Manter minhas metas atuais' }).click();
    await expectModalClosed();
    profile = await readPersistedProfile(page);
    expect(profile.goal).toBe('lose');
    expect(profile.dailyGoals).toEqual(DEFAULTS.maintain);
    expect(profile.restrictions).toBe('sem lactose');
    await screenshot(page, `${testInfo.project.name}-05-manter-metas`);

    // Aplicar padrões → gain
    await openGoalModal('Hipertrofia');
    await page.getByRole('button', { name: 'Aplicar padrões' }).click();
    await expectModalClosed();
    profile = await readPersistedProfile(page);
    expect(profile.goal).toBe('gain');
    expect(profile.dailyGoals).toEqual(DEFAULTS.gain);
    expect(profile.restrictions).toBe('sem lactose');
    await screenshot(page, `${testInfo.project.name}-06-aplicar-padroes`);

    // Ação única: mesmo objetivo não reabre modal
    await page.getByRole('button', { name: 'Hipertrofia' }).click();
    await expect(page.getByRole('heading', { name: 'Alterar objetivo' })).toHaveCount(0);
    profile = await readPersistedProfile(page);
    expect(profile.dailyGoals).toEqual(DEFAULTS.gain);

    // maintain + lose defaults
    await openGoalModal('Manutenção');
    await page.getByRole('button', { name: 'Aplicar padrões' }).click();
    await expectModalClosed();
    profile = await readPersistedProfile(page);
    expect(profile.goal).toBe('maintain');
    expect(profile.dailyGoals).toEqual(DEFAULTS.maintain);

    await openGoalModal('Emagrecimento');
    await page.getByRole('button', { name: 'Aplicar padrões' }).click();
    await expectModalClosed();
    profile = await readPersistedProfile(page);
    expect(profile.goal).toBe('lose');
    expect(profile.dailyGoals).toEqual(DEFAULTS.lose);

    consoleGuard.assertClean();
    net.assertNoProductionCalls();
  });
});
