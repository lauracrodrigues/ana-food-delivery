import type { UnifiedPrintElement, PrintTag } from '@/types/printer-layout-extended';

export interface PrintTemplate {
  name: string;
  description: string;
  elements: UnifiedPrintElement[];
}

function createUnifiedElement(
  tag: PrintTag,
  label: string,
  order: number,
  options: {
    visible?: boolean;
    fontSize?: 'small' | 'medium' | 'large' | 'xlarge';
    bold?: boolean;
    underline?: boolean;
    align?: 'left' | 'center' | 'right';
    separatorEnabled?: boolean;
    separatorChar?: string;
  } = {}
): UnifiedPrintElement {
  return {
    id: `${tag}-${order}`,
    tag,
    label,
    visible: options.visible ?? true,
    fontSize: options.fontSize ?? 'medium',
    formatting: {
      bold: options.bold ?? false,
      underline: options.underline ?? false,
      align: options.align ?? 'left'
    },
    order,
    separator_below: {
      show: options.separatorEnabled ?? false,
      type: 'line',
      char: options.separatorChar ?? '-'
    }
  };
}

export const SECTOR_TEMPLATES: Record<string, PrintTemplate> = {
  complete: {
    name: 'Completo (Caixa)',
    description: 'Layout completo com todas as informações do pedido',
    elements: [
      createUnifiedElement('{nome_empresa}', 'Nome da Empresa', 0, {
        fontSize: 'large',
        bold: true,
        align: 'center'
      }),
      createUnifiedElement('{telefone}', 'Telefone', 1, {
        fontSize: 'medium',
        align: 'center'
      }),
      createUnifiedElement('{endereco}', 'Endereço', 2, {
        fontSize: 'small',
        align: 'center',
        separatorEnabled: true,
        separatorChar: '='
      }),
      createUnifiedElement('{email_empresa}', 'Email', 3, {
        visible: true,
        fontSize: 'small',
        align: 'center'
      }),
      createUnifiedElement('{numero_pedido}', 'Número do Pedido', 4, {
        visible: true,
        fontSize: 'xlarge',
        bold: true,
        align: 'center'
      }),
      createUnifiedElement('{data_hora}', 'Data e Hora', 5, {
        visible: true,
        fontSize: 'medium',
        align: 'center'
      }),
      createUnifiedElement('{origem_pedido}', 'Origem do Pedido', 6, {
        visible: true,
        fontSize: 'medium',
        align: 'center'
      }),
      createUnifiedElement('{tipo_entrega}', 'Tipo de Entrega', 7, {
        visible: true,
        fontSize: 'medium',
        bold: true,
        align: 'center',
        separatorEnabled: true
      }),
      createUnifiedElement('{nome_cliente}', 'Nome do Cliente', 8, {
        visible: true,
        fontSize: 'medium',
        bold: true,
        align: 'left'
      }),
      createUnifiedElement('{telefone_cliente}', 'Telefone do Cliente', 9, {
        visible: true,
        fontSize: 'medium',
        align: 'left'
      }),
      createUnifiedElement('{endereco_cliente}', 'Endereço do Cliente', 10, {
        visible: true,
        fontSize: 'small',
        align: 'left'
      }),
      createUnifiedElement('{bairro}', 'Bairro', 11, {
        visible: true,
        fontSize: 'small',
        align: 'left'
      }),
      createUnifiedElement('{referencia}', 'Ponto de Referência', 12, {
        visible: true,
        fontSize: 'small',
        align: 'left',
        separatorEnabled: true,
        separatorChar: '='
      }),
      createUnifiedElement('{itens}', 'Itens do Pedido', 13, {
        visible: true,
        fontSize: 'medium',
        align: 'left',
        separatorEnabled: true
      }),
      createUnifiedElement('{observacoes_pedido}', 'Observações', 14, {
        visible: true,
        fontSize: 'medium',
        align: 'left',
        separatorEnabled: true
      }),
      createUnifiedElement('{subtotal}', 'Subtotal', 15, {
        visible: true,
        fontSize: 'medium',
        align: 'left'
      }),
      createUnifiedElement('{taxa_entrega}', 'Taxa de Entrega', 16, {
        visible: true,
        fontSize: 'medium',
        align: 'left'
      }),
      createUnifiedElement('{total}', 'Total', 17, {
        visible: true,
        fontSize: 'large',
        bold: true,
        align: 'left'
      }),
      createUnifiedElement('{forma_pagamento}', 'Forma de Pagamento', 18, {
        visible: true,
        fontSize: 'medium',
        align: 'left',
        separatorEnabled: true,
        separatorChar: '='
      }),
      createUnifiedElement('{mensagem_rodape}', 'Mensagem de Rodapé', 19, {
        visible: true,
        fontSize: 'medium',
        align: 'center',
        separatorEnabled: true
      })
    ]
  },
  
  simplified: {
    name: 'Simplificado (Cozinha/Bar)',
    description: 'Layout simplificado apenas com informações essenciais',
    elements: [
      createUnifiedElement('{numero_pedido}', 'Número do Pedido', 0, {
        visible: true,
        fontSize: 'xlarge',
        bold: true,
        align: 'center',
        separatorEnabled: true,
        separatorChar: '='
      }),
      createUnifiedElement('{data_hora}', 'Data e Hora', 1, {
        visible: true,
        fontSize: 'medium',
        align: 'center'
      }),
      createUnifiedElement('{tipo_entrega}', 'Tipo de Entrega', 2, {
        visible: true,
        fontSize: 'medium',
        bold: true,
        align: 'center',
        separatorEnabled: true
      }),
      createUnifiedElement('{nome_cliente}', 'Cliente', 3, {
        visible: true,
        fontSize: 'medium',
        bold: true,
        align: 'left',
        separatorEnabled: true
      }),
      createUnifiedElement('{itens}', 'Itens do Pedido', 4, {
        visible: true,
        fontSize: 'medium',
        align: 'left',
        separatorEnabled: true,
        separatorChar: '='
      }),
      createUnifiedElement('{observacoes_pedido}', 'Observações', 5, {
        visible: true,
        fontSize: 'large',
        bold: true,
        align: 'left'
      })
    ]
  }
};
