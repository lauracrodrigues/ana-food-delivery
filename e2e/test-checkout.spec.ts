import { test } from '@playwright/test';

const MENU_URL = 'https://anafood.vip/menu/maissistem';

test('checkout PIX via cardápio digital', async ({ page }) => {
  page.setDefaultTimeout(25000);
  const networkLogs: string[] = [];

  page.on('requestfailed', req =>
    networkLogs.push(`FALHOU: ${req.method()} ${req.url()} — ${req.failure()?.errorText}`)
  );
  page.on('response', resp => {
    if (resp.url().includes('supabase') || resp.url().includes('mercadopago'))
      networkLogs.push(`${resp.status()} ${resp.request().method()} ${resp.url().split('?')[0]}`);
  });

  console.log('1. Abrindo cardápio...');
  await page.goto(MENU_URL, { waitUntil: 'networkidle' });

  console.log('2. Adicionando produto...');
  await page.locator('button', { hasText: 'Adicionar' }).first().click();
  await page.waitForTimeout(800);

  console.log('3. Confirmando no modal...');
  await page.locator('button', { hasText: 'Adicionar ao Carrinho' }).click();
  await page.waitForTimeout(1000);

  console.log('4. Clicando Finalizar Pedido...');
  await page.locator('button', { hasText: 'Finalizar Pedido' }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/pw4-checkout-open.png' });

  console.log('5. Preenchendo dados...');
  await page.locator('#name').fill('Teste Playwright');
  await page.locator('#phone').fill('11999990001');

  // Radix RadioGroup — clicar na Label, não no input hidden
  const pickupLabel = page.locator('label[for="pickup"]');
  if (await pickupLabel.isVisible()) await pickupLabel.click();

  const pixMpLabel = page.locator('label[for="pix_mp"]');
  if (await pixMpLabel.isVisible()) {
    console.log('   PIX automático disponível — selecionando...');
    await pixMpLabel.click();
  } else {
    console.log('   AVISO: PIX automático não apareceu');
  }

  await page.screenshot({ path: '/tmp/pw5-form-filled.png' });

  console.log('6. Submetendo...');
  // Botão de submit muda texto quando PIX selecionado
  const submitBtn = page.locator('button[type="submit"]');
  const submitText = await submitBtn.textContent();
  console.log('   Texto do botão submit:', submitText?.trim());
  await submitBtn.click();

  console.log('   Aguardando resposta da edge function...');
  await page.waitForTimeout(12000);
  await page.screenshot({ path: '/tmp/pw6-result.png' });

  const hasQr    = await page.locator('img[alt*="QR"]').isVisible().catch(() => false);
  const pageText = await page.locator('body').textContent();
  const hasError = pageText?.toLowerCase().includes('erro') ?? false;

  console.log('\n=== RESULTADO ===');
  console.log('QR Code:', hasQr);
  console.log('Erro no texto:', hasError);
  console.log('\n=== REDE ===');
  networkLogs.forEach(l => console.log(l));
});
