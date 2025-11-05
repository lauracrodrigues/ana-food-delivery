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
    fontSize: options.fontSize ?? 'small',
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
        align: 'center'
      }),
      createUnifiedElement('{telefone_empresa}', 'Telefone Empresa', 1, {
        align: 'center'
      }),
      createUnifiedElement('{endereco_empresa}', 'Endereço Empresa', 2, {
        align: 'center'
      }),
      createUnifiedElement('{cnpj}', 'CNPJ', 3, {
        visible: true,
        align: 'center',
        separatorEnabled: true,
        separatorChar: '='
      }),
      createUnifiedElement('{email_empresa}', 'Email', 4, {
        visible: true,
        align: 'center'
      }),
      createUnifiedElement('{numero_pedido}', 'Número do Pedido', 5, {
        visible: true,
        align: 'center'
      }),
      createUnifiedElement('{data_hora}', 'Data e Hora', 6, {
        visible: true,
        align: 'center'
      }),
      createUnifiedElement('{origem_pedido}', 'Origem do Pedido', 7, {
        visible: true,
        align: 'center'
      }),
      createUnifiedElement('{tipo_entrega}', 'Tipo de Entrega', 8, {
        visible: true,
        align: 'center',
        separatorEnabled: true
      }),
      createUnifiedElement('{nome_cliente}', 'Nome do Cliente', 9, {
        visible: true,
        align: 'left'
      }),
      createUnifiedElement('{telefone_cliente}', 'Telefone do Cliente', 10, {
        visible: true,
        align: 'left'
      }),
      createUnifiedElement('{endereco_cliente}', 'Endereço do Cliente', 11, {
        visible: true,
        align: 'left'
      }),
      createUnifiedElement('{referencia}', 'Ponto de Referência', 12, {
        visible: true,
        align: 'left',
        separatorEnabled: true,
        separatorChar: '='
      }),
      createUnifiedElement('{itens}', 'Itens do Pedido', 13, {
        visible: true,
        align: 'left',
        separatorEnabled: true
      }),
      createUnifiedElement('{observacoes_pedido}', 'Observações', 14, {
        visible: true,
        align: 'left',
        separatorEnabled: true
      }),
      createUnifiedElement('{subtotal}', 'Subtotal', 15, {
        visible: true,
        align: 'left'
      }),
      createUnifiedElement('{taxa_entrega}', 'Taxa de Entrega', 16, {
        visible: true,
        align: 'left'
      }),
      createUnifiedElement('{total}', 'Total', 17, {
        visible: true,
        align: 'left'
      }),
      createUnifiedElement('{forma_pagamento}', 'Forma de Pagamento', 18, {
        visible: true,
        align: 'left',
        separatorEnabled: true,
        separatorChar: '='
      }),
      createUnifiedElement('{mensagem_rodape}', 'Mensagem de Rodapé', 19, {
        visible: true,
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
        align: 'center',
        separatorEnabled: true,
        separatorChar: '='
      }),
      createUnifiedElement('{data_hora}', 'Data e Hora', 1, {
        visible: true,
        align: 'center'
      }),
      createUnifiedElement('{tipo_entrega}', 'Tipo de Entrega', 2, {
        visible: true,
        align: 'center',
        separatorEnabled: true
      }),
      createUnifiedElement('{nome_cliente}', 'Cliente', 3, {
        visible: true,
        align: 'left',
        separatorEnabled: true
      }),
      createUnifiedElement('{itens}', 'Itens do Pedido', 4, {
        visible: true,
        align: 'left',
        separatorEnabled: true,
        separatorChar: '='
      }),
      createUnifiedElement('{observacoes_pedido}', 'Observações', 5, {
        visible: true,
        align: 'left'
      })
    ]
  }
};
