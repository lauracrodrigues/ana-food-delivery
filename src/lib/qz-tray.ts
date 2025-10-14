// QZ Tray integration for printing
import type { LayoutConfig, PrintSector, TextFormatting } from '@/types/printer-layout';
import { FONT_SIZE_COMMANDS, LINE_SPACING_VALUES, TEXT_FORMATTING_COMMANDS, PAPER_WIDTHS, DEFAULT_LAYOUT_CONFIG } from '@/types/printer-layout';

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
  async printOrder(order: any, printerName?: string, isReprint: boolean = false, sector: PrintSector = 'caixa', layoutConfig?: LayoutConfig): Promise<void> {
    try {
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
      
      await window.qz.print(config, data);
    } catch (error: any) {
      console.error('Erro ao imprimir:', error);
      throw new Error(error?.message || 'Erro ao imprimir pedido');
    }
  }

  // Helper methods for formatting
  private getLayoutConfig(config?: LayoutConfig): LayoutConfig {
    return config || DEFAULT_LAYOUT_CONFIG;
  }

  private formatLine(text: string, align: 'left' | 'center' | 'right', maxChars: number): string {
    const cleanText = text.substring(0, maxChars);
    
    if (align === 'center') {
      const padding = Math.max(0, Math.floor((maxChars - cleanText.length) / 2));
      return ' '.repeat(padding) + cleanText + '\n';
    } else if (align === 'right') {
      const padding = Math.max(0, maxChars - cleanText.length);
      return ' '.repeat(padding) + cleanText + '\n';
    }
    
    return cleanText + '\n';
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

  // Format order data for thermal printer (ESC/POS)
  private formatOrderReceipt(order: any, isReprint: boolean = false, layoutConfig?: LayoutConfig): string {
    const config = this.getLayoutConfig(layoutConfig);
    const maxChars = config.chars_per_line;
    
    const ESC = '\x1B';
    const GS = '\x1D';
    
    let receipt = '';
    
    // Comandos de inicialização
    receipt += ESC + '@'; // Reset printer
    
    // Cabeçalho (se configurado)
    if (config.show_company_logo) {
      receipt += this.applyFormatting(config.formatting.header);
      receipt += this.applyFontSize(config.font_sizes.header);
      receipt += this.formatLine('PEDIDO', config.formatting.header.align, maxChars);
      receipt += GS + '!' + '\x00'; // Reset size
      receipt += this.resetFormatting();
      receipt += this.addSpacing(config.line_spacing);
    }
    
    // Número do pedido
    receipt += this.applyFormatting(config.formatting.order_number);
    receipt += this.applyFontSize(config.font_sizes.order_number);
    receipt += this.formatLine(`#${order.order_number}`, config.formatting.order_number.align, maxChars);
    receipt += GS + '!' + '\x00'; // Reset size
    receipt += this.resetFormatting();
    receipt += this.addSpacing(config.line_spacing);
    
    // Tipo de pedido e origem
    receipt += ESC + 'a' + '\x00'; // Left align
    receipt += this.applyFontSize(config.font_sizes.header);
    receipt += this.formatLine(`${order.type === 'delivery' ? '🛵 ENTREGA' : '🏪 RETIRADA'}`, 'left', maxChars);
    
    if (config.show_order_source && order.source) {
      receipt += this.formatLine(`Origem: ${order.source === 'whatsapp' ? 'WhatsApp' : 'Cardápio Digital'}`, 'left', maxChars);
    }
    
    receipt += GS + '!' + '\x00';
    receipt += this.addSpacing(config.line_spacing);
    
    // Cliente (se configurado)
    if (config.show_customer_info) {
      receipt += this.applyFormatting(config.formatting.customer_info);
      receipt += this.applyFontSize(config.font_sizes.item_details);
      receipt += this.formatLine('CLIENTE:', config.formatting.customer_info.align, maxChars);
      receipt += this.formatLine(order.customer_name, config.formatting.customer_info.align, maxChars);
      receipt += this.formatLine(`Tel: ${order.customer_phone}`, config.formatting.customer_info.align, maxChars);
      
      if (config.show_customer_address && order.type === 'delivery' && order.address) {
        receipt += this.formatLine(`Endereco: ${order.address}`, config.formatting.customer_info.align, maxChars);
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
      receipt += this.formatLine(`${item.quantity}x ${item.name}`, config.formatting.items.align, maxChars);
      receipt += GS + '!' + '\x00';
      receipt += this.resetFormatting();
      
      if (item.extras && item.extras.length > 0) {
        receipt += this.applyFormatting(config.formatting.item_details);
        receipt += this.applyFontSize(config.font_sizes.item_details);
        item.extras.forEach((extra: any) => {
          receipt += this.formatLine(`  + ${extra.name}`, config.formatting.item_details.align, maxChars);
        });
        receipt += GS + '!' + '\x00';
        receipt += this.resetFormatting();
      }
      
      if (config.show_item_observations && item.observations) {
        receipt += this.applyFormatting(config.formatting.item_details);
        receipt += this.applyFontSize(config.font_sizes.item_details);
        receipt += this.formatLine(`  Obs: ${item.observations}`, config.formatting.item_details.align, maxChars);
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
      receipt += this.formatLine(order.observations, 'left', maxChars);
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
      receipt += this.formatLine(config.footer_message, config.formatting.footer.align, maxChars);
      receipt += GS + '!' + '\x00';
      receipt += this.resetFormatting();
      receipt += this.addSpacing(config.line_spacing);
    }
    
    // Via de reimpressão
    if (isReprint) {
      receipt += ESC + 'a' + '\x01'; // Center align
      receipt += this.formatLine('*** VIA REIMPRESSA ***', 'center', maxChars);
      receipt += this.addSpacing(config.line_spacing);
    }
    
    // Avançar papel e cortar (se configurado)
    if (config.cut_paper) {
      receipt += '\n'.repeat(config.extra_feed_lines);
      receipt += GS + 'V' + '\x41' + '\x03'; // Corte parcial
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
