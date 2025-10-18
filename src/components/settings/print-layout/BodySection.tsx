import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { DraggableField } from './DraggableField';
import type { SectionConfig, PrintTag, PrintElement, SeparatorType, ExtendedLayoutConfig } from '@/types/printer-layout-extended';
import { TAG_METADATA } from '@/types/printer-layout-extended';

interface BodySectionProps {
  config: SectionConfig;
  layoutConfig: ExtendedLayoutConfig;
  onChange: (config: SectionConfig) => void;
  onLayoutChange: (updates: Partial<ExtendedLayoutConfig>) => void;
}

const AVAILABLE_TAGS: PrintTag[] = [
  '{numero_pedido}',
  '{data_hora}',
  '{origem_pedido}',
  '{nome_cliente}',
  '{telefone_cliente}',
  '{endereco_cliente}'
];

export function BodySection({ config, layoutConfig, onChange, onLayoutChange }: BodySectionProps) {
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = config.elements.findIndex(el => el.id === active.id);
    const newIndex = config.elements.findIndex(el => el.id === over.id);
    
    const newElements = arrayMove(config.elements, oldIndex, newIndex).map((el, idx) => ({
      ...el,
      order: idx + 1
    }));

    onChange({ ...config, elements: newElements });
  };

  const handleUpdateElement = (id: string, updates: Partial<PrintElement>) => {
    const newElements = config.elements.map(el =>
      el.id === id ? { ...el, ...updates } : el
    );
    onChange({ ...config, elements: newElements });
  };

  const handleRemoveElement = (id: string) => {
    const newElements = config.elements
      .filter(el => el.id !== id)
      .map((el, idx) => ({ ...el, order: idx + 1 }));
    onChange({ ...config, elements: newElements });
  };

  const handleAddField = (tag: PrintTag) => {
    const newElement: PrintElement = {
      id: `b${Date.now()}`,
      tag,
      label: TAG_METADATA[tag].label,
      visible: true,
      formatting: { bold: false, underline: false, align: 'left' },
      fontSize: 'medium',
      order: config.elements.length + 1
    };
    onChange({ ...config, elements: [...config.elements, newElement] });
  };

  const usedTags = config.elements.map(el => el.tag);
  const availableTags = AVAILABLE_TAGS.filter(tag => !usedTags.includes(tag));

  return (
    <Tabs defaultValue="customer" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="customer">Cliente</TabsTrigger>
        <TabsTrigger value="items">Itens</TabsTrigger>
        <TabsTrigger value="totals">Totais</TabsTrigger>
      </TabsList>

      <TabsContent value="customer" className="space-y-4 mt-4">
        <div>
          <h3 className="text-sm font-semibold mb-3">Informações do Cliente</h3>
          <DndContext onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
            <SortableContext items={config.elements.map(el => el.id)} strategy={verticalListSortingStrategy}>
              {config.elements.map(element => (
                <DraggableField
                  key={element.id}
                  element={element}
                  onUpdate={handleUpdateElement}
                  onRemove={handleRemoveElement}
                  tagMetadata={TAG_METADATA}
                />
              ))}
            </SortableContext>
          </DndContext>

          {availableTags.length > 0 && (
            <Select onValueChange={(value) => handleAddField(value as PrintTag)}>
              <SelectTrigger className="mt-2">
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  <span className="text-sm">Adicionar Campo</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                {availableTags.map(tag => (
                  <SelectItem key={tag} value={tag}>
                    <div className="flex items-center gap-2">
                      <span>{TAG_METADATA[tag].icon}</span>
                      <span>{TAG_METADATA[tag].label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="pt-4 border-t space-y-3">
          <div className="flex items-center justify-between">
            <Label>Mostrar Separador</Label>
            <Switch
              checked={config.separator.show}
              onCheckedChange={(checked) =>
                onChange({ ...config, separator: { ...config.separator, show: checked } })
              }
            />
          </div>

          {config.separator.show && (
            <div className="space-y-2">
              <Label className="text-xs">Tipo de Separador</Label>
              <Select
                value={config.separator.type}
                onValueChange={(value) =>
                  onChange({
                    ...config,
                    separator: {
                      ...config.separator,
                      type: value as SeparatorType,
                      char: value === 'line' ? '-' : value === 'dots' ? '.' : '='
                    }
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="line">Linha (----)</SelectItem>
                  <SelectItem value="dots">Pontilhado (....)</SelectItem>
                  <SelectItem value="equals">Igual (====)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="items" className="space-y-4 mt-4">
        <div className="space-y-4">
          <div>
            <Label>Formato de Quantidade</Label>
            <RadioGroup
              value={layoutConfig.item_quantity_format}
              onValueChange={(value) => onLayoutChange({ item_quantity_format: value as '2x' | 'Qtd: 2' })}
              className="mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="2x" id="qty-2x" />
                <Label htmlFor="qty-2x">2x Produto (compacto)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Qtd: 2" id="qty-label" />
                <Label htmlFor="qty-label">Qtd: 2 - Produto (descritivo)</Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label>Posição do Preço</Label>
            <RadioGroup
              value={layoutConfig.item_price_position}
              onValueChange={(value) => onLayoutChange({ item_price_position: value as 'same_line' | 'next_line' })}
              className="mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="next_line" id="price-next" />
                <Label htmlFor="price-next">Linha seguinte</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="same_line" id="price-same" />
                <Label htmlFor="price-same">Mesma linha (direita)</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex items-center justify-between">
            <Label>Mostrar Extras/Adicionais</Label>
            <Switch
              checked={layoutConfig.show_item_extras}
              onCheckedChange={(checked) => onLayoutChange({ show_item_extras: checked })}
            />
          </div>

          {layoutConfig.show_item_extras && (
            <div className="space-y-2">
              <Label className="text-xs">Prefixo dos Extras</Label>
              <Input
                value={layoutConfig.item_extras_prefix}
                onChange={(e) => onLayoutChange({ item_extras_prefix: e.target.value })}
                placeholder="+ "
                maxLength={5}
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <Label>Mostrar Observações do Item</Label>
            <Switch
              checked={layoutConfig.show_item_observations}
              onCheckedChange={(checked) => onLayoutChange({ show_item_observations: checked })}
            />
          </div>

          {layoutConfig.show_item_observations && (
            <div className="space-y-2">
              <Label className="text-xs">Prefixo das Observações</Label>
              <Input
                value={layoutConfig.item_observations_prefix}
                onChange={(e) => onLayoutChange({ item_observations_prefix: e.target.value })}
                placeholder="Obs: "
                maxLength={10}
              />
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="totals" className="space-y-4 mt-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Mostrar Subtotal</Label>
            <Switch
              checked={layoutConfig.show_subtotal}
              onCheckedChange={(checked) => onLayoutChange({ show_subtotal: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Mostrar Taxa de Entrega</Label>
            <Switch
              checked={layoutConfig.show_delivery_fee}
              onCheckedChange={(checked) => onLayoutChange({ show_delivery_fee: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Mostrar Forma de Pagamento</Label>
            <Switch
              checked={layoutConfig.show_payment_method}
              onCheckedChange={(checked) => onLayoutChange({ show_payment_method: checked })}
            />
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
