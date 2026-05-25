/**
 * THERMAL FORMATTER - SINGLE SOURCE OF TRUTH
 * v1.2.0 — Melhorias inspiradas em players food service (iFood, Goomer, etc):
 *   - Número pedido GIGANTE centralizado com label
 *   - Tipo entrega em reverse video (INV marker) 2X
 *   - Observações com separadores pontilhados e prefixo ">> OBS:"
 *   - TOTAL forçado 2X bold direita
 *   - Separador pontilhado entre itens (não linha cheia)
 *   - Tags novas: {eta_pronto}, {qr_rastreio}
 *   - Beep antes do corte (agente acrescenta no rodapé)
 * Preview e impressão CONSOMEM a saída deste módulo
 */

import { formatCurrency } from './currency-formatter';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ExtendedLayoutConfig, UnifiedPrintElement, FormattedLine, FontSize, TextAlign, PrintTag } from '@/types/printer-layout-extended';

// =====================================================
// v1.2.0 — OVERRIDES SEMÂNTICOS POR TAG
// Tags onde Anafood força formatação ideal (concorrentes food service)
// User customization NESSAS TAGS é override em cima — esses são defaults
// =====================================================
type SemanticOverride = {
  fontSize?: FontSize;
  align?: TextAlign;
  bold?: boolean;
  inverse?: boolean;  // reverse video (ESC GS B 1) — agente processa {{INV}}/{{/INV}}
};

const SEMANTIC_OVERRIDES: Partial<Record<PrintTag, SemanticOverride>> = {
  '{numero_pedido}': { fontSize: 'xlarge', align: 'center', bold: true },
  '{tipo_entrega}':  { fontSize: 'xlarge', align: 'center', bold: true, inverse: true },
  '{total}':         { fontSize: 'xlarge', align: 'right',  bold: true },
};

// Separador pontilhado entre itens (vez de linha cheia)
// v1.2.1 — usa "." em vez de "·" (CP850 não tem U+00B7 — vira "?")
const ITEM_SEPARATOR = '. . . . . . . . . . . . . . . . . . . . . . . . ';

// =====================================================
// PRIMITIVAS DE PADDING
// =====================================================

export function padCenter(text: string, charsPorLinha: number): string {
  const t = text.trim();
  if (t.length >= charsPorLinha) return t.substring(0, charsPorLinha);
  
  const spacesLeft = Math.floor((charsPorLinha - t.length) / 2);
  const spacesRight = charsPorLinha - t.length - spacesLeft;
  return ' '.repeat(spacesLeft) + t + ' '.repeat(spacesRight);
}

export function padLeft(text: string, charsPorLinha: number): string {
  const t = text.trim();
  if (t.length >= charsPorLinha) return t.substring(0, charsPorLinha);
  
  const spacesLeft = charsPorLinha - t.length;
  return ' '.repeat(spacesLeft) + t;
}

export function padRight(text: string, charsPorLinha: number): string {
  const t = text.trim();
  if (t.length >= charsPorLinha) return t.substring(0, charsPorLinha);
  
  const spacesRight = charsPorLinha - t.length;
  return t + ' '.repeat(spacesRight);
}

export function divider(char: string, charsPorLinha: number): string {
  return char.repeat(charsPorLinha);
}

// =====================================================
// FORMATAÇÃO DE ITEM COM PREÇO (justificado)
// =====================================================

export function itemWithPrice(item: string, price: string, charsPorLinha: number): string {
  const preco = price.trim();
  const maxDescLength = charsPorLinha - preco.length - 2; // 2 espaços gap mínimo
  
  let desc = item.trim();
  if (desc.length > maxDescLength) {
    desc = desc.substring(0, maxDescLength - 3) + '...';
  }
  
  const spaces = charsPorLinha - desc.length - preco.length;
  return desc + ' '.repeat(Math.max(1, spaces)) + preco;
}

// =====================================================
// QUEBRA DE TEXTO EM PALAVRAS
// =====================================================

export function wrapText(text: string, charsPorLinha: number): string[] {
  if (text.length <= charsPorLinha) return [text];
  
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    
    if (testLine.length <= charsPorLinha) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word.length > charsPorLinha 
        ? word.substring(0, charsPorLinha) 
        : word;
    }
  }
  
  if (currentLine) lines.push(currentLine);
  return lines.length > 0 ? lines : [''];
}

// =====================================================
// HELPER: ESPAÇAMENTO ENTRE LINHAS
// =====================================================

function getLineSpacingCount(lineSpacing: string): number {
  switch (lineSpacing) {
    case 'compact': return 0;
    case 'normal': return 1;
    case 'relaxed': return 2;
    default: return 1;
  }
}

// =====================================================
// FORMATADOR PRINCIPAL (retorna FormattedLine[] com metadados)
// =====================================================

export function formatReceipt(
  order: any,
  config: ExtendedLayoutConfig,
  companyData?: any
): FormattedLine[] {
  console.log('🎨 thermal-formatter.formatReceipt chamado:', {
    order_number: order.order_number,
    customer_name: order.customer_name,
    items_count: order.items?.length,
    chars_per_line: config.chars_per_line,
    margin_left: config.margin_left,
    margin_right: config.margin_right,
  });
  
  const charsPorLinha = config.chars_per_line || 48;
  const marginLeft = config.margin_left || 0;
  const marginRight = config.margin_right || 0;
  const effectiveWidth = charsPorLinha - marginLeft - marginRight;
  
  console.log('📏 Dimensões calculadas:', {
    charsPorLinha,
    marginLeft,
    marginRight,
    effectiveWidth,
  });
  
  const lines: FormattedLine[] = [];
  
  // Elementos visíveis e ordenados
  const visibleElements = (config.elements || [])
    .filter(el => el.visible)
    .sort((a, b) => a.order - b.order);
  
  const margin = ' '.repeat(marginLeft);
  const spacingLines = getLineSpacingCount(config.line_spacing || 'normal');

  // v1.2.4 — Tags do "bloco financeiro" agrupadas sem espaçamento entre si
  // (cliente reclamou que subtotal/taxa/total/pagamento ficavam muito espalhados)
  const FINANCE_TAGS = new Set(['{subtotal}', '{taxa_entrega}', '{total}', '{forma_pagamento}']);

  // v1.2.5 — Tags do header empresa também agrupadas (nome/tel/end/cnpj/email/data)
  // Cliente: header estava com muito espaço entre as linhas
  const HEADER_TAGS = new Set([
    '{nome_empresa}', '{telefone_empresa}', '{endereco_empresa}',
    '{cnpj}', '{email_empresa}', '{data_hora}',
  ]);
  
  for (let idx = 0; idx < visibleElements.length; idx++) {
    const element = visibleElements[idx];
    // v1.2.4/5 — Próximo elemento (pra detectar blocos contíguos sem espaçamento)
    const nextEl = visibleElements[idx + 1];
    const isFinanceBlock = FINANCE_TAGS.has(element.tag) && nextEl && FINANCE_TAGS.has(nextEl.tag);
    const isHeaderBlock  = HEADER_TAGS.has(element.tag)  && nextEl && HEADER_TAGS.has(nextEl.tag);
    const isContiguous   = isFinanceBlock || isHeaderBlock;

    // v1.2.0 — Override semântico por tag (sobrepõe formatação do user pra tags críticas)
    const sem = SEMANTIC_OVERRIDES[element.tag as PrintTag];
    const finalFontSize = (sem?.fontSize ?? element.fontSize) as FontSize;
    const finalAlign    = (sem?.align    ?? element.formatting?.align ?? 'left') as TextAlign;
    const finalBold     = sem?.bold      ?? element.formatting?.bold ?? false;
    const wrapInverse   = sem?.inverse   ?? false;

    // SPECIAL CASE: {numero_pedido} — renderização "concorrente": label pequeno + número GIGANTE
    // v1.2.1 — Em 2X cada char ocupa 2x a largura → pad pra effectiveWidth/2 (senão quebra linha)
    if (element.tag === '{numero_pedido}') {
      const rawNum = order.order_number ?? order.number ?? order.id?.toString().substring(0, 6);
      const num = rawNum ? String(rawNum) : 'S/N';
      lines.push({
        text: margin + padCenter('PEDIDO', effectiveWidth),
        formatting: { fontSize: 'small', align: 'center' },
      });
      lines.push({
        text: margin + padCenter(`#${num}`, Math.floor(effectiveWidth / 2)),
        formatting: { fontSize: 'xlarge', bold: true, align: 'center' },
      });
      for (let i = 0; i < spacingLines; i++) lines.push({ text: margin });
      continue;
    }

    // SPECIAL CASE: {tipo_entrega} — bloco invertido (reverse video) centralizado 2X
    // v1.2.1 — Sem emojis (CP850 não tem 🛵🥡 — vira ?? na impressora). Pad pra /2 em 2X.
    if (element.tag === '{tipo_entrega}') {
      const isDelivery = order.type === 'delivery';
      const label = isDelivery ? '** DELIVERY **' : '** RETIRADA **';
      const padded = padCenter(label, Math.floor(effectiveWidth / 2));
      lines.push({
        text: margin + `{{INV}}${padded}{{/INV}}`,
        formatting: { fontSize: 'xlarge', bold: true, align: 'center' },
      });
      for (let i = 0; i < spacingLines; i++) lines.push({ text: margin });
      continue;
    }

    // SPECIAL CASE: {itens}
    if (element.tag === '{itens}') {
      lines.push({
        text: margin + 'ITENS:',
        formatting: {
          bold: element.formatting?.bold,
          underline: element.formatting?.underline,
          fontSize: element.fontSize,
          align: element.formatting?.align
        }
      });

      // Espaçamento após título
      for (let i = 0; i < spacingLines; i++) {
        lines.push({ text: margin });
      }

      const items = order.items || [];
      items.forEach((item: any, idx: number) => {
        const qty = item.quantity || 1;
        const unitPrice = Number(item.price) || 0;
        const total = unitPrice * qty;
        const itemText = `${qty}x ${item.name}`;
        const itemPrice = formatCurrency(total);
        // Linha 1: "2x Nome do produto                    R$ 44,00"
        lines.push({
          text: margin + itemWithPrice(itemText, itemPrice, effectiveWidth),
          formatting: {
            bold: true,                        // v1.2.0 — nome do item sempre bold
            fontSize: element.fontSize,
            align: 'left'
          }
        });
        // v1.2.7 — Linha 2: "  (R\$ 22,00 cada)" só se qty > 1 (evita poluir item único)
        if (qty > 1) {
          lines.push({
            text: margin + `  (${formatCurrency(unitPrice)} cada)`,
            formatting: { fontSize: 'small', align: 'left' },
          });
        }

        // Extras com indentação de 2 espaços
        if (item.extras && item.extras.length > 0) {
          item.extras.forEach((extra: any) => {
            const extraName = typeof extra === 'string' ? extra : extra.name;
            lines.push({
              text: margin + `  + ${extraName}`,
              formatting: { fontSize: 'small', align: 'left' }
            });
          });
        }

        // Observações com indentação + prefixo ">> OBS:" bold (v1.2.0)
        if (item.observations) {
          const obsLines = wrapText(`>> OBS: ${item.observations}`, effectiveWidth - 2);
          obsLines.forEach((line, i) => lines.push({
            text: margin + '  ' + line,
            formatting: {
              fontSize: 'medium',
              bold: i === 0,                   // só 1ª linha em bold pra destacar prefixo
              align: 'left',
            },
          }));
        }

        // v1.2.0 — Separador pontilhado entre items (não linha cheia, mais clean)
        if (idx < items.length - 1) {
          lines.push({
            text: margin + ITEM_SEPARATOR.substring(0, effectiveWidth),
            formatting: { fontSize: 'small', align: 'left' },
          });
        }
      });

      // Separator
      if (element.separator_below?.show) {
        const char = element.separator_below.char || '-';
        lines.push({ text: margin + divider(char, effectiveWidth) });
      }

      // Espaçamento após separador
      for (let i = 0; i < spacingLines; i++) {
        lines.push({ text: margin });
      }

      continue;
    }

    // SPECIAL CASE: {observacoes_pedido} — bloco destacado com separadores
    if (element.tag === '{observacoes_pedido}' && order.observations) {
      const obsDots = ITEM_SEPARATOR.substring(0, effectiveWidth);
      lines.push({ text: margin + obsDots, formatting: { fontSize: 'small', align: 'left' } });
      const obsLines = wrapText(`>> OBS DO PEDIDO: ${order.observations}`, effectiveWidth);
      obsLines.forEach((line, i) => lines.push({
        text: margin + line,
        formatting: {
          fontSize: 'medium',
          bold: i === 0,
          align: 'left',
        },
      }));
      lines.push({ text: margin + obsDots, formatting: { fontSize: 'small', align: 'left' } });
      for (let i = 0; i < spacingLines; i++) lines.push({ text: margin });
      continue;
    }
    
    // Obter conteúdo do elemento
    let content = getElementContent(element, order, config, companyData);
    if (!content) continue;
    
    // Elementos com preço justificado (usar :: como separador)
    // v1.2.6 — Total tem override semântico xlarge (2X) → chars ocupam 2x largura
    //           Pad com effectiveWidth/2 senão linha quebra na impressora
    if (element.tag === '{subtotal}' ||
        element.tag === '{taxa_entrega}' ||
        element.tag === '{total}') {
      if (content.includes('::')) {
        const [label, price] = content.split('::');
        const widthForLine = finalFontSize === 'xlarge'
          ? Math.floor(effectiveWidth / 2)
          : effectiveWidth;
        content = itemWithPrice(label, price, widthForLine);
      }
    }
    
    // Apply alignment
    const align = element.formatting?.align || 'left';
    
    // Se é endereço ou observações, fazer wrap
    if (element.tag === '{endereco_empresa}' || 
        element.tag === '{endereco_cliente}' || 
        element.tag === '{observacoes_pedido}') {
      const wrappedLines = wrapText(content, effectiveWidth);
      wrappedLines.forEach(line => {
        const formatted = align === 'center' ? padCenter(line, effectiveWidth) :
                         align === 'right' ? padLeft(line, effectiveWidth) :
                         padRight(line, effectiveWidth);
        lines.push({
          text: margin + formatted,
          formatting: {
            bold: element.formatting?.bold,
            underline: element.formatting?.underline,
            fontSize: element.fontSize,
            align: element.formatting?.align
          }
        });
      });
      
      // Separator
      if (element.separator_below?.show) {
        const char = element.separator_below.char || '-';
        lines.push({ text: margin + divider(char, effectiveWidth) });
      }
      
      // Espaçamento após elemento
      for (let i = 0; i < spacingLines; i++) {
        lines.push({ text: margin });
      }
      
      continue;
    }
    
    // Elementos normais (uma linha)
    // v1.2.0 — usa finalAlign/finalFontSize/finalBold do override semântico
    const formatted = finalAlign === 'left' ? padRight(content, effectiveWidth) : content.trim();
    const wrappedText = wrapInverse ? `{{INV}}${formatted}{{/INV}}` : formatted;

    lines.push({
      text: margin + wrappedText,
      formatting: {
        bold: finalBold,
        underline: element.formatting?.underline || false,
        fontSize: finalFontSize,
        align: finalAlign,
      }
    });
    
    // Separator
    if (element.separator_below?.show) {
      const char = element.separator_below.char || '-';
      lines.push({ text: margin + divider(char, effectiveWidth) });
    }

    // v1.2.4/5 — Skip espaçamento dentro de blocos contíguos (header ou financeiro)
    if (!isContiguous) {
      for (let i = 0; i < spacingLines; i++) {
        lines.push({ text: margin });
      }
    }
  }
  
  // Adicionar linhas extras antes do corte (extra_feed_lines)
  const extraFeed = config.extra_feed_lines || 3;
  for (let i = 0; i < extraFeed; i++) {
    lines.push({ text: margin });
  }

  // v1.2.0 — Beep antes do corte chama atenção quando recibo sai (concorrentes fazem)
  // Marker {{BEEP}} é processado pelo agente; se impressora não suporta, ignora silencioso
  lines.push({ text: '{{BEEP}}' });

  return lines;
}

// =====================================================
// HELPER: GET ELEMENT CONTENT
// =====================================================

function getElementContent(
  element: UnifiedPrintElement,
  order: any,
  config: ExtendedLayoutConfig,
  companyData?: any
): string {
  let content = '';
  
  switch (element.tag) {
    case '{nome_empresa}':
      content = companyData?.fantasy_name || companyData?.name || order.company_name || '';
      break;
    case '{telefone_empresa}':
      content = `Tel: ${companyData?.phone || order.company_phone || ''}`;
      break;
    case '{endereco_empresa}': {
      const companyAddr = companyData?.address || order.company_address;
      if (!companyAddr) {
        content = '';
      } else if (typeof companyAddr === 'string') {
        content = companyAddr;
      } else if (typeof companyAddr === 'object' && companyAddr !== null) {
        content = formatAddress(companyAddr);
      } else {
        content = '';
      }
      break;
    }
    case '{email_empresa}':
      content = companyData?.email ? `Email: ${companyData.email}` : '';
      break;
    case '{cnpj}': {
      const cnpj = companyData?.cnpj || order.company_cnpj;
      content = cnpj ? `CNPJ: ${cnpj}` : '';
      break;
    }
    case '{numero_pedido}':
      content = `Pedido #${order.order_number || '000'}`;
      break;
    case '{data_hora}':
      content = order.created_at 
        ? format(new Date(order.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })
        : '';
      break;
    case '{origem_pedido}':
      content = order.source === 'whatsapp' ? 'Origem: WhatsApp' : 'Origem: Cardápio Digital';
      break;
    case '{tipo_entrega}':
      content = order.type === 'delivery' ? 'ENTREGA' : 'RETIRADA';
      break;
    case '{nome_cliente}':
      content = `Cliente: ${order.customer_name || ''}`;
      break;
    case '{telefone_cliente}':
      content = `Tel: ${order.customer_phone || ''}`;
      break;
    case '{endereco_cliente}':
      content = order.type === 'delivery' ? `End: ${order.address || ''}` : '';
      break;
    case '{referencia}':
      content = order.referencia ? `Ref: ${order.referencia}` : '';
      break;
    case '{observacoes_pedido}':
      content = order.observations || '';
      break;
    case '{subtotal}': {
      const subtotal = order.total - (order.delivery_fee || 0);
      content = `Subtotal::${formatCurrency(subtotal)}`;
      break;
    }
    case '{taxa_entrega}':
      content = order.delivery_fee > 0 ? `Taxa Entrega::${formatCurrency(order.delivery_fee)}` : '';
      break;
    case '{total}':
      content = `TOTAL::${formatCurrency(order.total)}`;
      break;
    case '{forma_pagamento}':
      content = `Pagamento: ${order.payment_method || ''}`;
      break;
    case '{mensagem_rodape}':
      content = config.footer_message || 'Obrigado pela preferência!';
      break;
    case '{qr_pickup}': {
      // v1.2.3 — qr_size do element (3-10, default 6)
      const size = element.qr_size ?? 6;
      content = order.pickup_qr_token ? `{{QR:${order.pickup_qr_token}:${size}}}` : '';
      break;
    }
    case '{eta_pronto}': {
      // v1.2.0 — Previsão de pronto: created_at + delivery_time (min)
      const dt = order.delivery_time_minutes ?? order.estimated_minutes ?? 30;
      if (order.created_at) {
        const eta = new Date(new Date(order.created_at).getTime() + dt * 60_000);
        content = `Pronto até: ${format(eta, 'HH:mm', { locale: ptBR })}`;
      } else {
        content = '';
      }
      break;
    }
    case '{qr_rastreio}': {
      // v1.2.3 — QR pra cliente acompanhar pedido (anafood.vip/p/{idCurto}) + qr_size configurável
      const shortId = String(order.id || '').replace(/-/g, '').substring(0, 8).toUpperCase();
      const url = shortId ? `anafood.vip/p/${shortId}` : '';
      const size = element.qr_size ?? 6;
      content = url ? `{{QR:${url}:${size}}}` : '';
      break;
    }
    default:
      content = '';
  }
  
  // Apply prefix/suffix
  const prefix = element.prefix || '';
  const suffix = element.suffix || '';
  
  return prefix + content + suffix;
}

// Helper para formatar endereço (mapeia campos do DB em português)
function formatAddress(addr: any): string {
  if (!addr) return '';
  if (typeof addr === 'string') return addr;
  
  if (typeof addr === 'object' && addr !== null) {
    // Mapear campos do DB (português): logradouro, numero, bairro, cidade, estado, cep
    const parts = [
      addr.logradouro && addr.numero ? `${addr.logradouro}, ${addr.numero}` : addr.logradouro,
      addr.complemento,
      addr.bairro,
      addr.cidade && addr.estado ? `${addr.cidade} - ${addr.estado}` : addr.cidade,
      addr.cep ? `CEP: ${addr.cep}` : null
    ].filter(Boolean);
    
    return parts.length > 0 ? parts.join(', ') : '';
  }
  
  return '';
}
