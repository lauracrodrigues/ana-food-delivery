import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LayoutConfig, PrintSector } from "@/types/printer-layout";

interface PrintPreviewProps {
  config: LayoutConfig;
  sector: PrintSector;
}

export function PrintPreview({ config, sector }: PrintPreviewProps) {
  // Mock order data
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
    total: 71.00,
    payment_method: "Dinheiro",
    observations: "Entregar na portaria",
    created_at: new Date().toISOString(),
  };

  const getFontSizeClass = (size: string) => {
    switch (size) {
      case "xlarge": return "text-2xl";
      case "large": return "text-lg";
      case "medium": return "text-base";
      default: return "text-sm";
    }
  };

  const getAlignClass = (align: string) => {
    switch (align) {
      case "center": return "text-center";
      case "right": return "text-right";
      default: return "text-left";
    }
  };

  const getFormatClasses = (section: keyof typeof config.formatting) => {
    const formatting = config.formatting[section];
    return `${formatting.bold ? "font-bold" : ""} ${formatting.underline ? "underline" : ""} ${getAlignClass(formatting.align)}`;
  };

  return (
    <Card className="bg-background">
      <CardHeader>
        <CardTitle className="text-sm">Preview em Tempo Real</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-white border-2 border-border rounded-lg p-4 font-mono text-xs overflow-hidden" style={{ maxWidth: `${config.chars_per_line}ch` }}>
          {/* Header */}
          {config.show_company_logo && (
            <div className={`${getFontSizeClass(config.font_sizes.header)} ${getFormatClasses("header")} mb-2`}>
              NOME DA EMPRESA
            </div>
          )}

          {/* Order Number */}
          <div className={`${getFontSizeClass(config.font_sizes.order_number)} ${getFormatClasses("order_number")} mb-2`}>
            #{mockOrder.order_number}
          </div>

          {/* Order Type */}
          <div className={`${getFontSizeClass(config.font_sizes.header)} text-left mb-1`}>
            {mockOrder.type === 'delivery' ? '🛵 ENTREGA' : '🏪 RETIRADA'}
          </div>

          {config.show_order_source && (
            <div className="text-left mb-2">
              Origem: {mockOrder.source === 'whatsapp' ? 'WhatsApp' : 'Cardápio Digital'}
            </div>
          )}

          {/* Customer Info */}
          {config.show_customer_info && (
            <div className={`${getFontSizeClass(config.font_sizes.item_details)} ${getFormatClasses("customer_info")} mb-2`}>
              <div className="font-bold">CLIENTE:</div>
              <div>{mockOrder.customer_name}</div>
              <div>Tel: {mockOrder.customer_phone}</div>
              {config.show_customer_address && mockOrder.type === 'delivery' && (
                <div>Endereço: {mockOrder.address}</div>
              )}
            </div>
          )}

          {/* Separator */}
          <div className="my-2">{'='.repeat(Math.min(config.chars_per_line, 48))}</div>

          {/* Items */}
          <div className="space-y-2">
            {mockOrder.items.map((item, idx) => (
              <div key={idx}>
                <div className={`${getFontSizeClass(config.font_sizes.item_name)} ${getFormatClasses("items")}`}>
                  {item.quantity}x {item.name}
                </div>
                {item.extras && (
                  <div className={`${getFontSizeClass(config.font_sizes.item_details)} ${getFormatClasses("item_details")} pl-4`}>
                    {item.extras.map((extra, i) => (
                      <div key={i}>+ {extra.name}</div>
                    ))}
                  </div>
                )}
                {config.show_item_observations && item.observations && (
                  <div className={`${getFontSizeClass(config.font_sizes.item_details)} ${getFormatClasses("item_details")} pl-4`}>
                    Obs: {item.observations}
                  </div>
                )}
                <div className={`${getFontSizeClass(config.font_sizes.item_details)} ${getFormatClasses("item_details")} pl-4`}>
                  R$ {Number(item.price).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          {/* Separator */}
          <div className="my-2">{'='.repeat(Math.min(config.chars_per_line, 48))}</div>

          {/* Totals */}
          <div className={`${getFontSizeClass(config.font_sizes.totals)} ${getFormatClasses("totals")} space-y-1`}>
            {mockOrder.delivery_fee > 0 && (
              <>
                <div>Subtotal: R$ {(mockOrder.total - mockOrder.delivery_fee).toFixed(2)}</div>
                <div>Taxa Entrega: R$ {mockOrder.delivery_fee.toFixed(2)}</div>
              </>
            )}
            <div>TOTAL: R$ {mockOrder.total.toFixed(2)}</div>
          </div>

          {/* Payment Method */}
          {config.show_payment_method && (
            <div className={`${getFontSizeClass(config.font_sizes.item_details)} mt-2`}>
              Pagamento: {mockOrder.payment_method}
            </div>
          )}

          {/* Order Observations */}
          {config.show_order_observations && mockOrder.observations && (
            <div className={`${getFontSizeClass(config.font_sizes.item_details)} mt-2`}>
              <div className="font-bold">OBSERVAÇÕES:</div>
              <div>{mockOrder.observations}</div>
            </div>
          )}

          {/* Footer */}
          {config.show_footer_message && config.footer_message && (
            <div className={`${getFontSizeClass(config.font_sizes.item_details)} ${getFormatClasses("footer")} mt-4`}>
              {config.footer_message}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
