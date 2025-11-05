/**
 * THERMAL FORMATTER - SINGLE SOURCE OF TRUTH
 * Este módulo é o ÚNICO responsável por formatar texto para cupom térmico
 * Preview e impressão CONSOMEM a saída deste módulo
 */

import { formatCurrency } from './currency-formatter';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ExtendedLayoutConfig, UnifiedPrintElement, FormattedLine } from '@/types/printer-layout-extended';

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
  
  for (const element of visibleElements) {
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
      items.forEach((item: any) => {
        const itemText = `${item.quantity}x ${item.name}`;
        const itemPrice = formatCurrency(item.price * item.quantity);
        lines.push({
          text: margin + itemWithPrice(itemText, itemPrice, effectiveWidth),
          formatting: {
            bold: element.formatting?.bold,
            fontSize: element.fontSize,
            align: 'left'
          }
        });
        
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
        
        // Observações com indentação de 2 espaços
        if (item.observations) {
          const obsLines = wrapText(`  Obs: ${item.observations}`, effectiveWidth);
          obsLines.forEach(line => lines.push({
            text: margin + line,
            formatting: { fontSize: 'small', align: 'left' }
          }));
        }
        
        // Espaçamento após cada item
        for (let i = 0; i < spacingLines; i++) {
          lines.push({ text: margin });
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
    
    // Obter conteúdo do elemento
    let content = getElementContent(element, order, config, companyData);
    if (!content) continue;
    
    // Elementos com preço justificado (usar :: como separador)
    if (element.tag === '{subtotal}' || 
        element.tag === '{taxa_entrega}' || 
        element.tag === '{total}') {
      if (content.includes('::')) {
        const [label, price] = content.split('::');
        content = itemWithPrice(label, price, effectiveWidth);
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
    // Para center e right, deixar o CSS fazer o alinhamento
    // Apenas padding left precisa ser aplicado aqui
    const formatted = align === 'left' ? padRight(content, effectiveWidth) : content.trim();
    
    // Para sublinhado, aplicar apenas no conteúdo, não nos espaços
    let finalText = margin + formatted;
    let shouldUnderline = false;
    
    if (element.formatting?.underline) {
      // Remover underline da formatação da linha
      // e aplicar apenas no conteúdo via marcador especial
      shouldUnderline = false; // Não aplicar underline em toda linha
      // TODO: Implementar underline seletivo se necessário
    }
    
    lines.push({
      text: finalText,
      formatting: {
        bold: element.formatting?.bold,
        underline: shouldUnderline, // Desabilitar underline de linha inteira
        fontSize: element.fontSize,
        align: element.formatting?.align
      }
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
  }
  
  // Adicionar linhas extras antes do corte (extra_feed_lines)
  const extraFeed = config.extra_feed_lines || 3;
  for (let i = 0; i < extraFeed; i++) {
    lines.push({ text: margin });
  }
  
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
    case '{endereco_empresa}':
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
    case '{email_empresa}':
      content = companyData?.email ? `Email: ${companyData.email}` : '';
      break;
    case '{cnpj}':
      const cnpj = companyData?.cnpj || order.company_cnpj;
      console.log('🔍 CNPJ debug:', { 
        fromCompanyData: companyData?.cnpj, 
        fromOrder: order.company_cnpj,
        final: cnpj 
      });
      content = cnpj ? `CNPJ: ${cnpj}` : '';
      break;
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
    case '{subtotal}':
      const subtotal = order.total - (order.delivery_fee || 0);
      content = `Subtotal::${formatCurrency(subtotal)}`;
      break;
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
