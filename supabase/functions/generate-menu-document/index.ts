// generate-menu-document/index.ts — v3.0.0
// Cardápio PDF profissional: logo + cores brand + categorias + produtos com extras/grupos
// Cache em companies.menu_pdf_cache com hash SHA-256 (invalidação automática)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { jsPDF } from 'https://esm.sh/jspdf@2.5.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: any, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Cores fallback por segmento — usadas se brand_color vazio
const SEGMENT_COLORS: Record<string, [number, number, number]> = {
  marmitaria:    [34, 139, 87],    // verde
  hamburgueria:  [217, 119, 6],    // âmbar
  pizzaria:      [220, 38, 38],    // vermelho
  japonesa:      [220, 38, 38],    // vermelho
  acai:          [88, 28, 135],    // roxo
  doceria:       [219, 39, 119],   // rosa
  cafeteria:     [120, 53, 15],    // marrom
  saudavel:      [22, 163, 74],    // verde claro
  restaurante:   [127, 29, 29],    // bordeaux
  lanchonete:    [234, 88, 12],    // laranja
  bar:           [30, 64, 175],    // azul
  default:       [99, 102, 241],   // índigo padrão
};

function hexToRgb(hex: string): [number, number, number] | null {
  if (!hex) return null;
  const clean = hex.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function resolveBrandColor(company: any): [number, number, number] {
  // Prioridade: brand_color hex → segment fallback → default
  const fromHex = hexToRgb(company?.brand_color);
  if (fromHex) return fromHex;
  const segment = String(company?.segment || '').toLowerCase();
  return SEGMENT_COLORS[segment] || SEGMENT_COLORS.default;
}

// Cor secundária (mais clara) pra fundos sutis
function lighten([r, g, b]: [number, number, number], amount = 0.92): [number, number, number] {
  return [
    Math.round(r + (255 - r) * amount),
    Math.round(g + (255 - g) * amount),
    Math.round(b + (255 - b) * amount),
  ];
}

// Fetch logo URL → base64 PNG/JPG. Retorna { dataUri, format } ou null.
async function fetchLogoAsBase64(url: string): Promise<{ dataUri: string; format: 'PNG' | 'JPEG' } | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    const format: 'PNG' | 'JPEG' = contentType.includes('jpeg') || contentType.includes('jpg') ? 'JPEG' : 'PNG';
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    const base64 = btoa(bin);
    return { dataUri: `data:${contentType || 'image/png'};base64,${base64}`, format };
  } catch (e) {
    console.warn('[logo fetch failed]', (e as any)?.message);
    return null;
  }
}

function formatMoney(n: number): string {
  return `R$ ${Number(n).toFixed(2).replace('.', ',')}`;
}

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

    // Carrega dados em paralelo
    const [
      { data: company },
      { data: categories },
      { data: products },
      { data: productGroupLinks },
      { data: productGroups },
      { data: groupExtras },
      { data: extras },
    ] = await Promise.all([
      supabase.from('companies')
        .select('fantasy_name, name, phone, whatsapp, description, logo_url, address, segment, brand_color, menu_pdf_cache')
        .eq('id', company_id).single(),
      supabase.from('categories').select('id, name, on_off, display_order')
        .eq('company_id', company_id).eq('on_off', true).order('display_order'),
      supabase.from('products')
        .select('id, name, description, price, promotional_price, category_id, on_off, tags')
        .eq('company_id', company_id).eq('on_off', true).order('name'),
      supabase.from('product_group_links' as any).select('product_id, group_id').eq('company_id', company_id),
      supabase.from('product_groups' as any).select('id, name, min_selection, max_selection, is_active').eq('company_id', company_id).eq('is_active', true),
      supabase.from('group_extras' as any).select('group_id, extra_id').eq('company_id', company_id),
      supabase.from('extras').select('id, name, price, on_off, description').eq('company_id', company_id).eq('on_off', true),
    ]);

    if (!company) return json({ error: 'Empresa não encontrada' }, 404);

    // Hash pra cache
    const menuSnapshot = JSON.stringify({
      cats: (categories || []).map((c: any) => ({ id: c.id, name: c.name, order: c.display_order })),
      prods: (products || []).map((p: any) => ({
        id: p.id, name: p.name, desc: p.description,
        price: p.price, promo: p.promotional_price, cat: p.category_id, tags: p.tags,
      })),
      groups: productGroups || [],
      links: productGroupLinks || [],
      extras: extras || [],
      groupExtras: groupExtras || [],
      brand: company.brand_color || company.segment,
      logo: company.logo_url,
    });
    const currentHash = await sha256Hex(menuSnapshot);

    const cache = (company.menu_pdf_cache || {}) as any;
    if (!force && cache.pdf_base64 && cache.menu_hash === currentHash) {
      return json({
        success: true,
        pdf_base64: cache.pdf_base64,
        mime_type: 'application/pdf',
        filename: `cardapio_${(company.fantasy_name || 'loja').toLowerCase().replace(/\s+/g, '_')}.pdf`,
        cached: true,
        generated_at: cache.generated_at,
        stats: { categories: (categories || []).length, products: (products || []).length },
      });
    }

    // Resolve cor brand + logo
    const [r, g, b] = resolveBrandColor(company);
    const [lr, lg, lb] = lighten([r, g, b], 0.93);
    const logo = company.logo_url ? await fetchLogoAsBase64(company.logo_url) : null;

    // Indexes auxiliares
    const groupsById = new Map<string, any>();
    (productGroups || []).forEach((g: any) => groupsById.set(g.id, g));
    const extrasById = new Map<string, any>();
    (extras || []).forEach((e: any) => extrasById.set(e.id, e));

    // group → extras[] map
    const groupExtrasMap = new Map<string, any[]>();
    (groupExtras || []).forEach((ge: any) => {
      const ex = extrasById.get(ge.extra_id);
      if (!ex) return;
      if (!groupExtrasMap.has(ge.group_id)) groupExtrasMap.set(ge.group_id, []);
      groupExtrasMap.get(ge.group_id)!.push(ex);
    });

    // product → groups[] map
    const productGroupsMap = new Map<string, any[]>();
    (productGroupLinks || []).forEach((pgl: any) => {
      const g = groupsById.get(pgl.group_id);
      if (!g) return;
      if (!productGroupsMap.has(pgl.product_id)) productGroupsMap.set(pgl.product_id, []);
      productGroupsMap.get(pgl.product_id)!.push(g);
    });

    // ── BUILD PDF ─────────────────────────────────────────────────────
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = 210;
    const pageH = 297;
    const marginX = 14;
    const innerW = pageW - marginX * 2;
    let y = 0;

    const storeName = company.fantasy_name || company.name || 'Cardápio';

    // ── HEADER: faixa colorida + logo + nome + contato ──────────────
    pdf.setFillColor(r, g, b);
    pdf.rect(0, 0, pageW, 38, 'F');

    let textStartX = marginX;
    // Logo (círculo branco com imagem dentro)
    if (logo) {
      try {
        pdf.setFillColor(255, 255, 255);
        pdf.circle(marginX + 11, 19, 12, 'F');
        pdf.addImage(logo.dataUri, logo.format, marginX + 1, 9, 20, 20, undefined, 'FAST');
        textStartX = marginX + 28;
      } catch (e) {
        console.warn('[logo addImage failed]', (e as any)?.message);
      }
    }

    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(20);
    pdf.text(storeName, textStartX, 17);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    const contactBits: string[] = [];
    if (company.whatsapp) contactBits.push(`WhatsApp: ${company.whatsapp}`);
    if (company.phone && company.phone !== company.whatsapp) contactBits.push(`Tel: ${company.phone}`);
    if (contactBits.length) pdf.text(contactBits.join('  •  '), textStartX, 24);

    if (company.description) {
      pdf.setFontSize(8);
      const descLines = pdf.splitTextToSize(String(company.description).slice(0, 120), pageW - textStartX - marginX);
      pdf.text(descLines.slice(0, 1), textStartX, 30);
    }

    // Faixa secundária "Cardápio"
    pdf.setFillColor(lr, lg, lb);
    pdf.rect(0, 38, pageW, 8, 'F');
    pdf.setTextColor(r, g, b);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.text('CARDÁPIO', pageW / 2, 43.5, { align: 'center' });

    y = 52;

    // ── CATEGORIAS + PRODUTOS ──────────────────────────────────────
    const cats = [...(categories || [])];
    const prods = products || [];

    // Fallback: produtos sem category_id → categoria virtual "Outros"
    const orphanProducts = prods.filter((p: any) => !p.category_id || !cats.find((c: any) => c.id === p.category_id));
    if (orphanProducts.length > 0) {
      cats.push({ id: '__orphans__', name: 'Outros' });
    }

    const newPageHeader = () => {
      pdf.addPage();
      pdf.setFillColor(r, g, b);
      pdf.rect(0, 0, pageW, 8, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.text(`${storeName.toUpperCase()} — CARDÁPIO`, marginX, 5.5);
      y = 14;
    };

    for (const cat of cats) {
      const items = cat.id === '__orphans__'
        ? orphanProducts
        : prods.filter((p: any) => p.category_id === cat.id);
      if (items.length === 0) continue;

      // Page break check pra título de categoria
      if (y > pageH - 40) newPageHeader();

      // Título categoria (faixa colorida com texto branco)
      pdf.setFillColor(r, g, b);
      pdf.rect(marginX, y - 4, innerW, 9, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.text(String(cat.name).toUpperCase(), marginX + 3, y + 2);
      y += 10;

      // Items
      for (const item of items) {
        const hasPromo = item.promotional_price && item.promotional_price < item.price;
        const priceFinal = hasPromo ? item.promotional_price : item.price;
        const priceLabel = formatMoney(priceFinal);

        // Pré-computa altura necessária do bloco (nome + desc + extras)
        const descLines = item.description ? pdf.splitTextToSize(String(item.description).slice(0, 180), innerW - 30) : [];
        const groupsForProduct = productGroupsMap.get(item.id) || [];
        const tagsCount = (item.tags && Array.isArray(item.tags) && item.tags.length > 0) ? 1 : 0;
        let extrasLinesEstimate = 0;
        for (const grp of groupsForProduct) {
          extrasLinesEstimate += 1; // grupo header
          const groupExtrasList = groupExtrasMap.get(grp.id) || [];
          extrasLinesEstimate += Math.ceil(groupExtrasList.length / 2); // 2 extras por linha aprox
        }
        const estimatedHeight = 6 + (descLines.length * 3.5) + (tagsCount * 4) + (extrasLinesEstimate * 4) + 6;
        if (y + estimatedHeight > pageH - 18) newPageHeader();

        // Linha 1: nome + preço (com leader)
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(30, 30, 30);
        pdf.setFontSize(11);
        pdf.text(item.name, marginX, y);

        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(r, g, b);
        pdf.setFontSize(11);
        pdf.text(priceLabel, pageW - marginX, y, { align: 'right' });

        // Promo: preço antigo tachado pequeno
        if (hasPromo) {
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(7);
          pdf.setTextColor(150, 150, 150);
          const originalLabel = formatMoney(item.price);
          pdf.text(`de ${originalLabel}`, pageW - marginX, y + 3.5, { align: 'right' });
        }
        y += 5;

        // Descrição
        if (descLines.length > 0) {
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8.5);
          pdf.setTextColor(100, 100, 100);
          for (const line of descLines.slice(0, 3)) {
            pdf.text(line, marginX, y);
            y += 3.5;
          }
        }

        // Tags
        if (item.tags && Array.isArray(item.tags) && item.tags.length > 0) {
          pdf.setFontSize(7);
          pdf.setTextColor(r, g, b);
          const tagsLabel = item.tags.slice(0, 5).map((t: string) => `#${t}`).join('  ');
          pdf.text(tagsLabel, marginX, y);
          y += 3.5;
        }

        // Grupos de extras / complementos / adicionais
        if (groupsForProduct.length > 0) {
          for (const grp of groupsForProduct) {
            const groupExtrasList = groupExtrasMap.get(grp.id) || [];
            if (groupExtrasList.length === 0) continue;

            if (y > pageH - 25) newPageHeader();

            // Header do grupo (fundo cinza claro)
            pdf.setFillColor(245, 245, 245);
            pdf.rect(marginX + 3, y - 2.5, innerW - 3, 5, 'F');
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(8);
            pdf.setTextColor(60, 60, 60);
            const minMax = grp.max_selection
              ? (grp.min_selection > 0 ? `(obrigatório, escolha ${grp.min_selection}-${grp.max_selection})` : `(opcional, até ${grp.max_selection})`)
              : (grp.min_selection > 0 ? `(obrigatório)` : `(opcional)`);
            pdf.text(`▸ ${grp.name} ${minMax}`, marginX + 4, y + 0.8);
            y += 5;

            // Listar extras em 2 colunas
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(8);
            pdf.setTextColor(80, 80, 80);
            const colW = innerW / 2;
            for (let i = 0; i < groupExtrasList.length; i += 2) {
              if (y > pageH - 15) newPageHeader();
              const left = groupExtrasList[i];
              const right = groupExtrasList[i + 1];
              const leftPrice = left.price > 0 ? `  +${formatMoney(left.price)}` : '';
              pdf.text(`• ${left.name}${leftPrice}`, marginX + 6, y);
              if (right) {
                const rightPrice = right.price > 0 ? `  +${formatMoney(right.price)}` : '';
                pdf.text(`• ${right.name}${rightPrice}`, marginX + 6 + colW, y);
              }
              y += 3.5;
            }
            y += 1;
          }
        }

        // Separador entre items
        pdf.setDrawColor(230, 230, 230);
        pdf.setLineWidth(0.2);
        pdf.line(marginX, y + 1, pageW - marginX, y + 1);
        y += 4;
      }

      y += 4;
    }

    // ── FOOTER última página ────────────────────────────────────
    const totalPages = pdf.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      pdf.setPage(p);
      pdf.setFontSize(7);
      pdf.setTextColor(150, 150, 150);
      pdf.text(`${p} / ${totalPages}`, pageW - marginX, pageH - 5, { align: 'right' });
      pdf.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`, marginX, pageH - 5);
    }

    // Output
    const pdfBase64 = pdf.output('datauristring').split(',')[1];
    const generatedAt = new Date().toISOString();

    await supabase.from('companies').update({
      menu_pdf_cache: { pdf_base64: pdfBase64, menu_hash: currentHash, generated_at: generatedAt }
    }).eq('id', company_id);

    return json({
      success: true,
      pdf_base64: pdfBase64,
      mime_type: 'application/pdf',
      filename: `cardapio_${storeName.toLowerCase().replace(/\s+/g, '_')}.pdf`,
      cached: false,
      generated_at: generatedAt,
      stats: {
        categories: cats.length,
        products: prods.length,
        groups: (productGroups || []).length,
        extras: (extras || []).length,
      },
    });
  } catch (e: any) {
    console.error('[generate-menu-document]', e);
    return json({ error: e?.message || 'Erro interno', stack: e?.stack?.slice(0, 500) }, 500);
  }
});
