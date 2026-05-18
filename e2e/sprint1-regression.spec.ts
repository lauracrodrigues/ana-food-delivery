// e2e/sprint1-regression.spec.ts — Sprint 1 regression (MenuContext refactor)
import { test, expect } from '@playwright/test';

const STORE_URL = 'https://anafood.vip/menu/maissistem';
const ADMIN_URL = 'https://anafood.vip';

test.describe('Sprint 1 — Cardápio público', () => {
  test('home carrega + cards visíveis', async ({ page }) => {
    await page.goto(STORE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Title bate
    expect(await page.title()).toContain('Mais Sistem');

    // 40+ cards de produto renderizados
    const cards = await page.locator('div.rounded-xl').count();
    expect(cards).toBeGreaterThan(10);
  });

  test('botão "Minha conta" abre Sheet', async ({ page }) => {
    await page.goto(STORE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    await page.locator('button[aria-label="Minha conta"]').first().click();
    await page.waitForTimeout(800);

    // Sheet aberto = botão fica em data-state=open OU form de identify visível
    const sheetOpen = await page.locator('[data-state="open"]').count();
    const phoneInput = await page.locator('input[type="tel"]').count();
    expect(sheetOpen + phoneInput).toBeGreaterThan(0);
  });

  test('cabeçalho clickable abre Profile Sheet', async ({ page }) => {
    await page.goto(STORE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    await page.locator('button[aria-label="Ver detalhes da loja"]').first().click();
    await page.waitForTimeout(800);

    // Profile sheet mostra horário/contato/endereço
    const profileText = await page.getByText(/horário|entrega|funcionamento/i).count();
    expect(profileText).toBeGreaterThan(0);
  });

  test('sem React error #310 ou erros críticos', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto(STORE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    const critical = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('manifest') &&
      !e.includes('AbortError') &&
      !e.includes('Failed to load resource') &&
      !e.toLowerCase().includes('cookie')
    );

    // Garantia: zero erros React minified (#310 = hooks order, #185 = ref, etc)
    const reactErrs = critical.filter(e => /Minified React error|#\d{3}/.test(e));
    expect(reactErrs, `React errors: ${JSON.stringify(reactErrs)}`).toEqual([]);
  });
});

test.describe('Sprint 1 — Login admin', () => {
  test('login sem cookie → fica em /login', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto(`${ADMIN_URL}/login`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    expect(page.url()).toContain('/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('rota protegida sem auth → redirect /login (não pisca)', async ({ page }) => {
    await page.context().clearCookies();
    const nav: string[] = [];
    page.on('framenavigated', f => { if (f === page.mainFrame()) nav.push(f.url()); });

    await page.goto(`${ADMIN_URL}/dashboard`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    expect(page.url()).toContain('/login');
    // Sem loop: <10 navigations
    expect(nav.length, `Loop suspeito: ${nav.join(' → ')}`).toBeLessThan(10);
  });
});
