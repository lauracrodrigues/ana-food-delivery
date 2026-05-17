// generate-menu-document/index.ts — v2.0.0
// Gera PDF do cardápio com cache em companies.menu_pdf_cache
// Hash do menu atual decide regenerar (cardápio mudou) ou reusar cache
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { jsPDF } from 'https://esm.sh/jspdf@2.5.2';

// SHA-256 hex pra detectar mudanças no cardápio sem regenerar PDF
async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: any, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body = await req.json();
    const { company_id, force } = body as { company_id?: string; force?: boolean };
    if (!company_id) return json({ error: 'company_id obrigatório' }, 400);

    // Carrega dados (companies inclui cache atual)
    const [{ data: company }, { data: categories }, { data: products }] = await Promise.all([
      supabase.from('companies').select('fantasy_name, name, phone, whatsapp, description, logo_url, menu_pdf_cache')
        .eq('id', company_id).single(),
      supabase.from('categories').select('id, name, on_off, "order"')
        .eq('company_id', company_id).eq('on_off', true).order('"order"'),
      supabase.from('products')
        .select('id, name, description, price, promotional_price, category_id, on_off, tags, updated_at')
        .eq('company_id', company_id).eq('on_off', true).order('name'),
    ]);

    if (!company) return json({ error: 'Empresa não encontrada' }, 404);

    // Computa hash do cardápio atual — só campos que afetam o PDF
    const menuSnapshot = JSON.stringify({
      cats: (categories || []).map((c: any) => ({ id: c.id, name: c.name, order: c.order })),
      prods: (products || []).map((p: any) => ({
        id: p.id, name: p.name, desc: p.description,
        price: p.price, promo: p.promotional_price,
        cat: p.category_id, tags: p.tags,
      })),
    });
    const currentHash = await sha256Hex(menuSnapshot);

    // Cache hit? Retorna PDF salvo sem regenerar (economiza CPU + tokens caso bot)
    const cache = (company.menu_pdf_cache || {}) as { pdf_base64?: string; menu_hash?: string; generated_at?: string };
    if (!force && cache.pdf_base64 && cache.menu_hash === currentHash) {
      return json({
        success: true,
        pdf_base64: cache.pdf_base64,
        mime_type: 'application/pdf',
        filename: `cardapio_${(company.fantasy_name || company.name || 'loja').toLowerCase().replace(/\s+/g, '_')}.pdf`,
        cached: true,
        generated_at: cache.generated_at,
        stats: { categories: (categories || []).length, products: (products || []).length },
      });
    }

    // Monta PDF — A4 portrait
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = 210;
    const pageH = 297;
    const marginX = 12;
    let y = 14;

    const storeName = company.fantasy_name || company.name;

    // Header
    pdf.setFillColor(99, 102, 241); // indigo
    pdf.rect(0, 0, pageW, 22, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(18);
    pdf.text(storeName, pageW / 2, 12, { align: 'center' });
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Cardápio', pageW / 2, 18, { align: 'center' });
    y = 30;

    // Subtítulo: contato
    pdf.setTextColor(80, 80, 80);
    pdf.setFontSize(9);
    const contactLine = [company.whatsapp ? `📱 ${company.whatsapp}` : null]
      .filter(Boolean).join('  •  ');
    if (contactLine) {
      pdf.text(contactLine, pageW / 2, y, { align: 'center' });
      y += 6;
    }

    // Iterate categories
    const cats = categories || [];
    const prods = products || [];

    for (const cat of cats) {
      const items = prods.filter((p: any) => p.category_id === cat.id);
      if (items.length === 0) continue;

      // Page break check
      if (y > pageH - 30) {
        pdf.addPage();
        y = 16;
      }

      // Category title
      pdf.setFillColor(243, 244, 246);
      pdf.rect(marginX - 2, y - 5, pageW - marginX * 2 + 4, 8, 'F');
      pdf.setTextColor(30, 30, 30);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.text(String(cat.name).toUpperCase(), marginX, y);
      y += 8;

      // Items
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      for (const item of items) {
        if (y > pageH - 18) {
          pdf.addPage();
          y = 16;
        }

        const hasPromo = item.promotional_price && item.promotional_price < item.price;
        const priceFinal = hasPromo ? item.promotional_price : item.price;
        const priceLabel = `R$ ${Number(priceFinal).toFixed(2).replace('.', ',')}`;

        // Nome
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(20, 20, 20);
        const nameWidth = pdf.getTextWidth(item.name);
        const priceWidth = pdf.getTextWidth(priceLabel);
        // dots leader
        const availSpace = pageW - marginX * 2 - nameWidth - priceWidth - 4;
        const dotCount = Math.max(3, Math.floor(availSpace / 1.6));
        const dots = '.'.repeat(dotCount);

        pdf.text(item.name, marginX, y);
        pdf.setTextColor(160, 160, 160);
        pdf.text(dots, marginX + nameWidth + 1, y);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(99, 102, 241);
        pdf.text(priceLabel, pageW - marginX, y, { align: 'right' });

        // Promo strike-through original
        if (hasPromo) {
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(7);
          pdf.setTextColor(160, 160, 160);
          const originalLabel = `de R$ ${Number(item.price).toFixed(2).replace('.', ',')}`;
          pdf.text(originalLabel, pageW - marginX, y + 3, { align: 'right' });
          pdf.setFontSize(10);
        }

        y += 5;

        // Descrição (truncada)
        if (item.description) {
          pdf.setFont('helvetica', 'italic');
          pdf.setFontSize(8);
          pdf.setTextColor(110, 110, 110);
          const desc = String(item.description).slice(0, 100);
          const split = pdf.splitTextToSize(desc, pageW - marginX * 2);
          pdf.text(split.slice(0, 1), marginX, y);
          y += 3.5;
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'normal');
        }

        // Tags (vegano/picante/etc)
        if (item.tags && Array.isArray(item.tags) && item.tags.length > 0) {
          pdf.setFontSize(7);
          pdf.setTextColor(99, 102, 241);
          const tagsLabel = item.tags.slice(0, 4).map((t: string) => `#${t}`).join(' ');
          pdf.text(tagsLabel, marginX, y);
          y += 3;
          pdf.setFontSize(10);
        }

        y += 2;
      }

      y += 4;
    }

    // Footer última página
    pdf.setFontSize(8);
    pdf.setTextColor(140, 140, 140);
    pdf.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`, pageW / 2, pageH - 8, { align: 'center' });

    // Output base64
    const pdfBase64 = pdf.output('datauristring').split(',')[1];
    const generatedAt = new Date().toISOString();

    // Persiste cache em companies.menu_pdf_cache — próxima chamada com hash igual reusa
    await supabase.from('companies').update({
      menu_pdf_cache: {
        pdf_base64: pdfBase64,
        menu_hash: currentHash,
        generated_at: generatedAt,
      }
    }).eq('id', company_id);

    return json({
      success: true,
      pdf_base64: pdfBase64,
      mime_type: 'application/pdf',
      filename: `cardapio_${storeName.toLowerCase().replace(/\s+/g, '_')}.pdf`,
      cached: false,
      generated_at: generatedAt,
      stats: { categories: cats.length, products: prods.length },
    });
  } catch (e: any) {
    console.error('[generate-menu-document]', e);
    return json({ error: e?.message || 'Erro interno' }, 500);
  }
});
