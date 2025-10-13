// QZ Tray integration for printing
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
  async printOrder(order: any, printerName?: string, isReprint: boolean = false): Promise<void> {
    try {
      await this.connect();

      // Use default printer if not specified
      const printer = printerName || await this.getDefaultPrinter();

      // Configure printer
      const config = window.qz.configs.create(printer);

      // Format receipt data
      const receipt = this.formatOrderReceipt(order, isReprint);

      // Converter para array de bytes usando TextEncoder (compatível com navegador)
      const encoder = new TextEncoder();
      const encodedReceipt = encoder.encode(receipt);

      // Print with proper format for QZ Tray 2.x
      const data = [{
        type: 'raw',
        format: 'command',
        data: Array.from(encodedReceipt)
      }];
      
      await window.qz.print(config, data);
    } catch (error: any) {
      console.error('Erro ao imprimir:', error);
      throw new Error(error?.message || 'Erro ao imprimir pedido');
    }
  }

  // Format order data for thermal printer (ESC/POS)
  private formatOrderReceipt(order: any, isReprint: boolean = false): string {
    const ESC = '\x1B';
    const GS = '\x1D';
    
    // Build receipt string
    let receipt = '';
    
    // Initialize printer
    receipt += `${ESC}@`; // Reset printer
    receipt += `${ESC}t\x10`; // Set code page to UTF-8 (code page 16)
    receipt += `${ESC}a\x01`; // Center align
    receipt += `${ESC}E\x01`; // Bold on
    
    // Dados da loja no topo
    if (order.company_name) {
      receipt += `${order.company_name}\n`;
    }
    if (order.company_address) {
      receipt += `${order.company_address}\n`;
    }
    if (order.company_phone) {
      receipt += `Tel: ${order.company_phone}\n`;
    }
    receipt += '\n';
    
    // Se for reimpressão, mostrar em destaque
    if (isReprint) {
      receipt += '********************************\n';
      receipt += '*     REIMPRESSAO     *\n';
      receipt += '********************************\n';
      receipt += '\n';
    }
    
    // Número do pedido com fonte maior
    receipt += `${GS}!\x11`; // Double height and width
    receipt += `PEDIDO #${order.order_number || order.id.slice(0, 8)}\n`;
    receipt += `${GS}!\x00`; // Normal size
    receipt += `${ESC}E\x00`; // Bold off
    receipt += '\n';
    
    // Origem do pedido - centralizada
    const source = order.source === "whatsapp" ? "WhatsApp" : 
                   order.source === "digital_menu" ? "Cardapio Digital" :
                   "Balcao";
    receipt += `Origem: ${source}\n`;
    receipt += `${ESC}a\x00`; // Left align
    receipt += '\n';

    // Order info
    receipt += `Data: ${new Date(order.created_at).toLocaleString('pt-BR')}\n`;
    receipt += `Tipo: ${order.type === 'delivery' ? 'Entrega' : 'Retirada'}\n`;
    receipt += '--------------------------------\n';

    // Customer info
    receipt += `${ESC}E\x01`; // Bold on
    receipt += 'CLIENTE:\n';
    receipt += `${ESC}E\x00`; // Bold off
    receipt += `Nome: ${order.customer_name}\n`;
    if (order.customer_phone) {
      receipt += `Telefone: ${order.customer_phone}\n`;
    }
    if (order.address && order.type === 'delivery') {
      receipt += `Endereco: ${order.address}\n`;
    }
    receipt += '--------------------------------\n';

    // Items
    receipt += `${ESC}E\x01`; // Bold on
    receipt += 'ITENS:\n';
    receipt += `${ESC}E\x00`; // Bold off
    
    let subtotal = 0;
    (order.items || []).forEach((item: any) => {
      const itemTotal = (item.price || 0) * (item.quantity || 1);
      subtotal += itemTotal;
      
      // Nome do item maior e em negrito
      receipt += `${ESC}E\x01`; // Bold on
      receipt += `${GS}!\x01`; // Double width
      receipt += `${item.quantity}x ${item.name}\n`;
      receipt += `${GS}!\x00`; // Normal width
      receipt += `${ESC}E\x00`; // Bold off
      receipt += `   R$ ${item.price.toFixed(2)} = R$ ${itemTotal.toFixed(2)}\n`;
      
      if (item.observations) {
        receipt += `   Obs: ${item.observations}\n`;
      }
    });
    
    receipt += '--------------------------------\n';

    // Totals
    receipt += `Subtotal: R$ ${subtotal.toFixed(2)}\n`;
    if (order.delivery_fee && order.delivery_fee > 0) {
      receipt += `Taxa de entrega: R$ ${order.delivery_fee.toFixed(2)}\n`;
    }
    receipt += `${ESC}E\x01`; // Bold on
    const total = subtotal + (order.delivery_fee || 0);
    receipt += `TOTAL: R$ ${total.toFixed(2)}\n`;
    receipt += `${ESC}E\x00`; // Bold off
    receipt += '--------------------------------\n';

    // Payment method
    receipt += `Forma de pagamento: ${this.formatPaymentMethod(order.payment_method)}\n`;
    
    // Observations
    if (order.observations) {
      receipt += '--------------------------------\n';
      receipt += `Observacoes: ${order.observations}\n`;
    }

    // Footer
    receipt += '================================\n';
    receipt += `${ESC}a\x01`; // Center align
    receipt += 'Obrigado pela preferencia!\n';
    receipt += `${ESC}a\x00`; // Left align
    
    // Cut paper
    receipt += '\n\n\n\n';
    receipt += `${GS}V\x00`; // Full cut

    // Return receipt string (will be wrapped in object by printOrder)
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

// Export helper function to get printers
export const getPrinters = async (): Promise<string[]> => {
  console.log('🖨️ Buscando lista de impressoras...');
  return await qzPrinter.getPrinters();
};