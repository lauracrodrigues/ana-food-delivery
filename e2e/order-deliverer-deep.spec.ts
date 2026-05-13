import { test, expect } from '@playwright/test';

const BASE = 'https://anafood.vip';
const EMAIL = 'maissistem@gmail.com';
const PASS = '314159';
const DELIVERER_EMAIL = 'tarcisiorp16@gmail.com';

async function loginAdmin(page: any) {
  await page.goto(`${BASE}/login`);
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard/, { timeout: 15000 });
  await page.goto(`${BASE}/orders`);
  await page.waitForTimeout(3000);
}

test('1. Botão vincular — abre dialog AssignDeliverer', async ({ page }) => {
  await loginAdmin(page);

  // Usa locator mais específico — botão pequeno dentro dos cards de delivery
  const vincularBtn = page.locator('button:has-text("vincular"), button:has-text("trocar")').first();
  const found = await vincularBtn.isVisible({ timeout: 5000 }).catch(() => false);
  console.log('Botão vincular/trocar visível:', found);

  if (!found) {
    // Tenta scroll horizontal para achar coluna "Em Entrega"
    await page.evaluate(() => window.scrollTo(1000, 0));
    await page.waitForTimeout(500);
    const found2 = await vincularBtn.isVisible({ timeout: 3000 }).catch(() => false);
    console.log('Após scroll:', found2);
  }

  if (await vincularBtn.isVisible().catch(() => false)) {
    await vincularBtn.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'e2e/screenshots/assign-dialog.png' });

    const dialog = page.locator('[role="dialog"]');
    const dialogVisible = await dialog.isVisible().catch(() => false);
    console.log('Dialog abriu:', dialogVisible);

    if (dialogVisible) {
      const dialogText = await dialog.textContent();
      console.log('Conteúdo dialog:', dialogText?.substring(0, 300));
      // Verifica se tem lista de entregadores
      const hasZezim = (dialogText ?? '').toLowerCase().includes('zezim') || (dialogText ?? '').toLowerCase().includes('entregador');
      console.log('Lista de entregadores no dialog:', hasZezim);
    }
  } else {
    console.log('AVISO: botão vincular não encontrado — pode ser que todos pedidos tenham entregador ou são tipo Retirada');
    await page.screenshot({ path: 'e2e/screenshots/kanban-state.png', fullPage: true });
  }
});

test('2. Login entregador ZEZIM (tarcisiorp16) e verifica app', async ({ page }) => {
  await page.goto(`${BASE}/entregador`);
  await page.waitForTimeout(1000);

  const emailInput = page.locator('input[type="email"]');
  if (!await emailInput.isVisible().catch(() => false)) {
    console.log('Já logado ou redirecionado');
    return;
  }

  await emailInput.fill(DELIVERER_EMAIL);
  await page.locator('input[type="password"]').fill(PASS);

  // Botão usa onClick, não type="submit"
  await page.getByRole('button', { name: /entrar/i }).click();
  await page.waitForTimeout(5000);

  const url = page.url();
  console.log('URL após login entregador:', url);
  await page.screenshot({ path: 'e2e/screenshots/deliverer-dashboard.png' });

  // Verifica erro
  const error = await page.locator('[class*="error"], [class*="destructive"], [class*="red"]').first().textContent().catch(() => null);
  if (error) console.log('Erro no login:', error);

  // Verifica se está no app
  const hasDashboard = await page.getByText(/meus pedidos|nenhum pedido|aguardando/i).first().isVisible().catch(() => false);
  console.log('App do entregador carregou:', hasDashboard);

  // Verifica se pedido #001 aparece
  const has001 = await page.getByText(/#001|001/).first().isVisible().catch(() => false);
  console.log('Pedido #001 visível no app:', has001);
});

test('3. Verificar se WhatsApp envia via API (não link)', async ({ page }) => {
  await loginAdmin(page);

  // Monitorar console para checar se Evolution API foi chamada
  const consoleLogs: string[] = [];
  page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));

  // Monitorar requests de rede
  const apiCalls: string[] = [];
  page.on('request', req => {
    const url = req.url();
    if (url.includes('whatsapp') || url.includes('evolution') || url.includes('wa.me') || url.includes('functions')) {
      apiCalls.push(`${req.method()} ${url}`);
    }
  });

  // Clica no ícone de WhatsApp de um pedido
  const waBtns = page.locator('[title*="WhatsApp"], [title*="whatsapp"], button[class*="whatsapp"]');
  const waCount = await waBtns.count();
  console.log('Botões WhatsApp encontrados:', waCount);

  if (waCount > 0) {
    await waBtns.first().click();
    await page.waitForTimeout(2000);

    console.log('API calls capturadas:', apiCalls);
    const usedEvolution = apiCalls.some(c => c.includes('functions') || c.includes('whatsapp-evolution'));
    const usedWaLink = apiCalls.some(c => c.includes('wa.me'));
    console.log('Usou Evolution API:', usedEvolution, '| Usou wa.me link:', usedWaLink);
  }
});

test('4. Mapa abre e mostra entregadores', async ({ page }) => {
  await loginAdmin(page);

  const mapBtn = page.getByRole('button', { name: /mapa/i });
  await expect(mapBtn).toBeVisible({ timeout: 5000 });
  await mapBtn.click();
  await page.waitForTimeout(2000);

  await page.screenshot({ path: 'e2e/screenshots/map-opened.png' });

  const mapHeader = page.getByText(/Mapa de Entregadores/i);
  const mapVisible = await mapHeader.isVisible().catch(() => false);
  console.log('Painel mapa visível:', mapVisible);

  const gpsInfo = await page.getByText(/GPS ativo|com GPS/i).textContent().catch(() => null);
  console.log('Info GPS:', gpsInfo);
});
