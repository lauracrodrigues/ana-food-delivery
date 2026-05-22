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
    // v1.2.2 — xsmall (PP/condensed) habilitado
    fontSize?: 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge';
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
  // v1.2.2 — Template "Completo" reformulado pra bater visual com iFood/Goomer/Delivery Direto
  // 15 zonas: header bold + condensed → tipo invertido → nº gigante → data/ETA →
  //           cliente destacado → itens em colunas → totais alinhados → QR rastreio
  // Tags com override semântico (numero_pedido, tipo_entrega, total) usam config interna
  // que sobrescreve fontSize/align/bold — define só como fallback aqui.
  complete: {
    name: 'Completo (Caixa) — Food Service',
    description: 'Layout padrão estilo iFood/Goomer: nº GIGANTE, tipo invertido, totais 2X, QR rastreio',
    elements: [
      // ── ZONA 1: HEADER EMPRESA ────────────────────────────────────
      createUnifiedElement('{nome_empresa}', 'Nome da Empresa', 0, {
        fontSize: 'large', bold: true, align: 'center',
      }),
      createUnifiedElement('{telefone_empresa}', 'Telefone Empresa', 1, {
        fontSize: 'xsmall', align: 'center',          // condensed (PP)
      }),
      createUnifiedElement('{endereco_empresa}', 'Endereço Empresa', 2, {
        fontSize: 'xsmall', align: 'center',
      }),
      createUnifiedElement('{cnpj}', 'CNPJ', 3, {
        fontSize: 'xsmall', align: 'center',
        separatorEnabled: true, separatorChar: '=',
      }),

      // ── ZONA 2: TIPO DE PEDIDO (override semântico: 2X bold center INV) ─
      createUnifiedElement('{tipo_entrega}', 'Tipo de Entrega', 4, {
        visible: true, align: 'center',
        separatorEnabled: false,
      }),

      // ── ZONA 3: Nº PEDIDO GIGANTE (override semântico: 2X bold center 2 linhas) ─
      createUnifiedElement('{numero_pedido}', 'Número do Pedido', 5, {
        visible: true, align: 'center',
        separatorEnabled: false,
      }),

      // ── ZONA 4: DATA + ETA ────────────────────────────────────────
      createUnifiedElement('{data_hora}', 'Pedido às', 6, {
        fontSize: 'small', align: 'center',
      }),
      createUnifiedElement('{eta_pronto}', 'Previsão Pronto', 7, {
        fontSize: 'medium', bold: true, align: 'center',
        separatorEnabled: true,
      }),

      // ── ZONA 5: CLIENTE DESTACADO ─────────────────────────────────
      createUnifiedElement('{nome_cliente}', 'Nome do Cliente', 8, {
        fontSize: 'large', bold: true, align: 'left',
      }),
      createUnifiedElement('{telefone_cliente}', 'Telefone do Cliente', 9, {
        fontSize: 'xsmall', align: 'left',            // condensed embaixo
      }),

      // ── ZONA 6: ENDEREÇO (quebra inteligente já no formatter) ─────
      createUnifiedElement('{endereco_cliente}', 'Endereço do Cliente', 10, {
        fontSize: 'medium', align: 'left',
      }),
      createUnifiedElement('{referencia}', 'Ponto de Referência', 11, {
        fontSize: 'small', align: 'left',
        separatorEnabled: true,
      }),

      // ── ZONA 7-10: ITENS (separador pontilhado entre items + extras indentados + OBS) ─
      createUnifiedElement('{itens}', 'Itens do Pedido', 12, {
        fontSize: 'medium', align: 'left',
        separatorEnabled: true,
      }),

      // ── ZONA 8: OBS GERAL DO PEDIDO (bracket pontilhado + ">> OBS:" bold) ─
      createUnifiedElement('{observacoes_pedido}', 'Observações', 13, {
        fontSize: 'medium', align: 'left',
      }),

      // ── ZONA 11: TOTAIS ALINHADOS DIREITA ─────────────────────────
      createUnifiedElement('{subtotal}', 'Subtotal', 14, {
        fontSize: 'medium', align: 'right',
      }),
      createUnifiedElement('{taxa_entrega}', 'Taxa de Entrega', 15, {
        fontSize: 'medium', align: 'right',
      }),
      createUnifiedElement('{total}', 'Total', 16, {
        visible: true, align: 'right',                // override semântico força 2X bold
        separatorEnabled: false,
      }),

      // ── ZONA 12: PAGAMENTO ────────────────────────────────────────
      createUnifiedElement('{forma_pagamento}', 'Forma de Pagamento', 17, {
        fontSize: 'medium', bold: true, align: 'left',
        separatorEnabled: true, separatorChar: '=',
      }),

      // ── ZONA 13: QR RASTREIO CLIENTE (anafood.vip/p/XXX) ──────────
      createUnifiedElement('{qr_rastreio}', 'QR Rastreio', 18, {
        align: 'center',
      }),
      createUnifiedElement('{mensagem_rodape}', 'Mensagem de Rodapé', 19, {
        fontSize: 'small', align: 'center',
        separatorEnabled: true,
      }),
    ],
  },
  
  // v1.2.2 — Cozinha/Bar: foco no que cozinha precisa ver — sem dados de pagamento/endereço
  simplified: {
    name: 'Simplificado (Cozinha/Bar) — Food Service',
    description: 'Tipo invertido + Nº GIGANTE + ETA + itens com OBS destacado',
    elements: [
      createUnifiedElement('{tipo_entrega}', 'Tipo de Entrega', 0, {
        visible: true, align: 'center',
      }),
      createUnifiedElement('{numero_pedido}', 'Número do Pedido', 1, {
        visible: true, align: 'center',
      }),
      createUnifiedElement('{data_hora}', 'Pedido às', 2, {
        fontSize: 'small', align: 'center',
      }),
      createUnifiedElement('{eta_pronto}', 'Previsão Pronto', 3, {
        fontSize: 'medium', bold: true, align: 'center',
        separatorEnabled: true,
      }),
      createUnifiedElement('{nome_cliente}', 'Cliente', 4, {
        fontSize: 'large', bold: true, align: 'left',
        separatorEnabled: true,
      }),
      createUnifiedElement('{itens}', 'Itens do Pedido', 5, {
        fontSize: 'medium', align: 'left',
        separatorEnabled: true, separatorChar: '=',
      }),
      createUnifiedElement('{observacoes_pedido}', 'Observações', 6, {
        fontSize: 'medium', align: 'left',
      }),
    ],
  },
};
