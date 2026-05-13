import { test, expect } from '@playwright/test';

const BASE = 'https://anafood.vip';
const EMAIL = 'maissistem@gmail.com';
const PASS = '314159';

async function loginAdmin(page: any) {
  await page.goto(`${BASE}/login`);
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard/, { timeout: 15000 });
  await page.goto(`${BASE}/orders`);
  await page.waitForTimeout(3000);
}

test('Vincular entregador e verificar chamada Evolution API', async ({ page }) => {
  // Captura todas as requisições de rede
  const requests: { method: string; url: string; body?: string }[] = [];
  page.on('request', req => {
    const url = req.url();
    if (url.includes('supabase') || url.includes('evolution') || url.includes('function') || url.includes('wa.me')) {
      requests.push({ method: req.method(), url, body: req.postData() ?? undefined });
    }
  });

  const responses: { url: string; status: number }[] = [];
  page.on('response', res => {
    const url = res.url();
    if (url.includes('supabase') || url.includes('function') || url.includes('evolution')) {
      responses.push({ url, status: res.status() });
    }
  });

  await loginAdmin(page);

  // Clica no botão vincular
  const vincularBtn = page.locator('button:has-text("vincular"), button:has-text("trocar")').first();
  await vincularBtn.waitFor({ timeout: 5000 });
  await vincularBtn.click();
  await page.waitForTimeout(1000);

  // Seleciona o entregador ZEZIM
  const zezimOption = page.locator('[class*="cursor-pointer"], button, [role="option"]').filter({ hasText: /ZEZIM|entregador/i }).first();
  if (await zezimOption.isVisible().catch(() => false)) {
    await zezimOption.click();
    await page.waitForTimeout(500);
  } else {
    // Clica no primeiro item da lista de entregadores
    const firstDeliverer = page.locator('[class*="rounded"][class*="border"]').filter({ hasText: /627\d+|629\d+|\d{11}/ }).first();
    if (await firstDeliverer.isVisible().catch(() => false)) {
      await firstDeliverer.click();
      await page.waitForTimeout(500);
    }
  }

  await page.screenshot({ path: 'e2e/screenshots/assign-selected.png' });

  // Clica em "Confirmar e Enviar para Entrega"
  const confirmBtn = page.getByRole('button', { name: /confirmar e enviar/i });
  if (await confirmBtn.isVisible().catch(() => false)) {
    console.log('Clicando Confirmar e Enviar...');
    await confirmBtn.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'e2e/screenshots/after-assign.png' });
  }

  // Analisa as requisições feitas
  const whatsappReqs = requests.filter(r => r.url.includes('whatsapp') || r.url.includes('function'));
  const waLinkOpened = requests.some(r => r.url.includes('wa.me'));

  console.log('\n=== ANÁLISE DE REQUISIÇÕES ===');
  console.log('Total reqs Supabase/Evolution:', requests.length);
  console.log('Reqs WhatsApp/Functions:', whatsappReqs.length);
  console.log('Link wa.me aberto:', waLinkOpened);

  if (whatsappReqs.length > 0) {
    whatsappReqs.forEach(r => {
      console.log(`→ ${r.method} ${r.url.substring(0, 120)}`);
      if (r.body) console.log(`  Body: ${r.body.substring(0, 200)}`);
    });
  }

  // Verifica respostas das funções
  const fnResponses = responses.filter(r => r.url.includes('function'));
  if (fnResponses.length > 0) {
    console.log('\nRespostas das functions:');
    fnResponses.forEach(r => console.log(`→ ${r.status} ${r.url.substring(0, 100)}`));
  }

  console.log('\nRESUMO:');
  if (whatsappReqs.some(r => r.url.includes('whatsapp-evolution'))) {
    console.log('✅ Evolution API foi chamada!');
  } else if (waLinkOpened) {
    console.log('❌ Usou wa.me link (fallback) — sessão WhatsApp pode estar inativa');
  } else {
    console.log('⚠️ Nenhuma chamada WA detectada — pedido pode não ser delivery ou entregador sem telefone');
  }
});

test('Verificar app entregador após vínculo', async ({ page }) => {
  // Login como entregador
  await page.goto(`${BASE}/entregador`);
  await page.waitForTimeout(1000);

  const emailInput = page.locator('input[type="email"]');
  if (await emailInput.isVisible().catch(() => false)) {
    await emailInput.fill('tarcisiorp16@gmail.com');
    await page.locator('input[type="password"]').fill(PASS);
    await page.getByRole('button', { name: /entrar/i }).click();
    await page.waitForTimeout(8000); // aguarda carregamento + realtime
  }

  await page.screenshot({ path: 'e2e/screenshots/deliverer-orders.png' });

  const url = page.url();
  const pageText = await page.textContent('body');
  console.log('URL:', url);
  console.log('Tem "Tudo entregue":', pageText?.includes('Tudo entregue'));
  console.log('Tem pedidos:', pageText?.includes('#00'));
  console.log('Entregas pendentes:', pageText?.match(/(\d+) entregas pendentes/)?.[1] ?? '0');
});
