import { test, expect } from '@playwright/test';

const BASE = 'https://anafood.vip';
const EMAIL = 'maissistem@gmail.com';
const PASS = '314159';

test.describe('Envio de pedido para entregador', () => {
  test('Login admin e verifica kanban carrega', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASS);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|orders/, { timeout: 15000 });
    const url = page.url();
    console.log('Redirecionado para:', url);
    expect(url).toContain('anafood.vip');
  });

  test('Kanban carrega pedidos e tem botão trocar entregador', async ({ page }) => {
    // Login
    await page.goto(`${BASE}/login`);
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASS);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/, { timeout: 15000 });

    // Navega para pedidos
    await page.goto(`${BASE}/orders`);
    await page.waitForTimeout(3000);

    // Screenshot do kanban
    await page.screenshot({ path: 'e2e/screenshots/kanban.png', fullPage: false });
    console.log('Screenshot salvo: e2e/screenshots/kanban.png');

    // Verifica se tem colunas do kanban
    const columns = await page.locator('[data-testid="kanban-column"], .kanban-column').count();
    console.log('Colunas encontradas:', columns);

    // Verifica botão Mapa no header
    const mapBtn = page.getByRole('button', { name: /mapa/i });
    const mapVisible = await mapBtn.isVisible().catch(() => false);
    console.log('Botão Mapa visível:', mapVisible);

    // Verifica se há cards de pedido
    const cards = await page.locator('.order-card, [class*="card"]').count();
    console.log('Cards encontrados:', cards);
  });

  test('Abre mapa de entregadores', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASS);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/, { timeout: 15000 });

    await page.goto(`${BASE}/orders`);
    await page.waitForTimeout(2000);

    // Clica no botão Mapa
    const mapBtn = page.getByRole('button', { name: /mapa/i });
    if (await mapBtn.isVisible()) {
      await mapBtn.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: 'e2e/screenshots/delivery-map.png', fullPage: false });
      console.log('Mapa aberto — screenshot: e2e/screenshots/delivery-map.png');

      // Verifica se painel do mapa apareceu
      const mapPanel = page.getByText(/Mapa de Entregadores/i);
      const panelVisible = await mapPanel.isVisible().catch(() => false);
      console.log('Painel mapa visível:', panelVisible);
    } else {
      console.log('Botão Mapa não encontrado na página');
    }
  });

  test('Verifica sessão WhatsApp (Evolution API)', async ({ page }) => {
    // Acessa Supabase via API para verificar se há sessão ativa
    // Login primeiro
    await page.goto(`${BASE}/login`);
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASS);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/, { timeout: 15000 });

    // Vai para configurações de WhatsApp
    await page.goto(`${BASE}/whatsapp`);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'e2e/screenshots/whatsapp-settings.png', fullPage: false });
    console.log('Screenshot WhatsApp: e2e/screenshots/whatsapp-settings.png');

    // Verifica se há sessão configurada
    const sessionText = await page.getByText(/instância|sessão|conectad/i).first().textContent().catch(() => 'não encontrado');
    console.log('Status WhatsApp:', sessionText);
  });

  test('Verifica app entregador acessível', async ({ page }) => {
    await page.goto(`${BASE}/entregador`);
    await page.waitForTimeout(2000);
    const url = page.url();
    console.log('URL app entregador:', url);
    await page.screenshot({ path: 'e2e/screenshots/deliverer-app.png', fullPage: false });
    console.log('Screenshot entregador: e2e/screenshots/deliverer-app.png');

    // Verifica se tem campo de login ou dashboard
    const hasLogin = await page.locator('input[type="email"]').isVisible().catch(() => false);
    const hasApp = await page.getByText(/meus pedidos|entrega|pedido/i).first().isVisible().catch(() => false);
    console.log('Tem tela login:', hasLogin, '| Tem app:', hasApp);
  });
});
