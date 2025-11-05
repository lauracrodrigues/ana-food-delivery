/**
 * THERMAL FORMATTER - SINGLE SOURCE OF TRUTH
 * Este módulo é o ÚNICO responsável por formatar texto para cupom térmico
 * Preview e impressão CONSOMEM a saída deste módulo
 */

import { formatCurrency } from './currency-formatter';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ExtendedLayoutConfig, UnifiedPrintElement } from '@/types/printer-layout-extended';

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
// FORMATADOR PRINCIPAL (retorna string[] puro)
// =====================================================

export function formatReceipt(
  order: any,
  config: ExtendedLayoutConfig,
  companyData?: any
): string[] {
  const charsPorLinha = config.chars_per_line || 48;
  const lines: string[] = [];
  
  // Elementos visíveis e ordenados
  const visibleElements = (config.elements || [])
    .filter(el => el.visible)
    .sort((a, b) => a.order - b.order);
  
  for (const element of visibleElements) {
    // SPECIAL CASE: {itens}
    if (element.tag === '{itens}') {
      lines.push('ITENS:');
      lines.push(''); // linha em branco
      
      const items = order.items || [];
      items.forEach((item: any) => {
        const itemText = `${item.quantity}x ${item.name}`;
        const itemPrice = formatCurrency(item.price * item.quantity);
        lines.push(itemWithPrice(itemText, itemPrice, charsPorLinha));
        
        // Extras com indentação de 2 espaços
        if (item.extras && item.extras.length > 0) {
          item.extras.forEach((extra: any) => {
            const extraName = typeof extra === 'string' ? extra : extra.name;
            lines.push(`  + ${extraName}`);
          });
        }
        
        // Observações com indentação de 2 espaços
        if (item.observations) {
          const obsLines = wrapText(`  Obs: ${item.observations}`, charsPorLinha);
          lines.push(...obsLines);
        }
        
        lines.push(''); // linha em branco após cada item
      });
      
      // Separator
      if (element.separator_below?.show) {
        const char = element.separator_below.char || '-';
        lines.push(divider(char, charsPorLinha));
      }
      
      continue;
    }
    
    // Obter conteúdo do elemento
    const content = getElementContent(element, order, config, companyData);
    if (!content) continue;
    
    // Apply alignment
    const align = element.formatting?.align || 'left';
    
    // Se é endereço, fazer wrap
    if (element.tag === '{endereco_empresa}' || element.tag === '{endereco_cliente}') {
      const wrappedLines = wrapText(content, charsPorLinha);
      wrappedLines.forEach(line => {
        const formatted = align === 'center' ? padCenter(line, charsPorLinha) :
                         align === 'right' ? padLeft(line, charsPorLinha) :
                         padRight(line, charsPorLinha);
        lines.push(formatted);
      });
      
      // Separator
      if (element.separator_below?.show) {
        const char = element.separator_below.char || '-';
        lines.push(divider(char, charsPorLinha));
      }
      
      continue;
    }
    
    // Elementos normais (uma linha)
    const formatted = align === 'center' ? padCenter(content, charsPorLinha) :
                     align === 'right' ? padLeft(content, charsPorLinha) :
                     padRight(content, charsPorLinha);
    
    lines.push(formatted);
    
    // Separator
    if (element.separator_below?.show) {
      const char = element.separator_below.char || '-';
      lines.push(divider(char, charsPorLinha));
    }
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
      content = formatAddress(companyData?.address) || order.company_address || '';
      break;
    case '{email_empresa}':
      content = companyData?.email ? `Email: ${companyData.email}` : '';
      break;
    case '{cnpj}':
      content = companyData?.cnpj ? `CNPJ: ${companyData.cnpj}` : '';
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
      content = order.type === 'delivery' ? '🛵 ENTREGA' : '🏪 RETIRADA';
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
      content = `Subtotal: ${formatCurrency(subtotal)}`;
      break;
    case '{taxa_entrega}':
      content = order.delivery_fee > 0 ? `Taxa Entrega: ${formatCurrency(order.delivery_fee)}` : '';
      break;
    case '{total}':
      content = `TOTAL: ${formatCurrency(order.total)}`;
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

// Helper para formatar endereço
function formatAddress(addr: any): string {
  if (!addr) return '';
  if (typeof addr === 'string') return addr;
  
  if (typeof addr === 'object' && addr !== null) {
    const parts = [
      addr.street && addr.number ? `${addr.street}, ${addr.number}` : addr.street,
      addr.complement,
      addr.neighborhood,
      addr.city && addr.state ? `${addr.city} - ${addr.state}` : addr.city,
      addr.zip_code ? `CEP: ${addr.zip_code}` : null
    ].filter(Boolean);
    
    return parts.join(', ');
  }
  
  return '';
}
