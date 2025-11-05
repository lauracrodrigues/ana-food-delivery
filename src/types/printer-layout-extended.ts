// Extended types for the new print layout configuration system

import type { LayoutConfig, FontSizeConfig, SectionFormatting, PaperWidth, LineSpacing } from './printer-layout';

// Tags dinâmicas disponíveis
export type PrintTag =
  | '{nome_empresa}'
  | '{logo}'
  | '{telefone_empresa}'    // RENOMEADO de {telefone}
  | '{endereco_empresa}'     // RENOMEADO de {endereco}
  | '{email_empresa}'
  | '{origem_pedido}'
  | '{data_hora}'
  | '{nome_cliente}'
  | '{telefone_cliente}'
  | '{endereco_cliente}'
  | '{numero_pedido}'
  | '{itens}'
  | '{observacoes_item}'
  | '{observacoes_pedido}'
  | '{mensagem_rodape}'
  | '{tipo_entrega}'
  | '{cnpj}'
  // REMOVIDO: '{bairro}' e '{cidade}' (agora fazem parte do endereço)
  | '{referencia}'
  | '{subtotal}'
  | '{taxa_entrega}'
  | '{total}'
  | '{forma_pagamento}';

export type TextAlign = 'left' | 'center' | 'right';

// ============================
// MODELOS DE IMPRESSORA
// ============================

export type PrinterModel = 
  | 'G250'
  | 'TMT-T20'
  | 'Elgin i9'
  | 'Elgin i8'
  | 'Bematech MP4200TH';

export interface PrinterModelConfig {
  model: PrinterModel;
  chars_per_line: number;
  supports_partial_cut: boolean;
  supports_qr_code: boolean;
  max_print_width_mm: number;
}

export const PRINTER_MODELS: Record<PrinterModel, PrinterModelConfig> = {
  'G250': {
    model: 'G250',
    chars_per_line: 48,
    supports_partial_cut: true,
    supports_qr_code: true,
    max_print_width_mm: 80,
  },
  'TMT-T20': {
    model: 'TMT-T20',
    chars_per_line: 48,
    supports_partial_cut: true,
    supports_qr_code: true,
    max_print_width_mm: 80,
  },
  'Elgin i9': {
    model: 'Elgin i9',
    chars_per_line: 48,
    supports_partial_cut: true,
    supports_qr_code: true,
    max_print_width_mm: 80,
  },
  'Elgin i8': {
    model: 'Elgin i8',
    chars_per_line: 48,
    supports_partial_cut: true,
    supports_qr_code: false,
    max_print_width_mm: 80,
  },
  'Bematech MP4200TH': {
    model: 'Bematech MP4200TH',
    chars_per_line: 48,
    supports_partial_cut: true,
    supports_qr_code: true,
    max_print_width_mm: 80,
  },
};

export interface TextFormatting {
  bold: boolean;
  underline: boolean;
  align: TextAlign;
}

export type FontSize = 'small' | 'medium' | 'large' | 'xlarge';
export type SeparatorType = 'line' | 'dots' | 'equals';

// Linha formatada com metadados para preview e impressão
export interface FormattedLine {
  text: string;
  formatting?: {
    bold?: boolean;
    underline?: boolean;
    fontSize?: FontSize;
    align?: TextAlign;
  };
}

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

// Elemento unificado com separador
export interface UnifiedPrintElement extends PrintElement {
  prefix?: string;  // NOVO: Texto antes da variável
  suffix?: string;  // NOVO: Texto depois da variável
  separator_below: {
    show: boolean;
    type: SeparatorType;
    char: string;
  };
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
  // Printer model
  printer_model?: PrinterModel;
  
  // Nova estrutura unificada (opcional para migração gradual)
  elements?: UnifiedPrintElement[];
  
  // Estrutura antiga (mantida para compatibilidade)
  header: SectionConfig;
  body: SectionConfig;
  footer: SectionConfig;
  
  // Configurações de formatação de itens
  item_quantity_format?: '2x' | 'Qtd: 2';
  item_price_position?: 'same_line' | 'next_line';
  item_extras_prefix?: string;
  item_observations_prefix?: string;
  show_item_extras?: boolean;
  
  // Configuração de totais
  show_subtotal?: boolean;
  show_delivery_fee?: boolean;
  
  // Configurações avançadas
  encoding?: string;
  margin_left?: number; // 0 a 20
  margin_right?: number; // 0 a 20
  text_mode?: 'condensed' | 'normal' | 'expanded';
  cut_type?: 'none' | 'partial' | 'full';
  
  // NOVO: Controle de espaçamento
  line_spacing_multiplier?: number; // 0.5 a 3.0, padrão 1.0
  item_spacing?: number; // Espaço extra entre itens (0-5 linhas)
}

// Configuração padrão expandida
export const DEFAULT_EXTENDED_CONFIG: ExtendedLayoutConfig = {
  // Printer model
  printer_model: 'G250',
  
  // Estrutura unificada (nova)
  elements: [],
  
  // Estrutura antiga (mantida para compatibilidade)
  header: {
    elements: [
      {
        id: 'nome_empresa',
        tag: '{nome_empresa}',
        label: 'Nome da Empresa',
        visible: true,
        fontSize: 'large',
        formatting: {
          bold: true,
          underline: false,
          align: 'center'
        },
        order: 0
      },
      {
        id: 'telefone_empresa',
        tag: '{telefone_empresa}',
        label: 'Telefone Empresa',
        visible: true,
        fontSize: 'medium',
        formatting: {
          bold: false,
          underline: false,
          align: 'center'
        },
        order: 1
      },
      {
        id: 'endereco_empresa',
        tag: '{endereco_empresa}',
        label: 'Endereço Empresa',
        visible: true,
        fontSize: 'small',
        formatting: {
          bold: false,
          underline: false,
          align: 'center'
        },
        order: 2
      }
    ],
    separator: {
      show: true,
      type: 'equals',
      char: '='
    }
  },
  body: {
    elements: [
      {
        id: 'numero_pedido',
        tag: '{numero_pedido}',
        label: 'Número do Pedido',
        visible: true,
        fontSize: 'xlarge',
        formatting: {
          bold: true,
          underline: false,
          align: 'center'
        },
        order: 0
      },
      {
        id: 'data_hora',
        tag: '{data_hora}',
        label: 'Data e Hora',
        visible: true,
        fontSize: 'medium',
        formatting: {
          bold: false,
          underline: false,
          align: 'center'
        },
        order: 1
      },
      {
        id: 'tipo_entrega',
        tag: '{tipo_entrega}',
        label: 'Tipo de Entrega',
        visible: true,
        fontSize: 'medium',
        formatting: {
          bold: true,
          underline: false,
          align: 'center'
        },
        order: 2
      },
      {
        id: 'nome_cliente',
        tag: '{nome_cliente}',
        label: 'Nome do Cliente',
        visible: true,
        fontSize: 'medium',
        formatting: {
          bold: true,
          underline: false,
          align: 'left'
        },
        order: 3
      },
      {
        id: 'telefone_cliente',
        tag: '{telefone_cliente}',
        label: 'Telefone do Cliente',
        visible: true,
        fontSize: 'medium',
        formatting: {
          bold: false,
          underline: false,
          align: 'left'
        },
        order: 4
      },
      {
        id: 'endereco_cliente',
        tag: '{endereco_cliente}',
        label: 'Endereço do Cliente',
        visible: true,
        fontSize: 'small',
        formatting: {
          bold: false,
          underline: false,
          align: 'left'
        },
        order: 5
      },
      {
        id: 'itens',
        tag: '{itens}',
        label: 'Itens do Pedido',
        visible: true,
        fontSize: 'medium',
        formatting: {
          bold: false,
          underline: false,
          align: 'left'
        },
        order: 6
      },
    ],
    separator: {
      show: true,
      type: 'line',
      char: '-'
    }
  },
  footer: {
    elements: [
      {
        id: 'mensagem_rodape',
        tag: '{mensagem_rodape}',
        label: 'Mensagem de Rodapé',
        visible: true,
        fontSize: 'medium',
        formatting: {
          bold: false,
          underline: false,
          align: 'center'
        },
        order: 0
      }
    ],
    separator: {
      show: true,
      type: 'line',
      char: '-'
    }
  },
  
  // Propriedades herdadas de LayoutConfig
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
  extra_feed_lines: 4,
  
  // Configurações de formatação de itens
  item_quantity_format: '2x',
  item_price_position: 'next_line',
  item_extras_prefix: '+ ',
  item_observations_prefix: 'Obs: ',
  show_item_extras: true,
  
  // Configuração de totais
  show_subtotal: true,
  show_delivery_fee: true,
  
  // Configurações avançadas
  encoding: 'UTF-8',
  margin_left: 0,
  margin_right: 0,
  text_mode: 'normal',
  cut_type: 'full',
  line_spacing_multiplier: 1.0,
  item_spacing: 0,
};

// Tag metadata for UI
export const TAG_METADATA: Record<PrintTag, { label: string; icon: string; category: 'header' | 'body' | 'footer' }> = {
  '{nome_empresa}': { label: 'Nome Empresa', icon: '🏢', category: 'header' },
  '{logo}': { label: 'Logo Empresa', icon: '🖼️', category: 'header' },
  '{telefone_empresa}': { label: 'Telefone Empresa', icon: '📞', category: 'header' },
  '{endereco_empresa}': { label: 'Endereço Empresa', icon: '📍', category: 'header' },
  '{email_empresa}': { label: 'Email Empresa', icon: '📧', category: 'header' },
  '{cnpj}': { label: 'CNPJ', icon: '🏛️', category: 'header' },
  '{numero_pedido}': { label: 'Número do Pedido', icon: '🔢', category: 'body' },
  '{data_hora}': { label: 'Data e Hora', icon: '📅', category: 'body' },
  '{origem_pedido}': { label: 'Origem do Pedido', icon: '📱', category: 'body' },
  '{tipo_entrega}': { label: 'Tipo de Entrega', icon: '🚚', category: 'body' },
  '{nome_cliente}': { label: 'Nome Cliente', icon: '👤', category: 'body' },
  '{telefone_cliente}': { label: 'Telefone Cliente', icon: '📞', category: 'body' },
  '{endereco_cliente}': { label: 'Endereço Cliente', icon: '🏠', category: 'body' },
  '{referencia}': { label: 'Ponto de Referência', icon: '📌', category: 'body' },
  '{itens}': { label: 'Itens do Pedido', icon: '🛒', category: 'body' },
  '{observacoes_item}': { label: 'Observações do Item', icon: '📝', category: 'body' },
  '{observacoes_pedido}': { label: 'Observações do Pedido', icon: '💬', category: 'body' },
  '{subtotal}': { label: 'Subtotal', icon: '💵', category: 'body' },
  '{taxa_entrega}': { label: 'Taxa de Entrega', icon: '🚚', category: 'body' },
  '{total}': { label: 'Total', icon: '💰', category: 'body' },
  '{forma_pagamento}': { label: 'Forma de Pagamento', icon: '💳', category: 'body' },
  '{mensagem_rodape}': { label: 'Mensagem de Rodapé', icon: '✉️', category: 'footer' }
};
