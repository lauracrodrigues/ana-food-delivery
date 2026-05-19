// Validação Caribe: produtos + cardápio publico + grupos filtrados por dia
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const SUPABASE = createClient(
  'https://jgdyklzrxygvwuhlnbat.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpnZHlrbHpyeHlndnd1aGxuYmF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MDg3NDIsImV4cCI6MjA3NDM4NDc0Mn0.6mb9UjykgsU1lN3OtFEFhGzlru-u8ff04cwh-eLguIo'
);
const CARIBE_ID = '739786f0-abda-41e4-975a-9ddac451a33b';

test.describe('Caribe — Validação cadastro', () => {
  test('cardápio público — Marmitex visíveis, Lasanha oculta', async ({ page }) => {
    await page.goto('https://anafood.vip/menu/caribe', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    const marmitex = await page.getByText(/Marmitex/i).count();
    expect(marmitex).toBeGreaterThanOrEqual(2);
    const lasanha = await page.getByText(/^Lasanha$/i).count();
    expect(lasanha).toBe(0);
  });

  test('RPC retorna proteínas/acompanhamentos filtrados pelo dia', async () => {
    const { data: prod } = await SUPABASE.from('products').select('id')
      .eq('company_id', CARIBE_ID).eq('name', 'Marmitex Grande').single();
    expect(prod).toBeTruthy();
    const { data } = await SUPABASE.rpc('get_product_with_modifiers' as any, { p_product_id: (prod as any).id });
    const groups = (data as any).groups || [];
    expect(groups.length).toBe(2);
    const proteinas = groups.find((g: any) => g.name === 'Proteínas');
    const acomp = groups.find((g: any) => g.name === 'Acompanhamentos');
    expect(proteinas.items.length).toBeGreaterThan(0);
    expect(acomp.items.length).toBeGreaterThan(0);
    console.log('Proteínas hoje:', proteinas.items.map((i: any) => i.name).join(', '));
    console.log('Acompanhamentos hoje:', acomp.items.map((i: any) => i.name).join(', '));
  });

  test('60+ bairros de entrega cadastrados', async () => {
    const { count } = await SUPABASE.from('delivery_fees')
      .select('id', { count: 'exact', head: true }).eq('company_id', CARIBE_ID);
    expect(count ?? 0).toBeGreaterThanOrEqual(60);
  });
});
