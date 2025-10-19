import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Printer } from "lucide-react";
import { EditablePreviewElement } from "./EditablePreviewElement";
import type { ExtendedLayoutConfig } from "@/types/printer-layout-extended";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatCurrency, formatCurrencyValue } from "@/lib/currency-formatter";

interface InteractiveThermalPreviewProps {
  config: ExtendedLayoutConfig;
  onChange: (config: ExtendedLayoutConfig) => void;
  companyData?: any;
  onTestPrint?: () => void;
  cutType?: string;
  textMode?: string;
  onCutTypeChange?: (type: string) => void;
  onTextModeChange?: (mode: string) => void;
  onFieldFocus?: (elementId: string) => void;
}

export function InteractiveThermalPreview({
  config,
  onChange,
  companyData,
  onTestPrint,
  cutType = 'partial',
  textMode = 'normal',
  onCutTypeChange,
  onTextModeChange,
  onFieldFocus,
}: InteractiveThermalPreviewProps) {
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // Helper para formatar endereço completo
  const formatAddress = (addr: any): string => {
    if (!addr) return 'Endereço não cadastrado';
    if (typeof addr === 'string') return addr;
    
    const parts = [
      addr.street && addr.number ? `${addr.street}, ${addr.number}` : addr.street,
      addr.complement,
      addr.neighborhood,
      addr.city && addr.state ? `${addr.city} - ${addr.state}` : addr.city,
      addr.zip_code ? `CEP: ${addr.zip_code}` : null
    ].filter(Boolean);
    return parts.join('\n') || 'Endereço não cadastrado';
  };

  // Mock order for preview
  const mockOrder = {
    order_number: '001',
    created_at: new Date(),
    type: 'delivery',
    source: 'whatsapp',
    customer_name: 'João Silva',
    customer_phone: '(11) 98765-4321',
    address: 'Rua das Flores, 123 - Centro',
    items: [
      {
        quantity: 2,
        name: 'Pizza Margherita G',
        price: 45.0,
        extras: ['Borda recheada', 'Catupiry extra'],
        observations: 'Sem cebola',
      },
      {
        quantity: 1,
        name: 'Refrigerante 2L',
        price: 8.0,
      },
      {
        quantity: 3,
        name: 'Pastel de Carne',
        price: 5.0,
        extras: ['Com queijo'],
      },
    ],
    delivery_fee: 5.0,
    total: 113.0,
    payment_method: 'Dinheiro',
    observations: 'Entregar na portaria',
    company_name: companyData?.fantasy_name || companyData?.name || 'EMPRESA',
    company_phone: companyData?.phone || '(11) 1234-5678',
    company_address: formatAddress(companyData?.address),
    company_email: companyData?.email || 'contato@empresa.com.br',
  };

  // Campos editáveis (textos estáticos vs variáveis)
  const editableFields = ['{mensagem_rodape}'];

  const handleUpdateElement = (elementId: string, updates: Partial<any>) => {
    const updatedElements = config.elements.map((el) =>
      el.id === elementId ? { ...el, ...updates } : el
    );
    onChange({ ...config, elements: updatedElements });
  };

  const handleContentChange = (elementId: string, newContent: string) => {
    const element = config.elements.find((el) => el.id === elementId);
    if (element?.tag === '{mensagem_rodape}') {
      onChange({ ...config, footer_message: newContent });
    }
  };

  const getElementContent = (element: any): string => {
    switch (element.tag) {
      case '{nome_empresa}':
        return mockOrder.company_name;
      case '{telefone_empresa}':
        return mockOrder.company_phone;
      case '{endereco_empresa}':
        return mockOrder.company_address;
      case '{email_empresa}':
        return `Email: ${mockOrder.company_email}`;
      case '{cnpj}':
        return companyData?.cnpj ? `CNPJ: ${companyData.cnpj}` : '';
      case '{numero_pedido}':
        return `Pedido #${mockOrder.order_number}`;
      case '{data_hora}':
        return format(mockOrder.created_at, 'dd/MM/yyyy HH:mm', { locale: ptBR });
      case '{origem_pedido}':
        return `Origem: ${mockOrder.source === 'whatsapp' ? 'WhatsApp' : 'Cardápio Digital'}`;
      case '{tipo_entrega}':
        return mockOrder.type === 'delivery' ? '🛵 ENTREGA' : '🏪 RETIRADA';
      case '{nome_cliente}':
        return mockOrder.customer_name;
      case '{telefone_cliente}':
        return mockOrder.customer_phone;
      case '{endereco_cliente}':
        return mockOrder.type === 'delivery' ? mockOrder.address : '';
      case '{referencia}':
        return companyData?.referencia ? `Ref: ${companyData.referencia}` : '';
      case '{itens}':
        return '--- ITENS ---';
      case '{observacoes_pedido}':
        return mockOrder.observations || '';
      case '{subtotal}':
        const subtotal = mockOrder.total - mockOrder.delivery_fee;
        return `Subtotal: ${formatCurrency(subtotal)}`;
      case '{taxa_entrega}':
        return mockOrder.delivery_fee > 0 ? `Taxa Entrega: ${formatCurrency(mockOrder.delivery_fee)}` : '';
      case '{total}':
        return `TOTAL: ${formatCurrency(mockOrder.total)}`;
      case '{forma_pagamento}':
        return mockOrder.payment_method;
      case '{mensagem_rodape}':
        return config.footer_message || 'Obrigado pela preferência!';
      default:
        return element.label || '';
    }
  };

  const renderItemsSection = () => {
    return (
      <div className="space-y-1">
        <div className="font-bold text-xs border-b border-foreground/20 pb-0.5">ITENS:</div>
        {mockOrder.items.map((item, idx) => (
          <div key={idx} className="text-[10px]">
            {/* Item name and price on same line with proper spacing */}
            <div className="flex justify-between items-start">
              <span className="flex-1">{`${item.quantity}x ${item.name}`}</span>
              <span className="font-mono tabular-nums ml-2">{formatCurrency(item.price * item.quantity)}</span>
            </div>
            {/* Extras */}
            {item.extras?.map((extra, i) => (
              <div key={i} className="pl-3 text-muted-foreground">
                + {extra}
              </div>
            ))}
            {/* Observations */}
            {item.observations && (
              <div className="pl-3 text-muted-foreground italic">Obs: {item.observations}</div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderTotalsSection = () => {
    const subtotal = mockOrder.total - mockOrder.delivery_fee;
    return (
      <div className="space-y-0.5 text-xs border-t border-foreground/20 pt-1">
        {mockOrder.delivery_fee > 0 && (
          <>
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-mono tabular-nums">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Taxa de Entrega:</span>
              <span className="font-mono tabular-nums">{formatCurrency(mockOrder.delivery_fee)}</span>
            </div>
          </>
        )}
        <div className="flex justify-between font-bold text-sm border-t border-foreground/20 pt-0.5 mt-0.5">
          <span>TOTAL:</span>
          <span className="font-mono tabular-nums">{formatCurrency(mockOrder.total)}</span>
        </div>
      </div>
    );
  };

  const getTextModeClass = () => {
    const modes = {
      condensed: 'scale-x-75 tracking-tighter',
      normal: 'scale-x-100 tracking-normal',
      expanded: 'scale-x-125 tracking-wide',
    };
    return modes[textMode as keyof typeof modes] || modes.normal;
  };

  const visibleElements = (config?.elements || [])
    .filter((el) => el.visible)
    .sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-4">
      {/* Preview interativo */}
      <Card className="bg-muted/30 overflow-visible">
        <CardContent className="p-6">
          <div className="max-h-[calc(100vh-20rem)] overflow-y-auto scrollbar-thin">
            <div className="bg-[#F5E6D3] shadow-lg mx-auto rounded-sm overflow-visible" style={{ width: '420px' }}>
              <div className={`font-mono p-3 space-y-0.5 origin-left ${getTextModeClass()}`}>
              {visibleElements.map((element) => {
                const content = getElementContent(element);
                const isEditable = editableFields.includes(element.tag);

                // Handle special elements
                if (element.tag === '{itens}') {
                  return <div key={element.id}>{renderItemsSection()}</div>;
                }

                if (!content) return null;

                return (
                  <EditablePreviewElement
                    key={element.id}
                    element={element}
                    content={content}
                    onUpdate={(updates) => handleUpdateElement(element.id, updates)}
                    onContentChange={(newContent) => handleContentChange(element.id, newContent)}
                    isSelected={selectedElementId === element.id}
                    onSelect={() => {
                      setSelectedElementId(element.id);
                      onFieldFocus?.(element.id);
                    }}
                    isEditable={isEditable}
                  />
                );
              })}
              </div>
            </div>
          </div>

          {/* Botão Imprimir Teste */}
          <div className="mt-4 flex justify-center">
            <Button 
              onClick={onTestPrint} 
              variant="outline" 
              size="sm"
              className="gap-2"
            >
              <Printer className="h-4 w-4" />
              Imprimir Teste
            </Button>
          </div>

          {/* Info */}
          <div className="mt-3 text-xs text-muted-foreground text-center space-y-1">
            <p>Clique em qualquer elemento para editá-lo</p>
            <p>Passe o mouse para ver opções de formatação</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
