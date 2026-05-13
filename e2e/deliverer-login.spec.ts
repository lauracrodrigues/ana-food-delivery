import { test, expect } from '@playwright/test';

const EMAIL = 'tarcisiorp16@gmail.com';
const PASSWORD = '314159';

test('login como entregador redireciona para /entregador', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');

  // Aguarda redirect para /entregador
  await expect(page).toHaveURL(/\/entregador/, { timeout: 10000 });
});

test('dashboard do entregador carrega sem erro de conta não vinculada', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');

  await page.waitForURL(/\/entregador/, { timeout: 10000 });

  // Não deve mostrar mensagem de erro de vinculação
  const errorMsg = page.getByText('Conta não vinculada');
  await expect(errorMsg).not.toBeVisible({ timeout: 5000 });

  // Deve mostrar o nome do entregador (ZEZIM ENTREGADOR)
  await expect(page.getByText('ZEZIM ENTREGADOR')).toBeVisible({ timeout: 8000 });
});

test('sessão já ativa redireciona direto para /entregador', async ({ page }) => {
  // Faz login
  await page.goto('/login');
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/entregador/, { timeout: 10000 });

  // Acessa /login novamente — deve redirecionar de volta
  await page.goto('/login');
  await expect(page).toHaveURL(/\/entregador/, { timeout: 8000 });
});
