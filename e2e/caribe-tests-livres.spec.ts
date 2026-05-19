// Testes livres pós-cadastro Caribe (bebidas + sucos + marmitex)
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const SB = createClient(
  'https://jgdyklzrxygvwuhlnbat.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpnZHlrbHpyeHlndnd1aGxuYmF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MDg3NDIsImV4cCI6MjA3NDM4NDc0Mn0.6mb9UjykgsU1lN3OtFEFhGzlru-u8ff04cwh-eLguIo'
);
const CARIBE = '739786f0-abda-41e4-975a-9ddac451a33b';

test.describe('Caribe — Testes pós-cadastro', () => {
  test('total de produtos ativos por categoria', async () => {
    const { data } = await SB.from('products')
      .select('name, category_id')
      .eq('company_id', CARIBE)
      .eq('on_off', true);
    expect((data || []).length).toBeGreaterThanOrEqual(20);
  });

  test('bebidas com descrição preenchida', async () => {
    const { data: cat } = await SB.from('categories')
      .select('id').eq('company_id', CARIBE).eq('name', 'Bebidas').single();
    const { data } = await SB.from('products')
      .select('name, description')
      .eq('company_id', CARIBE)
      .eq('category_id', (cat as any).id);
    const withDescription = (data || []).filter(p => (p as any).description?.trim());
    expect(withDescription.length).toBeGreaterThanOrEqual(15);
  });

  test('categoria Sucos criada', async () => {
    const { data } = await SB.from('categories')
      .select('id, name').eq('company_id', CARIBE).eq('name', 'Sucos');
    expect((data || []).length).toBe(1);
  });

  test('Suco de Laranja Natural 500ml visível no cardápio público', async ({ page }) => {
    await page.goto('https://anafood.vip/menu/caribe', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    const suco = await page.getByText(/Suco de Laranja Natural/i).count();
    expect(suco).toBeGreaterThan(0);
  });

  test('descrições aparecem no cardápio', async ({ page }) => {
    await page.goto('https://anafood.vip/menu/caribe', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    // Frase específica de descrição
    const desc = await page.getByText(/gelado e refrescante|extraído na hora|sabor maranhense/i).count();
    expect(desc).toBeGreaterThan(0);
  });

  test('Marmitex Grande continua com modifiers (não afetado por novos produtos)', async () => {
    const { data: p } = await SB.from('products').select('id')
      .eq('company_id', CARIBE).eq('name', 'Marmitex Grande').single();
    const { data } = await SB.rpc('get_product_with_modifiers' as any, { p_product_id: (p as any).id });
    const groups = (data as any).groups || [];
    expect(groups.length).toBe(2);
  });

  test('bebida não tem modifiers (não confunde fluxo)', async () => {
    const { data: p } = await SB.from('products').select('id')
      .eq('company_id', CARIBE).eq('name', 'Coca-Cola 2L').single();
    const { data } = await SB.rpc('get_product_with_modifiers' as any, { p_product_id: (p as any).id });
    const groups = (data as any).groups || [];
    expect(groups.length).toBe(0);
  });

  test('webhook Caribe configurado no Evolution', async () => {
    // Smoke pure HTTP — confirma URL setada (não checa auth, só estrutura)
    const url = 'https://evo.anafood.vip/webhook/find/Caribe%20Restaurante';
    const res = await fetch(url, {
      headers: { apikey: process.env.EVO_KEY || 'placeholder' },
    });
    // Se não tiver API key, falha auth (esperado em CI). Skip neste caso.
    if (res.status === 401 || res.status === 403) {
      test.skip();
      return;
    }
    const body = await res.json();
    expect(body?.enabled).toBe(true);
  });

  test('descrições não estão vazias para sucos', async () => {
    const { data: cat } = await SB.from('categories')
      .select('id').eq('company_id', CARIBE).eq('name', 'Sucos').single();
    const { data } = await SB.from('products')
      .select('description').eq('company_id', CARIBE).eq('category_id', (cat as any).id);
    const empty = (data || []).filter(p => !(p as any).description?.trim());
    expect(empty.length).toBe(0);
  });
});
