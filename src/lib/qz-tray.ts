// QZ Tray integration for printing
declare global {
  interface Window {
    qz: any;
  }
}

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
    try {
      if (!window.qz) {
        throw new Error("QZ Tray não está carregado. Certifique-se de que o QZ Tray está instalado e em execução.");
      }

      // Check if already connected
      if (window.qz.websocket && window.qz.websocket.isActive()) {
        return true;
      }

      // Set up signing (for production, you should use proper certificates)
      window.qz.security.setCertificatePromise(() => {
        return Promise.resolve(this.certificate || this.getDefaultCertificate());
      });

      window.qz.security.setSignaturePromise((toSign: string) => {
        return Promise.resolve(this.sign(toSign));
      });

      // Connect to QZ Tray
      await window.qz.websocket.connect();
      return true;
    } catch (error) {
      console.error("Erro ao conectar com QZ Tray:", error);
      throw error;
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
  async printOrder(order: any, printerName?: string): Promise<void> {
    try {
      await this.connect();

      // Use default printer if not specified
      const printer = printerName || await this.getDefaultPrinter();

      // Configure printer
      const config = window.qz.configs.create(printer);

      // Format receipt data
      const data = this.formatOrderReceipt(order);

      // Print
      await window.qz.print(config, data);
    } catch (error) {
      console.error("Erro ao imprimir:", error);
      throw error;
    }
  }

  // Format order data for thermal printer (ESC/POS)
  private formatOrderReceipt(order: any): any[] {
    const ESC = '\x1B';
    const data = [];
    
    // Initialize printer
    data.push({ type: 'raw', format: 'plain', data: `${ESC}@` }); // Reset printer
    
    // Header - centered and bold
    data.push({ type: 'raw', format: 'plain', data: `${ESC}a1` }); // Center align
    data.push({ type: 'raw', format: 'plain', data: `${ESC}E1` }); // Bold on
    data.push({ type: 'raw', format: 'plain', data: '================================\n' });
    data.push({ type: 'raw', format: 'plain', data: 'COMPROVANTE DO PEDIDO\n' });
    data.push({ type: 'raw', format: 'plain', data: '================================\n' });
    data.push({ type: 'raw', format: 'plain', data: `${ESC}E0` }); // Bold off
    data.push({ type: 'raw', format: 'plain', data: `${ESC}a0` }); // Left align
    data.push({ type: 'raw', format: 'plain', data: '\n' });

    // Order info
    data.push({ type: 'raw', format: 'plain', data: `Pedido: #${order.order_number || order.id.slice(0, 8)}\n` });
    data.push({ type: 'raw', format: 'plain', data: `Data: ${new Date(order.created_at).toLocaleString('pt-BR')}\n` });
    data.push({ type: 'raw', format: 'plain', data: `Tipo: ${order.type === 'delivery' ? 'Entrega' : 'Retirada'}\n` });
    data.push({ type: 'raw', format: 'plain', data: '--------------------------------\n' });

    // Customer info
    data.push({ type: 'raw', format: 'plain', data: `${ESC}E1` }); // Bold on
    data.push({ type: 'raw', format: 'plain', data: 'CLIENTE:\n' });
    data.push({ type: 'raw', format: 'plain', data: `${ESC}E0` }); // Bold off
    data.push({ type: 'raw', format: 'plain', data: `Nome: ${order.customer_name}\n` });
    if (order.customer_phone) {
      data.push({ type: 'raw', format: 'plain', data: `Telefone: ${order.customer_phone}\n` });
    }
    if (order.address && order.type === 'delivery') {
      data.push({ type: 'raw', format: 'plain', data: `Endereço: ${order.address}\n` });
    }
    data.push({ type: 'raw', format: 'plain', data: '--------------------------------\n' });

    // Items
    data.push({ type: 'raw', format: 'plain', data: `${ESC}E1` }); // Bold on
    data.push({ type: 'raw', format: 'plain', data: 'ITENS:\n' });
    data.push({ type: 'raw', format: 'plain', data: `${ESC}E0` }); // Bold off
    
    let subtotal = 0;
    (order.items || []).forEach((item: any) => {
      const itemTotal = (item.price || 0) * (item.quantity || 1);
      subtotal += itemTotal;
      
      data.push({ type: 'raw', format: 'plain', data: `${item.quantity}x ${item.name}\n` });
      data.push({ type: 'raw', format: 'plain', data: `   R$ ${item.price.toFixed(2)} = R$ ${itemTotal.toFixed(2)}\n` });
      
      if (item.observations) {
        data.push({ type: 'raw', format: 'plain', data: `   Obs: ${item.observations}\n` });
      }
    });
    
    data.push({ type: 'raw', format: 'plain', data: '--------------------------------\n' });

    // Totals
    data.push({ type: 'raw', format: 'plain', data: `Subtotal: R$ ${subtotal.toFixed(2)}\n` });
    if (order.delivery_fee && order.delivery_fee > 0) {
      data.push({ type: 'raw', format: 'plain', data: `Taxa de entrega: R$ ${order.delivery_fee.toFixed(2)}\n` });
    }
    data.push({ type: 'raw', format: 'plain', data: `${ESC}E1` }); // Bold on
    const total = subtotal + (order.delivery_fee || 0);
    data.push({ type: 'raw', format: 'plain', data: `TOTAL: R$ ${total.toFixed(2)}\n` });
    data.push({ type: 'raw', format: 'plain', data: `${ESC}E0` }); // Bold off
    data.push({ type: 'raw', format: 'plain', data: '--------------------------------\n' });

    // Payment method
    data.push({ type: 'raw', format: 'plain', data: `Forma de pagamento: ${this.formatPaymentMethod(order.payment_method)}\n` });
    
    // Observations
    if (order.observations) {
      data.push({ type: 'raw', format: 'plain', data: '--------------------------------\n' });
      data.push({ type: 'raw', format: 'plain', data: `Observações: ${order.observations}\n` });
    }

    // Footer
    data.push({ type: 'raw', format: 'plain', data: '================================\n' });
    data.push({ type: 'raw', format: 'plain', data: `${ESC}a1` }); // Center align
    data.push({ type: 'raw', format: 'plain', data: 'Obrigado pela preferência!\n' });
    data.push({ type: 'raw', format: 'plain', data: `${ESC}a0` }); // Left align
    
    // Cut paper
    data.push({ type: 'raw', format: 'plain', data: '\n\n\n\n' });
    data.push({ type: 'raw', format: 'plain', data: `${ESC}m` }); // Partial cut

    return data;
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

  // Default certificate for development (you should replace this in production)
  private getDefaultCertificate(): string {
    return `-----BEGIN CERTIFICATE-----
MIIFAzCCAuugAwIBAgIUJSWYOq9SLSvZaZApOeMXKLs9m7wwDQYJKoZIhvcNAQEL
BQAwETEPMA0GA1UEAwwGUVogVHJheTAeFw0yNDAxMDEwMDAwMDBaFw0zNDAxMDEw
MDAwMDBaMBExDzANBgNVBAMMBlFaIFRyYXkwggIiMA0GCSqGSIb3DQEBAQUAA4IC
DwAwggIKAoICAQC5W8rE2KPzokHgOVGdV5rnrGaGZQHMKvQqmKBfJTkC5GtYh8DW
-----END CERTIFICATE-----`;
  }

  // Sign data for QZ Tray (you should implement proper signing in production)
  private sign(toSign: string): string {
    // This is a placeholder. In production, you should implement proper signing
    return btoa(toSign);
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