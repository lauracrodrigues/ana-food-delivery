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
    console.log('='.repeat(60));
    console.log('🖨️ INICIANDO CONEXÃO COM QZ TRAY');
    console.log('='.repeat(60));
    
    if (!isQZAvailable()) {
      const error = 'QZ Tray não foi carregado. Verifique se:\n1. O QZ Tray está instalado no Windows\n2. O aplicativo QZ Tray está em execução\n3. Reinicie a página após abrir o QZ Tray';
      console.error('❌', error);
      throw new Error(error);
    }

    console.log('✓ QZ Tray library carregada');
    console.log('window.qz disponível:', typeof window.qz);
    console.log('window.qz.websocket disponível:', typeof window.qz?.websocket);

    try {
      // Check if already connected
      if (window.qz.websocket && window.qz.websocket.isActive()) {
        console.log('✓ QZ Tray já está conectado');
        return true;
      }

      console.log('🔧 Configurando certificados...');
      // Set up signing (for production, you should use proper certificates)
      window.qz.security.setCertificatePromise(() => {
        console.log('📜 Retornando certificado...');
        return Promise.resolve(this.certificate || this.getDefaultCertificate());
      });

      window.qz.security.setSignaturePromise((toSign: string) => {
        console.log('🔏 Assinando dados...');
        return Promise.resolve(this.sign(toSign));
      });

      // Connect to QZ Tray
      console.log('🔌 Tentando conectar ao WebSocket do QZ Tray...');
      console.log('Timeout: 10 segundos');
      
      await window.qz.websocket.connect();
      
      console.log('✅ QZ TRAY CONECTADO COM SUCESSO!');
      console.log('='.repeat(60));
      return true;
    } catch (error: any) {
      console.error('='.repeat(60));
      console.error('❌ ERRO AO CONECTAR COM QZ TRAY');
      console.error('Tipo:', typeof error);
      console.error('Mensagem:', error?.message);
      console.error('Stack:', error?.stack);
      console.error('='.repeat(60));
      
      const errorMessage = error?.message || 'Erro desconhecido';
      throw new Error(`Falha na conexão: ${errorMessage}\n\nVerifique se o QZ Tray está rodando no Windows.`);
    }
  }

  // Get available printers
  async getPrinters(): Promise<string[]> {
    console.log('🔍 Buscando impressoras disponíveis...');
    try {
      await this.connect();
      const printers = await window.qz.printers.find();
      console.log('✓ Impressoras encontradas:', printers);
      return printers;
    } catch (error) {
      console.error("❌ Erro ao buscar impressoras:", error);
      throw error;
    }
  }

  // Get default printer
  async getDefaultPrinter(): Promise<string> {
    console.log('🔍 Buscando impressora padrão...');
    try {
      await this.connect();
      const printer = await window.qz.printers.getDefault();
      console.log('✓ Impressora padrão:', printer);
      return printer;
    } catch (error) {
      console.error("❌ Erro ao buscar impressora padrão:", error);
      throw error;
    }
  }

  // Print order receipt
  async printOrder(order: any, printerName?: string): Promise<void> {
    console.log('🖨️ Iniciando impressão do pedido:', order.order_number || order.id);
    
    try {
      console.log('1️⃣ Conectando ao QZ Tray...');
      await this.connect();

      console.log('2️⃣ Selecionando impressora...');
      // Use default printer if not specified
      const printer = printerName || await this.getDefaultPrinter();
      console.log('✓ Impressora selecionada:', printer);

      console.log('3️⃣ Criando configuração de impressão...');
      // Configure printer
      const config = window.qz.configs.create(printer);

      console.log('4️⃣ Formatando dados do pedido...');
      // Format receipt data
      const data = this.formatOrderReceipt(order);
      console.log('✓ Dados formatados');

      console.log('5️⃣ Enviando para impressora...');
      // Print
      await window.qz.print(config, data);
      console.log('✅ Pedido impresso com sucesso!');
    } catch (error: any) {
      console.error('❌ Erro ao imprimir:', error);
      throw new Error(error?.message || 'Erro ao imprimir pedido');
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

// Export helper function to get printers
export const getPrinters = async (): Promise<string[]> => {
  console.log('🖨️ Buscando lista de impressoras...');
  return await qzPrinter.getPrinters();
};