import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5173';
const EMAIL = 'maissistem@gmail.com';
const PASS = '314159';

async function loginAdmin(page: any) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|menu|orders)/, { timeout: 15000 });
}

test('DnD categorias — sem snap-back', async ({ page }) => {
  await loginAdmin(page);

  // Navegar para gerenciamento de cardápio (categorias e produtos)
  await page.goto(`${BASE}/menu`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'test-results/dnd-01-menu-page.png' });

  // Aguardar lista de categorias carregar
  const gripHandles = page.locator('[data-testid="category-grip"], [class*="cursor-grab"]');
  await gripHandles.first().waitFor({ timeout: 10000 });

  const items = page.locator('[class*="cursor-grab"]');
  const count = await items.count();
  console.log(`Categorias encontradas com grip: ${count}`);

  if (count < 2) {
    console.log('Menos de 2 categorias — pulando teste DnD');
    return;
  }

  // Capturar nomes antes do drag
  const allItems = page.locator('.space-y-2 > div');
  const firstBefore = await allItems.first().textContent();
  const secondBefore = await allItems.nth(1).textContent();
  console.log(`Antes: [0]="${firstBefore?.slice(0,30)}" [1]="${secondBefore?.slice(0,30)}"`);

  // Realizar drag: primeira categoria → posição da segunda
  const firstGrip = items.first();
  const secondGrip = items.nth(1);

  const fromBox = await firstGrip.boundingBox();
  const toBox = await secondGrip.boundingBox();

  if (!fromBox || !toBox) throw new Error('Bounding box não encontrado');

  // Drag lento para dnd-kit detectar corretamente
  await page.mouse.move(fromBox.x + fromBox.width / 2, fromBox.y + fromBox.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(200);

  // Mover gradualmente
  const steps = 10;
  for (let i = 1; i <= steps; i++) {
    const x = fromBox.x + (toBox.x - fromBox.x) * (i / steps) + fromBox.width / 2;
    const y = fromBox.y + (toBox.y - fromBox.y) * (i / steps) + fromBox.height / 2 + 10;
    await page.mouse.move(x, y);
    await page.waitForTimeout(30);
  }

  await page.screenshot({ path: 'test-results/dnd-02-during-drag.png' });
  await page.mouse.up();

  // Verificar IMEDIATAMENTE após soltar (sem delay) — snap-back = falha
  await page.waitForTimeout(100);
  await page.screenshot({ path: 'test-results/dnd-03-after-drop-100ms.png' });

  const firstAfter100ms = await allItems.first().textContent();
  console.log(`100ms após drop: [0]="${firstAfter100ms?.slice(0,30)}"`);

  // Aguardar 1.5s e verificar novamente
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'test-results/dnd-04-after-drop-1500ms.png' });

  const firstAfter1500ms = await allItems.first().textContent();
  console.log(`1500ms após drop: [0]="${firstAfter1500ms?.slice(0,30)}"`);

  // A ordem em 100ms deve ser diferente da original (item moveu imediatamente)
  const movedImmediately = firstAfter100ms !== firstBefore;
  console.log(`Moveu imediatamente (sem snap-back): ${movedImmediately}`);

  // A ordem em 100ms e 1500ms deve ser a mesma (sem transição tardia)
  const stableAfterDrop = firstAfter100ms === firstAfter1500ms;
  console.log(`Ordem estável (sem ajuste tardio): ${stableAfterDrop}`);

  expect(movedImmediately, 'Item deveria mover imediatamente ao soltar, sem snap-back').toBe(true);
  expect(stableAfterDrop, 'Ordem não deveria mudar após 1.5s (snap-back tardio)').toBe(true);
});
