import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DraggableField } from './DraggableField';
import type { SectionConfig, PrintTag, PrintElement, SeparatorType } from '@/types/printer-layout-extended';
import { TAG_METADATA } from '@/types/printer-layout-extended';

interface HeaderSectionProps {
  config: SectionConfig;
  onChange: (config: SectionConfig) => void;
}

const AVAILABLE_TAGS: PrintTag[] = [
  '{nome_empresa}',
  '{logo}',
  '{telefone}',
  '{endereco}'
];

export function HeaderSection({ config, onChange }: HeaderSectionProps) {
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
      id: `h${Date.now()}`,
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
        <h3 className="text-sm font-semibold mb-3">Campos do Cabeçalho</h3>
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
    </div>
  );
}
