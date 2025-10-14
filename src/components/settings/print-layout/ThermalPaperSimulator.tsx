import { Card, CardContent } from '@/components/ui/card';
import type { ExtendedLayoutConfig, PrintElement } from '@/types/printer-layout-extended';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ThermalPaperSimulatorProps {
  config: ExtendedLayoutConfig;
  companyData?: {
    name: string;
    phone: string;
    address: string;
  };
}

export function ThermalPaperSimulator({ config, companyData }: ThermalPaperSimulatorProps) {
  // Mock data
  const mockOrder = {
    order_number: "123",
    customer_name: "João Silva",
    customer_phone: "(11) 98765-4321",
    address: "Rua Exemplo, 123 - Centro",
    type: "delivery",
    source: "whatsapp",
    items: [
      {
        name: "Hambúrguer Especial",
        quantity: 2,
        price: 25.50,
        observations: "Sem cebola",
        extras: [{ name: "Queijo Extra", price: 3.00 }]
      },
      {
        name: "Batata Frita Grande",
        quantity: 1,
        price: 12.00,
      }
    ],
    delivery_fee: 5.00,
    subtotal: 66.00,
    total: 71.00,
    payment_method: "Dinheiro",
    observations: "Entregar na portaria",
    created_at: new Date().toISOString(),
  };

  const company = companyData || {
    name: "EMPRESA EXEMPLO",
    phone: "(11) 3333-4444",
    address: "Rua Teste, 456"
  };

  const getFontSizeClass = (size: string) => {
    switch (size) {
      case "xlarge": return "text-2xl leading-tight";
      case "large": return "text-lg leading-tight";
      case "medium": return "text-base leading-tight";
      default: return "text-sm leading-tight";
    }
  };

  const getAlignClass = (align: string) => {
    switch (align) {
      case "center": return "text-center";
      case "right": return "text-right";
      default: return "text-left";
    }
  };

  const getLineSpacing = () => {
    switch (config.line_spacing) {
      case "compact": return "leading-tight";
      case "relaxed": return "leading-loose";
      default: return "leading-normal";
    }
  };

  const renderElement = (element: PrintElement) => {
    if (!element.visible) return null;

    const classes = `${getFontSizeClass(element.fontSize)} ${getAlignClass(element.formatting.align)} ${
      element.formatting.bold ? "font-bold" : ""
    } ${element.formatting.underline ? "underline" : ""}`;

    let content = '';
    switch (element.tag) {
      case '{nome_empresa}':
        content = company.name;
        break;
      case '{telefone}':
        content = `Tel: ${company.phone}`;
        break;
      case '{endereco}':
        content = company.address;
        break;
      case '{numero_pedido}':
        content = `Pedido #${mockOrder.order_number}`;
        break;
      case '{data_hora}':
        content = format(new Date(mockOrder.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR });
        break;
      case '{origem_pedido}':
        content = `Origem: ${mockOrder.source === 'whatsapp' ? 'WhatsApp' : 'Cardapio Digital'}`;
        break;
      case '{nome_cliente}':
        content = `Cliente: ${mockOrder.customer_name}`;
        break;
      case '{telefone_cliente}':
        content = `Tel: ${mockOrder.customer_phone}`;
        break;
      case '{endereco_cliente}':
        content = mockOrder.type === 'delivery' ? `End: ${mockOrder.address}` : '';
        break;
      case '{observacoes_pedido}':
        content = mockOrder.observations ? `Obs: ${mockOrder.observations}` : '';
        break;
      case '{mensagem_rodape}':
        content = config.footer_message;
        break;
      default:
        content = element.label;
    }

    if (!content) return null;

    return (
      <div key={element.id} className={classes} style={{ 
        paddingLeft: `${config.margin_left * 0.5}em`,
        paddingRight: `${config.margin_right * 0.5}em`
      }}>
        {content}
      </div>
    );
  };

  const renderSeparator = (separator: { show: boolean; type: string; char: string }) => {
    if (!separator.show) return null;
    const char = separator.char || '-';
    const effectiveWidth = config.chars_per_line - config.margin_left - config.margin_right;
    return (
      <div className="text-center text-xs" style={{
        paddingLeft: `${config.margin_left * 0.5}em`,
        paddingRight: `${config.margin_right * 0.5}em`
      }}>
        {char.repeat(effectiveWidth)}
      </div>
    );
  };

  // Calculate paper width in pixels (approx)
  const paperWidthPx = config.chars_per_line * 8.5; // ~8.5px per char for monospace

  return (
    <div className="sticky top-4">
      <Card className="bg-muted/30">
        <CardContent className="p-6">
          {/* Ruler */}
          <div className="flex justify-between text-[10px] text-muted-foreground font-mono mb-2 select-none">
            <span>0</span>
            <span>10</span>
            <span>20</span>
            <span>30</span>
            <span>40</span>
            {config.chars_per_line >= 48 && <span>48</span>}
          </div>

          {/* Paper simulation */}
          <div 
            className="bg-[#F5E6D3] shadow-lg mx-auto"
            style={{ 
              width: `${paperWidthPx}px`,
              maxWidth: '100%'
            }}
          >
            <div 
              className={`font-mono text-xs p-4 ${getLineSpacing()}`}
              style={{ 
                wordBreak: 'break-word',
                overflowWrap: 'break-word'
              }}
            >
              {/* Header */}
              <div className="space-y-1 mb-2">
                {config.header.elements
                  .sort((a, b) => a.order - b.order)
                  .map(renderElement)}
              </div>
              {renderSeparator(config.header.separator)}

              {/* Body */}
              <div className="space-y-1 my-2">
                {config.body.elements
                  .sort((a, b) => a.order - b.order)
                  .map(renderElement)}
              </div>
              {renderSeparator(config.body.separator)}

              {/* Items */}
              <div className="my-2 space-y-2">
                <div className="font-bold text-sm">ITENS:</div>
                {mockOrder.items.map((item, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <div className="flex justify-between">
                      <span>
                        {config.item_quantity_format === '2x' 
                          ? `${item.quantity}x ${item.name}`
                          : `Qtd: ${item.quantity} - ${item.name}`
                        }
                      </span>
                    </div>
                    {config.show_item_extras && item.extras && item.extras.map((extra, i) => (
                      <div key={i} className="text-xs pl-4">
                        {config.item_extras_prefix}{extra.name}
                      </div>
                    ))}
                    {config.show_item_observations && item.observations && (
                      <div className="text-xs pl-4">
                        {config.item_observations_prefix}{item.observations}
                      </div>
                    )}
                    {config.item_price_position === 'next_line' ? (
                      <div className="text-xs pl-4">R$ {item.price.toFixed(2)}</div>
                    ) : (
                      <div className="text-xs text-right">R$ {item.price.toFixed(2)}</div>
                    )}
                  </div>
                ))}
              </div>

              {renderSeparator(config.body.separator)}

              {/* Totals */}
              <div className="my-2 space-y-1">
                {config.show_subtotal && (
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>R$ {mockOrder.subtotal.toFixed(2)}</span>
                  </div>
                )}
                {config.show_delivery_fee && mockOrder.delivery_fee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Taxa de Entrega:</span>
                    <span>R$ {mockOrder.delivery_fee.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base">
                  <span>TOTAL:</span>
                  <span>R$ {mockOrder.total.toFixed(2)}</span>
                </div>
                {config.show_payment_method && (
                  <div className="text-sm mt-1">
                    Pagamento: {mockOrder.payment_method}
                  </div>
                )}
              </div>

              {renderSeparator(config.footer.separator)}

              {/* Footer */}
              <div className="space-y-1 mt-2">
                {config.footer.elements
                  .sort((a, b) => a.order - b.order)
                  .map(renderElement)}
              </div>

              {/* Extra feed */}
              {config.extra_feed_lines > 0 && (
                <div style={{ height: `${config.extra_feed_lines * 1.2}em` }} />
              )}
            </div>

            {/* Cut line */}
            {config.cut_paper && (
              <div className="border-t-2 border-dashed border-muted-foreground/30 text-center py-2 text-xs text-muted-foreground">
                ✂️ Corte Automático
              </div>
            )}
          </div>

          {/* Info */}
          <div className="text-center text-xs text-muted-foreground mt-4">
            {config.paper_width} • {config.chars_per_line} caracteres/linha • {config.encoding}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
