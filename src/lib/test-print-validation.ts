/**
 * Cria um pedido mock completo para teste de impressão
 * com todos os campos preenchidos para validação
 */
export const createCompleteMockOrder = () => ({
  order_number: '12345',
  order_number_display: '#12345',
  created_at: new Date().toISOString(),
  source: 'whatsapp',
  type: 'delivery',
  delivery_type: 'delivery',
  customer_name: 'João da Silva Santos',
  customer_phone: '(11) 98765-4321',
  address: 'Rua das Flores, 123, Apto 45, Jardim Botânico, São Paulo - SP, CEP 01234-567',
  referencia: 'Próximo à padaria São João',
  company_name: 'Restaurante Sabor & Cia Ltda',
  company_fantasy_name: 'Sabor & Cia',
  company_phone: '(11) 3456-7890',
  company_email: 'contato@saborecia.com.br',
  company_address: 'Av. Principal, 456\nCentro\nSão Paulo - SP\nCEP 01234-000',
  company_cnpj: '12.345.678/0001-90',
  company_logo: 'https://example.com/logo.png',
  items: [
    {
      name: 'Pizza Margherita Grande',
      quantity: 2,
      unit_price: 45.00,
      total_price: 90.00,
      observations: 'Sem cebola, borda recheada com catupiry, bem assada'
    },
    {
      name: 'Refrigerante Coca-Cola 2L',
      quantity: 1,
      unit_price: 8.00,
      total_price: 8.00,
      observations: ''
    },
    {
      name: 'Batata Frita com Bacon e Cheddar',
      quantity: 1,
      unit_price: 25.00,
      total_price: 25.00,
      observations: 'Bem crocante, sem pimenta'
    }
  ],
  subtotal: 123.00,
  delivery_fee: 5.00,
  total: 128.00,
  payment_method: 'Cartão de Débito - Mastercard',
  observations: 'Entregar com urgência. Cliente aguardando. Tocar campainha 2 vezes.'
});

/**
 * Checklist de validação para impressão
 */
export const PRINT_VALIDATION_CHECKLIST = {
  accentos: [
    'Verificar se "Número" aparece corretamente',
    'Verificar se "Observações" aparece corretamente',
    'Verificar se "Página" aparece corretamente',
    'Verificar se acentos em nomes aparecem corretamente'
  ],
  campos: [
    'Nome Empresa aparece',
    'Telefone Empresa aparece com prefix "Tel:"',
    'Endereço Empresa aparece completo',
    'Email Empresa aparece',
    'Número do Pedido aparece grande e centralizado',
    'Data e Hora aparecem',
    'Origem do Pedido aparece',
    'Tipo de Entrega aparece',
    'Nome Cliente aparece',
    'Telefone Cliente aparece',
    'Endereço Cliente aparece (se delivery)',
    'Ponto de Referência aparece',
    'Itens aparecem com quantidade, nome e preço',
    'Observações dos itens aparecem',
    'Observações do pedido aparecem',
    'Subtotal aparece',
    'Taxa de Entrega aparece',
    'Total aparece em destaque',
    'Forma de Pagamento aparece',
    'Mensagem de Rodapé aparece (se configurada)'
  ],
  formatacao: [
    'Negrito está sendo aplicado corretamente',
    'Sublinhado está sendo aplicado corretamente',
    'Alinhamento (esquerda/centro/direita) funciona',
    'Tamanhos de fonte (P/M/G/GG) funcionam',
    'Prefix e suffix aparecem quando configurados',
    'Separadores aparecem entre seções quando habilitados'
  ],
  espacamento: [
    'Espaçamento entre linhas está adequado',
    'Modo texto (condensado/normal/expandido) funciona',
    'Margens estão corretas',
    'Itens não estão cortados nas bordas'
  ],
  logo: [
    'Logo imprime quando empresa tem logo configurada',
    'Logo está em tamanho adequado',
    'Logo não distorce o restante do cupom'
  ]
};
