// Extended types for the new print layout configuration system

import type { LayoutConfig } from './printer-layout';

// Tags dinâmicas disponíveis
export type PrintTag =
  | '{nome_empresa}'
  | '{logo}'
  | '{telefone}'
  | '{endereco}'
  | '{origem_pedido}'
  | '{data_hora}'
  | '{nome_cliente}'
  | '{telefone_cliente}'
  | '{endereco_cliente}'
  | '{numero_pedido}'
  | '{itens}'
  | '{observacoes_item}'
  | '{observacoes_pedido}'
  | '{mensagem_rodape}';

export interface TextFormatting {
  bold: boolean;
  underline: boolean;
  align: 'left' | 'center' | 'right';
}

export type FontSize = 'small' | 'medium' | 'large' | 'xlarge';
export type SeparatorType = 'line' | 'dots' | 'equals';

// Elemento configurável do cupom
export interface PrintElement {
  id: string;
  tag: PrintTag;
  label: string;
  visible: boolean;
  formatting: TextFormatting;
  fontSize: FontSize;
  order: number;
}

// Configuração de separador
export interface SeparatorConfig {
  show: boolean;
  type: SeparatorType;
  char: string;
}

// Configuração de seção (Cabeçalho, Corpo, Rodapé)
export interface SectionConfig {
  elements: PrintElement[];
  separator: SeparatorConfig;
}

// Layout completo expandido - extends LayoutConfig for backward compatibility
export interface ExtendedLayoutConfig extends LayoutConfig {
  header: SectionConfig;
  body: SectionConfig;
  footer: SectionConfig;
  
  // Items formatting
  item_quantity_format: '2x' | 'Qtd: 2';
  item_price_position: 'inline' | 'next_line';
  show_item_extras: boolean;
  item_extras_prefix: string;
  item_observations_prefix: string;
  
  // Totals
  show_subtotal: boolean;
  show_delivery_fee: boolean;
  
  // Advanced
  encoding: 'UTF-8' | 'Windows-1252';
  margin_left: number;
  margin_right: number;
}

// Default configuration
export const DEFAULT_EXTENDED_CONFIG: ExtendedLayoutConfig = {
  // Base LayoutConfig fields
  paper_width: '80mm',
  chars_per_line: 48,
  allow_custom_chars_per_line: false,
  font_sizes: {
    header: 'medium',
    order_number: 'xlarge',
    item_name: 'medium',
    item_details: 'normal',
    totals: 'large',
  },
  formatting: {
    header: { bold: true, underline: false, align: 'center' },
    order_number: { bold: true, underline: false, align: 'center' },
    customer_info: { bold: false, underline: false, align: 'left' },
    items: { bold: true, underline: false, align: 'left' },
    item_details: { bold: false, underline: false, align: 'left' },
    totals: { bold: true, underline: false, align: 'left' },
    footer: { bold: false, underline: false, align: 'center' },
  },
  show_company_logo: true,
  show_company_address: true,
  show_company_phone: true,
  show_order_source: true,
  show_customer_info: true,
  show_customer_address: true,
  show_item_observations: true,
  show_order_observations: true,
  show_payment_method: true,
  show_footer_message: true,
  footer_message: 'Obrigado pela preferência!',
  line_spacing: 'normal',
  cut_paper: true,
  extra_feed_lines: 3,
  
  // Extended fields
  header: {
    elements: [
      {
        id: 'h1',
        tag: '{nome_empresa}',
        label: 'Nome da Empresa',
        visible: true,
        formatting: { bold: true, underline: false, align: 'center' },
        fontSize: 'large',
        order: 1
      },
      {
        id: 'h2',
        tag: '{telefone}',
        label: 'Telefone',
        visible: true,
        formatting: { bold: false, underline: false, align: 'center' },
        fontSize: 'medium',
        order: 2
      },
      {
        id: 'h3',
        tag: '{endereco}',
        label: 'Endereço',
        visible: true,
        formatting: { bold: false, underline: false, align: 'center' },
        fontSize: 'small',
        order: 3
      }
    ],
    separator: { show: true, type: 'equals', char: '=' }
  },
  
  body: {
    elements: [
      {
        id: 'b1',
        tag: '{numero_pedido}',
        label: 'Número do Pedido',
        visible: true,
        formatting: { bold: true, underline: false, align: 'left' },
        fontSize: 'large',
        order: 1
      },
      {
        id: 'b2',
        tag: '{data_hora}',
        label: 'Data e Hora',
        visible: true,
        formatting: { bold: false, underline: false, align: 'left' },
        fontSize: 'small',
        order: 2
      },
      {
        id: 'b3',
        tag: '{origem_pedido}',
        label: 'Origem do Pedido',
        visible: true,
        formatting: { bold: false, underline: false, align: 'left' },
        fontSize: 'small',
        order: 3
      },
      {
        id: 'b4',
        tag: '{nome_cliente}',
        label: 'Nome do Cliente',
        visible: true,
        formatting: { bold: true, underline: false, align: 'left' },
        fontSize: 'medium',
        order: 4
      },
      {
        id: 'b5',
        tag: '{telefone_cliente}',
        label: 'Telefone do Cliente',
        visible: true,
        formatting: { bold: false, underline: false, align: 'left' },
        fontSize: 'small',
        order: 5
      },
      {
        id: 'b6',
        tag: '{endereco_cliente}',
        label: 'Endereço do Cliente',
        visible: true,
        formatting: { bold: false, underline: false, align: 'left' },
        fontSize: 'small',
        order: 6
      }
    ],
    separator: { show: true, type: 'line', char: '-' }
  },
  
  footer: {
    elements: [
      {
        id: 'f1',
        tag: '{observacoes_pedido}',
        label: 'Observações do Pedido',
        visible: true,
        formatting: { bold: false, underline: false, align: 'left' },
        fontSize: 'small',
        order: 1
      },
      {
        id: 'f2',
        tag: '{mensagem_rodape}',
        label: 'Mensagem de Rodapé',
        visible: true,
        formatting: { bold: false, underline: false, align: 'center' },
        fontSize: 'medium',
        order: 2
      }
    ],
    separator: { show: true, type: 'line', char: '-' }
  },
  
  item_quantity_format: '2x',
  item_price_position: 'next_line',
  show_item_extras: true,
  item_extras_prefix: '+ ',
  item_observations_prefix: 'Obs: ',
  
  show_subtotal: true,
  show_delivery_fee: true,
  
  encoding: 'UTF-8',
  margin_left: 0,
  margin_right: 0,
};

// Tag metadata for UI
export const TAG_METADATA: Record<PrintTag, { label: string; icon: string; category: 'header' | 'body' | 'footer' }> = {
  '{nome_empresa}': { label: 'Nome da Empresa', icon: '🏢', category: 'header' },
  '{logo}': { label: 'Logo', icon: '🖼️', category: 'header' },
  '{telefone}': { label: 'Telefone', icon: '📱', category: 'header' },
  '{endereco}': { label: 'Endereço', icon: '📍', category: 'header' },
  '{origem_pedido}': { label: 'Origem do Pedido', icon: '📲', category: 'body' },
  '{data_hora}': { label: 'Data e Hora', icon: '🕐', category: 'body' },
  '{nome_cliente}': { label: 'Nome do Cliente', icon: '👤', category: 'body' },
  '{telefone_cliente}': { label: 'Telefone do Cliente', icon: '📞', category: 'body' },
  '{endereco_cliente}': { label: 'Endereço do Cliente', icon: '🏠', category: 'body' },
  '{numero_pedido}': { label: 'Número do Pedido', icon: '#️⃣', category: 'body' },
  '{itens}': { label: 'Itens do Pedido', icon: '🍽️', category: 'body' },
  '{observacoes_item}': { label: 'Observações do Item', icon: '📝', category: 'body' },
  '{observacoes_pedido}': { label: 'Observações do Pedido', icon: '💬', category: 'footer' },
  '{mensagem_rodape}': { label: 'Mensagem de Rodapé', icon: '✉️', category: 'footer' }
};
