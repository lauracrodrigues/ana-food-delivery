// QZ Tray integration for printing
import type { LayoutConfig, PrintSector, TextFormatting } from '@/types/printer-layout';
import type { ExtendedLayoutConfig, UnifiedPrintElement } from '@/types/printer-layout-extended';
import { FONT_SIZE_COMMANDS, LINE_SPACING_VALUES, TEXT_FORMATTING_COMMANDS, PAPER_WIDTHS, DEFAULT_LAYOUT_CONFIG } from '@/types/printer-layout';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency, formatCurrencyValue } from './currency-formatter';
import { formatReceipt } from './thermal-formatter';

declare global {
  interface Window {
    qz: any;
  }
}

console.log('📦 qz-tray.ts carregado');

// Helper function to check if QZ Tray is available
const isQZAvailable = (): boolean => {
  const available = typeof window !== 'undefined' && typeof window.qz !== 'undefined';
  console.log('🔍 Verificando disponibilidade do QZ Tray:', available);
  if (!available) {
    console.warn('⚠️ window.qz não está definido. Certifique-se de que:');
    console.warn('1. O script qz-tray.js está carregado no index.html');
    console.warn('2. O QZ Tray está instalado e rodando no Windows');
    console.warn('3. A página foi recarregada após abrir o QZ Tray');
  }
  return available;
};

export class QZTrayPrinter {
  private static instance: QZTrayPrinter;
  private certificate: string | null = null;
  private privateKey: string | null = null;

  private constructor() {}

  public static getInstance(): QZTrayPrinter {
    if (!QZTrayPrinter.instance) {
      QZTrayPrinter.instance = new QZTrayPrinter();
    }
    return QZTrayPrinter.instance;
  }

  // Initialize QZ Tray connection
  async connect(): Promise<boolean> {
    if (!isQZAvailable()) {
      const error = 'QZ Tray não foi carregado. Verifique se:\n1. O QZ Tray está instalado no Windows\n2. O aplicativo QZ Tray está em execução\n3. Reinicie a página após abrir o QZ Tray';
      console.error('❌', error);
      throw new Error(error);
    }

    try {
      // Check if already connected
      if (window.qz.websocket && window.qz.websocket.isActive()) {
        return true;
      }

      // Configure certificate promise - load from public folder
      window.qz.security.setCertificatePromise(function(resolve: any, reject: any) {
        fetch("/override.crt")
          .then(res => {
            if (!res.ok) {
              throw new Error(`Erro ao carregar certificado: ${res.statusText}`);
            }
            return res.text();
          })
          .then((cert) => {
            console.log('✅ Certificado carregado com sucesso');
            resolve(cert);
          })
          .catch((err) => {
            console.error('❌ Erro ao carregar certificado override.crt:', err);
            reject(err);
          });
      });

      // Configure signature promise - call edge function to sign with private key
      window.qz.security.setSignaturePromise(function(toSign: string) {
        return function(resolve: any, reject: any) {
          fetch('https://jgdyklzrxygvwuhlnbat.supabase.co/functions/v1/qz-sign', {
            method: 'POST',
            headers: {
              'Content-Type': 'text/plain',
            },
            body: toSign,
          })
          .then(res => {
            if (!res.ok) {
              throw new Error(`Erro ao assinar: ${res.statusText}`);
            }
            return res.text();
          })
          .then((signature) => {
            console.log('✅ Dados assinados com sucesso');
            resolve(signature);
          })
          .catch((err) => {
            console.error('❌ Erro ao assinar dados:', err);
            reject(err);
          });
        };
      });

      // Connect to QZ Tray
      console.log('🔌 Conectando ao QZ Tray...');
      await window.qz.websocket.connect({ retries: 3, delay: 1 });
      console.log('✅ Conectado ao QZ Tray com sucesso');
      return true;
    } catch (error: any) {
      const errorMessage = error?.message || 'Erro desconhecido';
      console.error('❌ Erro na conexão com QZ Tray:', errorMessage);
      throw new Error(`Falha na conexão: ${errorMessage}\n\nVerifique se o QZ Tray está rodando no Windows.`);
    }
  }

  // Get available printers
  async getPrinters(): Promise<string[]> {
    try {
      await this.connect();
      const printers = await window.qz.printers.find();
      return printers;
    } catch (error) {
      console.error("Erro ao buscar impressoras:", error);
      throw error;
    }
  }

  // Get default printer
  async getDefaultPrinter(): Promise<string> {
    try {
      await this.connect();
      const printer = await window.qz.printers.getDefault();
      return printer;
    } catch (error) {
      console.error("Erro ao buscar impressora padrão:", error);
      throw error;
    }
  }

  // Print order receipt
  async printOrder(order: any, printerName?: string, isReprint: boolean = false, sector: PrintSector = 'caixa', layoutConfig?: LayoutConfig | ExtendedLayoutConfig, copies: number = 1): Promise<void> {
    try {
      if (!order) {
        console.error('❌ Tentativa de imprimir pedido vazio/undefined');
        throw new Error('Dados do pedido não disponíveis para impressão');
      }
      
      console.log('📋 printOrder - Estrutura do pedido recebido:', {
        hasOrder: !!order,
        orderType: typeof order,
        orderNumber: order.order_number,
        orderNumberDisplay: order.order_number_display,
        customerName: order.customer_name,
        companyName: order.company_name,
        itemsCount: order.items?.length,
        allKeys: Object.keys(order)
      });
      
      await this.connect();

      // Use default printer if not specified
      const printer = printerName || await this.getDefaultPrinter();

      // Configure printer
      const config = window.qz.configs.create(printer);

      // Format receipt data
      const receipt = this.formatOrderReceipt(order, isReprint, layoutConfig);

      // Print with proper format for QZ Tray 2.x
      // QZ Tray handles encoding internally when we pass string data
      const data = [{
        type: 'raw',
        format: 'command',
        data: receipt
      }];
      
      // Print multiple copies
      for (let i = 0; i < copies; i++) {
        await window.qz.print(config, data);
        // Pequeno delay entre impressões para evitar problemas
        if (i < copies - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
    } catch (error: any) {
      console.error('Erro ao imprimir:', error);
      throw new Error(error?.message || 'Erro ao imprimir pedido');
    }
  }

  // Helper methods for formatting
  private getLayoutConfig(config?: LayoutConfig): LayoutConfig {
    return config || DEFAULT_LAYOUT_CONFIG;
  }

  // Quebrar texto em múltiplas linhas quando exceder maxChars
  private formatMultiLine(text: string, align: 'left' | 'center' | 'right', maxChars: number): string {
    if (text.length <= maxChars) {
      return this.formatLine(text, align, maxChars, false);
    }
    
    // Quebrar em palavras
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      
      if (testLine.length <= maxChars) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word.length > maxChars ? word.substring(0, maxChars) : word;
      }
    }
    
    if (currentLine) lines.push(currentLine);
    
    // Formatar cada linha com alinhamento
    return lines.map(line => this.formatLine(line, align, maxChars, false)).join('');
  }

  private formatLine(text: string, align: 'left' | 'center' | 'right', maxChars: number, useEscPosCommands: boolean = true, marginLeft: number = 0): string {
    const cleanText = text.substring(0, maxChars);
    const marginSpaces = ' '.repeat(marginLeft);
    
    // When using ESC/POS commands, don't add manual spacing
    // The printer will handle alignment via ESC/POS commands
    if (useEscPosCommands) {
      return marginSpaces + cleanText + '\n';
    }
    
    // Manual spacing (for preview or non-ESC/POS contexts)
    if (align === 'center') {
      const padding = Math.max(0, Math.floor((maxChars - cleanText.length) / 2));
      return marginSpaces + ' '.repeat(padding) + cleanText + '\n';
    } else if (align === 'right') {
      const padding = Math.max(0, maxChars - cleanText.length);
      return marginSpaces + ' '.repeat(padding) + cleanText + '\n';
    }
    
    return marginSpaces + cleanText + '\n';
  }

  private applyFontSize(size: string): string {
    return FONT_SIZE_COMMANDS[size as keyof typeof FONT_SIZE_COMMANDS] || FONT_SIZE_COMMANDS.normal;
  }

  private applyFormatting(formatting: TextFormatting): string {
    let commands = '';
    
    // Alignment
    commands += TEXT_FORMATTING_COMMANDS.align[formatting.align];
    
    // Bold
    if (formatting.bold) {
      commands += TEXT_FORMATTING_COMMANDS.bold.on;
    }
    
    // Underline
    if (formatting.underline) {
      commands += TEXT_FORMATTING_COMMANDS.underline.on;
    }
    
    return commands;
  }

  private resetFormatting(): string {
    return TEXT_FORMATTING_COMMANDS.bold.off + 
           TEXT_FORMATTING_COMMANDS.underline.off + 
           TEXT_FORMATTING_COMMANDS.align.left;
  }

  private addSpacing(spacing: string, lines: number = 1): string {
    const spaceCount = LINE_SPACING_VALUES[spacing as keyof typeof LINE_SPACING_VALUES] || LINE_SPACING_VALUES.normal;
    return '\n'.repeat(spaceCount * lines);
  }

  // Apply text mode (condensed/normal/expanded)
  private applyTextMode(mode: 'condensed' | 'normal' | 'expanded'): string {
    const ESC = '\x1B';
    switch (mode) {
      case 'condensed':
        return ESC + '\x21' + '\x01'; // Modo condensado
      case 'expanded':
        return ESC + '\x21' + '\x20'; // Modo expandido
      case 'normal':
      default:
        return ESC + '\x21' + '\x00'; // Modo normal
    }
  }

  // Sanitize text for thermal printer (remove emojis, MANTÉM acentos)
  private sanitizeForThermalPrint(text: string): string {
    const EMOJI_TO_TEXT: Record<string, string> = {
      '🛵': 'ENTREGA',
      '🏪': 'RETIRADA',
      '📱': '',
      '🍽️': '',
      '💰': '',
      '📝': 'Obs:',
      '✅': '',
      '⚠️': '',
    };
    
    let sanitized = text;
    // Substituir emojis conhecidos
    for (const [emoji, replacement] of Object.entries(EMOJI_TO_TEXT)) {
      sanitized = sanitized.replace(new RegExp(emoji, 'g'), replacement);
    }
    
    // Remover emojis restantes MAS MANTER ACENTOS
    sanitized = sanitized
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
      .replace(/[\u{2600}-\u{26FF}]/gu, '')
      .replace(/[\u{2700}-\u{27BF}]/gu, '');
    
    // IMPORTANTE: NÃO normalizar NFD para preservar acentos
    return sanitized;
  }

  // Helper para formatar endereço em linha única
  private formatAddressInline(addr: any): string {
    if (!addr) return '';
    if (typeof addr === 'string') {
      // Se já é string, remover quebras de linha e normalizar espaços
      return addr.replace(/[\n\r]+/g, ', ').replace(/\s+/g, ' ').trim();
    }
    
    if (typeof addr === 'object') {
      const parts = [
        addr.street && addr.number ? `${addr.street}, ${addr.number}` : addr.street,
        addr.complement,
        addr.neighborhood,
        addr.city && addr.state ? `${addr.city} - ${addr.state}` : addr.city,
        addr.zip_code ? `CEP: ${addr.zip_code}` : null
      ].filter(Boolean);
      // Juntar com vírgula E remover quebras
      return parts.join(', ').replace(/[\n\r]+/g, ', ').trim();
    }
    
    return '';
  }

  // Formatar linha com justificação (esquerda e direita)
  private formatJustifiedLine(leftText: string, rightText: string, maxChars: number): string {
    // Truncar textos se excederem largura
    const maxLeftLength = Math.max(1, maxChars - rightText.length - 1);
    const truncatedLeft = leftText.length > maxLeftLength 
      ? leftText.substring(0, maxLeftLength - 3) + '...' 
      : leftText;
    
    const spaces = Math.max(1, maxChars - truncatedLeft.length - rightText.length);
    return truncatedLeft + ' '.repeat(spaces) + rightText + '\n';
  }

  // Format order data for thermal printer (ESC/POS)
  private formatOrderReceipt(order: any, isReprint: boolean = false, layoutConfig?: LayoutConfig | ExtendedLayoutConfig): string {
    console.log('🔍 formatOrderReceipt - Usando thermal-formatter');
    
    if (!order) {
      throw new Error('Dados do pedido não disponíveis para formatação');
    }
    
    const config = layoutConfig || this.getLayoutConfig();
    const extConfig = config as ExtendedLayoutConfig;
    
    const ESC = '\x1B';
    const GS = '\x1D';
    
    let receipt = '';
    
    // Comandos de inicialização
    receipt += ESC + '@'; // Reset printer
    receipt += ESC + 't' + '\x10'; // Code page
    
    // Line spacing
    const lineSpacing = extConfig.line_spacing_multiplier || 1.0;
    const clampedSpacing = Math.max(0.5, Math.min(2.0, lineSpacing));
    const lineHeight = Math.round(24 * clampedSpacing);
    receipt += ESC + '3' + String.fromCharCode(lineHeight);
    
    // Text mode
    receipt += this.applyTextMode(extConfig.text_mode || 'normal');
    
    // USAR THERMAL FORMATTER (single source of truth)
    console.log('🖨️ qz-tray.formatOrderReceipt usando thermal-formatter:', {
      order_number: order.order_number,
      customer_name: order.customer_name,
      items_count: order.items?.length,
    });
    
    const lines = formatReceipt(order, extConfig, order.company_data);
    
    console.log('📄 Linhas geradas pelo thermal-formatter:', lines.length);
    
    // PROCESSAR LINHAS (adicionar apenas texto já formatado)
    for (const line of lines) {
      receipt += line + '\n';
    }
    
    // Via de reimpressão
    if (isReprint) {
      receipt += ESC + 'a' + '\x01'; // Center align
      receipt += '*** VIA REIMPRESSA ***\n';
      receipt += '\n\n'; // Linhas extras para reimpressão
    }
    
    // Corte parcial SEMPRE (padrão fixo)
    receipt += GS + 'V' + '\x01'; // Partial cut
    
    return receipt;
  }

  // =====================================================
  // MÉTODOS OBSOLETOS REMOVIDOS
  // =====================================================
  // getElementContent -> agora em thermal-formatter.ts
  // formatItems -> agora em thermal-formatter.ts  
  // formatTotals -> agora em thermal-formatter.ts
  // applyFontSizeFromElement -> não mais necessário
  // =====================================================

  // Apply font size (ainda usado por outros métodos legados)
  private applyFontSizeFromElement(fontSize: string): string {
    const sizeMap: Record<string, string> = {
      'small': 'normal',
      'medium': 'normal',
      'large': 'large',
      'xlarge': 'xlarge'
    };
    return this.applyFontSize(sizeMap[fontSize] || 'normal');
  }

  // MÉTODO REMOVIDO: formatItems agora está em thermal-formatter.ts

  // MÉTODO REMOVIDO: formatTotals agora está em thermal-formatter.ts

  // Old structure fallback
  private formatOrderReceiptOldStructure(order: any, config: LayoutConfig, maxChars: number, ESC: string, GS: string): string {
    console.log('🔍 formatOrderReceiptOldStructure - Validando order:', {
      hasOrder: !!order,
      orderType: typeof order,
      orderKeys: order ? Object.keys(order) : [],
      orderNumber: order?.order_number,
      orderNumberDisplay: order?.order_number_display
    });
    
    if (!order) {
      console.error('❌ ERRO CRÍTICO: Order está undefined em formatOrderReceiptOldStructure');
      throw new Error('Dados do pedido não disponíveis para impressão');
    }
    
    let receipt = '';
    
    // Cabeçalho (se configurado)
    if (config.show_company_logo) {
      receipt += this.applyFormatting(config.formatting.header);
      receipt += this.applyFontSize(config.font_sizes.header);
      receipt += this.formatLine('PEDIDO', config.formatting.header.align, maxChars);
      receipt += GS + '!' + '\x00'; // Reset size
      receipt += this.resetFormatting();
      receipt += this.addSpacing(config.line_spacing);
    }
    
    // Número do pedido - usar order_number ou order_number_display
    const orderNumber = order.order_number || order.order_number_display || 'S/N';
    receipt += this.applyFormatting(config.formatting.order_number);
    receipt += this.applyFontSize(config.font_sizes.order_number);
    receipt += this.formatLine(`#${orderNumber}`, config.formatting.order_number.align, maxChars);
    receipt += GS + '!' + '\x00'; // Reset size
    receipt += this.resetFormatting();
    receipt += this.addSpacing(config.line_spacing);
    
    // Tipo de pedido e origem
    receipt += ESC + 'a' + '\x00'; // Left align
    receipt += this.applyFontSize(config.font_sizes.header);
    receipt += this.formatLine(this.sanitizeForThermalPrint(`${order.type === 'delivery' ? 'ENTREGA' : 'RETIRADA'}`), 'left', maxChars);
    
    if (config.show_order_source && order.source) {
      receipt += this.formatLine(this.sanitizeForThermalPrint(`Origem: ${order.source === 'whatsapp' ? 'WhatsApp' : 'Cardapio Digital'}`), 'left', maxChars);
    }
    
    receipt += GS + '!' + '\x00';
    receipt += this.addSpacing(config.line_spacing);
    
    // Cliente (se configurado)
    if (config.show_customer_info) {
      receipt += this.applyFormatting(config.formatting.customer_info);
      receipt += this.applyFontSize(config.font_sizes.item_details);
      receipt += this.formatLine('CLIENTE:', config.formatting.customer_info.align, maxChars);
      receipt += this.formatLine(this.sanitizeForThermalPrint(order.customer_name), config.formatting.customer_info.align, maxChars);
      receipt += this.formatLine(this.sanitizeForThermalPrint(`Tel: ${order.customer_phone}`), config.formatting.customer_info.align, maxChars);
      
      if (config.show_customer_address && order.type === 'delivery' && order.address) {
        receipt += this.formatLine(this.sanitizeForThermalPrint(`Endereco: ${order.address}`), config.formatting.customer_info.align, maxChars);
      }
      
      receipt += GS + '!' + '\x00';
      receipt += this.resetFormatting();
      receipt += this.addSpacing(config.line_spacing);
    }
    
    // Linha separadora
    receipt += this.formatLine('='.repeat(maxChars), 'left', maxChars);
    
    // Itens do pedido
    order.items.forEach((item: any) => {
      receipt += this.applyFormatting(config.formatting.items);
      receipt += this.applyFontSize(config.font_sizes.item_name);
      receipt += this.formatLine(this.sanitizeForThermalPrint(`${item.quantity}x ${item.name}`), config.formatting.items.align, maxChars);
      receipt += GS + '!' + '\x00';
      receipt += this.resetFormatting();
      
      if (item.extras && item.extras.length > 0) {
        receipt += this.applyFormatting(config.formatting.item_details);
        receipt += this.applyFontSize(config.font_sizes.item_details);
        item.extras.forEach((extra: any) => {
          receipt += this.formatLine(this.sanitizeForThermalPrint(`  + ${extra.name}`), config.formatting.item_details.align, maxChars);
        });
        receipt += GS + '!' + '\x00';
        receipt += this.resetFormatting();
      }
      
      if (config.show_item_observations && item.observations) {
        receipt += this.applyFormatting(config.formatting.item_details);
        receipt += this.applyFontSize(config.font_sizes.item_details);
        receipt += this.formatLine(this.sanitizeForThermalPrint(`  Obs: ${item.observations}`), config.formatting.item_details.align, maxChars);
        receipt += GS + '!' + '\x00';
        receipt += this.resetFormatting();
      }
      
      receipt += this.applyFormatting(config.formatting.item_details);
      receipt += this.applyFontSize(config.font_sizes.item_details);
      receipt += this.formatLine(`  R$ ${Number(item.price).toFixed(2)}`, config.formatting.item_details.align, maxChars);
      receipt += GS + '!' + '\x00';
      receipt += this.resetFormatting();
      receipt += '\n';
    });
    
    // Linha separadora
    receipt += this.formatLine('='.repeat(maxChars), 'left', maxChars);
    
    // Totais
    receipt += this.applyFormatting(config.formatting.totals);
    receipt += this.applyFontSize(config.font_sizes.totals);
    
    if (order.delivery_fee && order.delivery_fee > 0) {
      receipt += this.formatLine(`Subtotal: R$ ${(Number(order.total) - Number(order.delivery_fee)).toFixed(2)}`, config.formatting.totals.align, maxChars);
      receipt += this.formatLine(`Taxa Entrega: R$ ${Number(order.delivery_fee).toFixed(2)}`, config.formatting.totals.align, maxChars);
    }
    
    receipt += this.formatLine(`TOTAL: R$ ${Number(order.total).toFixed(2)}`, config.formatting.totals.align, maxChars);
    receipt += GS + '!' + '\x00'; // Reset size
    receipt += this.resetFormatting();
    receipt += this.addSpacing(config.line_spacing);
    
    // Forma de pagamento (se configurado)
    if (config.show_payment_method) {
      receipt += this.applyFontSize(config.font_sizes.item_details);
      receipt += this.formatLine(`Pagamento: ${order.payment_method || 'Não informado'}`, 'left', maxChars);
      receipt += GS + '!' + '\x00';
      receipt += this.addSpacing(config.line_spacing);
    }
    
    // Observações do pedido (se configurado)
    if (config.show_order_observations && order.observations) {
      receipt += this.applyFontSize(config.font_sizes.item_details);
      receipt += this.formatLine('OBSERVACOES:', 'left', maxChars);
      receipt += this.formatLine(this.sanitizeForThermalPrint(order.observations), 'left', maxChars);
      receipt += GS + '!' + '\x00';
      receipt += this.addSpacing(config.line_spacing);
    }
    
    // Data/hora
    const orderDate = new Date(order.created_at);
    receipt += this.applyFontSize(config.font_sizes.item_details);
    receipt += this.formatLine(`Data: ${orderDate.toLocaleDateString('pt-BR')}`, 'left', maxChars);
    receipt += this.formatLine(`Hora: ${orderDate.toLocaleTimeString('pt-BR')}`, 'left', maxChars);
    receipt += GS + '!' + '\x00';
    receipt += this.addSpacing(config.line_spacing);
    
    // Rodapé (se configurado)
    if (config.show_footer_message && config.footer_message) {
      receipt += this.applyFormatting(config.formatting.footer);
      receipt += this.applyFontSize(config.font_sizes.item_details);
      receipt += this.formatLine(this.sanitizeForThermalPrint(config.footer_message), config.formatting.footer.align, maxChars);
      receipt += GS + '!' + '\x00';
      receipt += this.resetFormatting();
      receipt += this.addSpacing(config.line_spacing);
    }
    
    return receipt;
  }

  // Format payment method
  private formatPaymentMethod(method: string): string {
    const methods: { [key: string]: string } = {
      'dinheiro': 'Dinheiro',
      'cartao_credito': 'Cartão de Crédito',
      'cartao_debito': 'Cartão de Débito',
      'pix': 'PIX',
      'vale_refeicao': 'Vale Refeição'
    };
    return methods[method] || method;
  }

  // Disconnect from QZ Tray
  async disconnect(): Promise<void> {
    try {
      if (window.qz && window.qz.websocket && window.qz.websocket.isActive()) {
        await window.qz.websocket.disconnect();
      }
    } catch (error) {
      console.error("Erro ao desconectar do QZ Tray:", error);
    }
  }
}

export const qzPrinter = QZTrayPrinter.getInstance();

// Export helper function to get printers
export const getPrinters = async (): Promise<string[]> => {
  console.log('🖨️ Buscando lista de impressoras...');
  return await qzPrinter.getPrinters();
};
