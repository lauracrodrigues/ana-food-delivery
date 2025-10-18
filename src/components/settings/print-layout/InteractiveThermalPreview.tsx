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

interface InteractiveThermalPreviewProps {
  config: ExtendedLayoutConfig;
  onChange: (config: ExtendedLayoutConfig) => void;
  companyData?: any;
  onTestPrint?: () => void;
  cutType?: string;
  textMode?: string;
  onCutTypeChange?: (type: string) => void;
  onTextModeChange?: (mode: string) => void;
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
      case '{telefone}':
        return `Tel: ${mockOrder.company_phone}`;
      case '{endereco}':
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
        return `Cliente: ${mockOrder.customer_name}`;
      case '{telefone_cliente}':
        return `Tel: ${mockOrder.customer_phone}`;
      case '{endereco_cliente}':
        return mockOrder.type === 'delivery' ? `End: ${mockOrder.address}` : '';
      case '{bairro}':
        return companyData?.bairro ? `Bairro: ${companyData.bairro}` : '';
      case '{cidade}':
        return companyData?.cidade ? `Cidade: ${companyData.cidade}` : '';
      case '{referencia}':
        return companyData?.referencia ? `Ref: ${companyData.referencia}` : '';
      case '{itens}':
        return '--- ITENS ---';
      case '{observacoes_pedido}':
        return mockOrder.observations ? `Obs: ${mockOrder.observations}` : '';
      case '{subtotal}':
        return `Subtotal: R$ ${(mockOrder.total - mockOrder.delivery_fee).toFixed(2)}`;
      case '{taxa_entrega}':
        return mockOrder.delivery_fee > 0 ? `Taxa Entrega: R$ ${mockOrder.delivery_fee.toFixed(2)}` : '';
      case '{total}':
        return `TOTAL: R$ ${mockOrder.total.toFixed(2)}`;
      case '{forma_pagamento}':
        return `Pagamento: ${mockOrder.payment_method}`;
      case '{totais}':
        return '--- TOTAIS ---';
      case '{mensagem_rodape}':
        return config.footer_message || 'Obrigado pela preferência!';
      default:
        return element.label || '';
    }
  };

  const renderItemsSection = () => {
    return (
      <div className="space-y-1">
        <div className="font-bold text-xs">ITENS:</div>
        {mockOrder.items.map((item, idx) => (
          <div key={idx} className="text-[10px] space-y-0.5">
            <div>{`${item.quantity}x ${item.name}`}</div>
            {item.extras?.map((extra, i) => (
              <div key={i} className="pl-2 text-muted-foreground">
                + {extra}
              </div>
            ))}
            {item.observations && (
              <div className="pl-2 text-muted-foreground italic">Obs: {item.observations}</div>
            )}
            <div className="text-right">R$ {item.price.toFixed(2)}</div>
          </div>
        ))}
      </div>
    );
  };

  const renderTotalsSection = () => {
    return (
      <div className="space-y-0.5 text-xs">
        <div className="border-t border-foreground/20 pt-1">
          {mockOrder.delivery_fee > 0 && (
            <>
              <div>Subtotal: R$ {(mockOrder.total - mockOrder.delivery_fee).toFixed(2)}</div>
              <div>Taxa de Entrega: R$ {mockOrder.delivery_fee.toFixed(2)}</div>
            </>
          )}
          <div className="font-bold text-sm">TOTAL: R$ {mockOrder.total.toFixed(2)}</div>
          <div>Pagamento: {mockOrder.payment_method}</div>
        </div>
      </div>
    );
  };

  const getTextModeClass = () => {
    const modes = {
      condensed: 'tracking-tighter',
      normal: 'tracking-normal',
      expanded: 'tracking-wide',
    };
    return modes[textMode as keyof typeof modes] || modes.normal;
  };

  const visibleElements = (config?.elements || [])
    .filter((el) => el.visible)
    .sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-4">
      {/* Preview interativo */}
      <Card className="bg-muted/30">
        <CardContent className="p-6">
          <div className="bg-[#F5E6D3] shadow-lg mx-auto rounded-sm overflow-visible" style={{ width: '480px' }}>
            <div className={`font-mono p-4 space-y-1 ${getTextModeClass()}`}>
              {visibleElements.map((element) => {
                const content = getElementContent(element);
                const isEditable = editableFields.includes(element.tag);

                // Handle special elements
                if (element.tag === '{itens}') {
                  return <div key={element.id}>{renderItemsSection()}</div>;
                }

                if (element.tag === '{totais}') {
                  return <div key={element.id}>{renderTotalsSection()}</div>;
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
                    onSelect={() => setSelectedElementId(element.id)}
                    isEditable={isEditable}
                  />
                );
              })}
            </div>
          </div>

          {/* Info */}
          <div className="mt-4 text-xs text-muted-foreground text-center space-y-1">
            <p>Clique em qualquer elemento para editá-lo</p>
            <p>Passe o mouse para ver opções de formatação</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
