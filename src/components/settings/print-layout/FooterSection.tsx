import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DraggableField } from './DraggableField';
import type { SectionConfig, PrintTag, PrintElement, SeparatorType, ExtendedLayoutConfig } from '@/types/printer-layout-extended';
import { TAG_METADATA } from '@/types/printer-layout-extended';

interface FooterSectionProps {
  config: SectionConfig;
  layoutConfig: ExtendedLayoutConfig;
  onChange: (config: SectionConfig) => void;
  onLayoutChange: (updates: Partial<ExtendedLayoutConfig>) => void;
}

const AVAILABLE_TAGS: PrintTag[] = [
  '{observacoes_pedido}',
  '{mensagem_rodape}'
];

export function FooterSection({ config, layoutConfig, onChange, onLayoutChange }: FooterSectionProps) {
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
      id: `f${Date.now()}`,
      tag,
      label: TAG_METADATA[tag].label,
      visible: true,
      formatting: { bold: false, underline: false, align: 'center' },
      fontSize: 'medium',
      order: config.elements.length + 1
    };
    onChange({ ...config, elements: [...config.elements, newElement] });
  };

  const usedTags = config.elements.map(el => el.tag);
  const availableTags = AVAILABLE_TAGS.filter(tag => !usedTags.includes(tag));

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold mb-3">Campos do Rodapé</h3>
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

      <div className="pt-4 border-t space-y-4">
        <div className="space-y-2">
          <Label>Mensagem Personalizada</Label>
          <Textarea
            value={layoutConfig.footer_message}
            onChange={(e) => onLayoutChange({ footer_message: e.target.value })}
            placeholder="Ex: Obrigado pela preferência!"
            rows={3}
            maxLength={200}
          />
          <p className="text-xs text-muted-foreground">
            {layoutConfig.footer_message.length}/200 caracteres
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Linhas extras antes do corte</Label>
            <span className="text-sm font-medium">{layoutConfig.extra_feed_lines}</span>
          </div>
          <Slider
            value={[layoutConfig.extra_feed_lines]}
            onValueChange={([value]) => onLayoutChange({ extra_feed_lines: value })}
            min={0}
            max={10}
            step={1}
          />
          <p className="text-xs text-muted-foreground">
            Espaço em branco antes de cortar o papel
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Cortar papel automaticamente</Label>
            <p className="text-xs text-muted-foreground">
              Envia comando de corte para a impressora
            </p>
          </div>
          <Switch
            checked={layoutConfig.auto_cut}
            onCheckedChange={(checked) => onLayoutChange({ auto_cut: checked })}
          />
        </div>
      </div>
    </div>
  );
}
