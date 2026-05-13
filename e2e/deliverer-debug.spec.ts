import { test, expect } from '@playwright/test';

const EMAIL = 'tarcisiorp16@gmail.com';
const PASSWORD = '314159';

test('debug: fluxo completo login entregador', async ({ page }) => {
  const logs: string[] = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => logs.push(`[ERROR] ${err.message}`));

  // Tenta pelo /login principal
  await page.goto('/login');
  await page.screenshot({ path: '/tmp/01-login-page.png' });

  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.screenshot({ path: '/tmp/02-filled.png' });
  await page.click('button[type="submit"]');

  // Aguarda navegação
  await page.waitForTimeout(5000);
  await page.screenshot({ path: '/tmp/03-after-submit.png' });

  console.log('URL final:', page.url());
  console.log('Logs:', logs.slice(0, 20).join('\n'));

  // Se foi para /entregador, testa o conteúdo
  if (page.url().includes('/entregador')) {
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/tmp/04-entregador.png' });
    const body = await page.textContent('body');
    console.log('Conteúdo visível:', body?.substring(0, 500));
  }
});

test('debug: login direto pelo /entregador', async ({ page }) => {
  await page.goto('/entregador');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/tmp/05-entregador-direto.png' });

  const url = page.url();
  const bodyText = await page.textContent('body');
  console.log('URL:', url);
  console.log('Conteúdo:', bodyText?.substring(0, 300));

  // Se mostrou tela de login do entregador
  const emailInput = page.locator('input[type="email"]');
  if (await emailInput.isVisible()) {
    await emailInput.fill(EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button:has-text("Entrar")');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: '/tmp/06-after-login-entregador.png' });
    console.log('URL após login:', page.url());
    const body = await page.textContent('body');
    console.log('Conteúdo após login:', body?.substring(0, 500));
  }
});
