/**
 * MOCK ÚNICO DE PEDIDO
 * Todos os componentes importam daqui
 * NUNCA duplicar mock em outro lugar
 */

export interface MockOrderItem {
  quantity: number;
  name: string;
  price: number;
  extras?: Array<{ name: string }>;
  observations?: string;
}

export interface MockOrder {
  order_number: string;
  created_at: Date;
  type: 'delivery' | 'pickup';
  source: 'whatsapp' | 'menu';
  customer_name: string;
  customer_phone: string;
  address: string;
  referencia?: string;
  items: MockOrderItem[];
  delivery_fee: number;
  total: number;
  payment_method: string;
  observations: string;
  // Campos empresa (serão sobrescritos por dados reais)
  company_name?: string;
  company_phone?: string;
  company_address?: string;
  company_email?: string;
  company_cnpj?: string;
}

export const MOCK_ORDER: MockOrder = {
  order_number: '001',
  created_at: new Date(),
  type: 'delivery',
  source: 'whatsapp',
  customer_name: 'João Silva',
  customer_phone: '(11) 98765-4321',
  address: 'Rua das Flores, 123 - Centro',
  referencia: 'Próximo à padaria',
  items: [
    {
      quantity: 2,
      name: 'Pizza Margherita G',
      price: 45.0,
      extras: [{ name: 'Borda recheada' }, { name: 'Catupiry extra' }],
      observations: 'Sem cebola',
    },
    {
      quantity: 1,
      name: 'Refrigerante 2L',
      price: 8.0,
      extras: [],
      observations: '',
    },
    {
      quantity: 3,
      name: 'Pastel de Carne',
      price: 5.0,
      extras: [{ name: 'Com queijo' }],
      observations: '',
    },
  ],
  delivery_fee: 5.0,
  total: 113.0,
  payment_method: 'Dinheiro',
  observations: 'Entregar na portaria',
  company_name: 'EMPRESA EXEMPLO',
  company_phone: '(11) 1234-5678',
  company_address: 'Rua Exemplo, 123 - Centro - Cidade - SP - CEP: 12345-678',
  company_email: 'contato@empresa.com.br',
};
