import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { UnifiedFieldCard } from './UnifiedFieldCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ExtendedLayoutConfig, UnifiedPrintElement, PrintTag } from '@/types/printer-layout-extended';
import { TAG_METADATA } from '@/types/printer-layout-extended';

interface UnifiedFieldsListProps {
  config: ExtendedLayoutConfig;
  onChange: (config: ExtendedLayoutConfig) => void;
}

export function UnifiedFieldsList({ config, onChange }: UnifiedFieldsListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Converter estrutura antiga para nova se necessário
  const getElements = (): UnifiedPrintElement[] => {
    if (config.elements && config.elements.length > 0) {
      return config.elements;
    }

    // Converter de header/body/footer para elements
    const elements: UnifiedPrintElement[] = [];
    let order = 1;

    // Header
    config.header.elements.forEach(el => {
      elements.push({
        ...el,
        order: order++,
        separator_below: { show: false, type: 'line', char: '-' }
      });
    });
    if (config.header.separator.show && elements.length > 0) {
      elements[elements.length - 1].separator_below = config.header.separator;
    }

    // Body
    config.body.elements.forEach(el => {
      elements.push({
        ...el,
        order: order++,
        separator_below: { show: false, type: 'line', char: '-' }
      });
    });
    if (config.body.separator.show && elements.length > 0) {
      elements[elements.length - 1].separator_below = config.body.separator;
    }

    // Footer
    config.footer.elements.forEach(el => {
      elements.push({
        ...el,
        order: order++,
        separator_below: { show: false, type: 'line', char: '-' }
      });
    });

    return elements;
  };

  const elements = getElements();

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = elements.findIndex(el => el.id === active.id);
      const newIndex = elements.findIndex(el => el.id === over.id);

      const reordered = arrayMove(elements, oldIndex, newIndex).map((el, idx) => ({
        ...el,
        order: idx + 1
      }));

      onChange({ ...config, elements: reordered });
    }
  };

  const handleUpdateElement = (id: string, updates: Partial<UnifiedPrintElement>) => {
    const updated = elements.map(el =>
      el.id === id ? { ...el, ...updates } : el
    );
    onChange({ ...config, elements: updated });
  };

  const handleRemoveElement = (id: string) => {
    const filtered = elements.filter(el => el.id !== id).map((el, idx) => ({
      ...el,
      order: idx + 1
    }));
    onChange({ ...config, elements: filtered });
  };

  // Obter todos os PrintTags disponíveis
  const allTags = Object.keys(TAG_METADATA) as PrintTag[];
  
  // Filtrar tags já utilizadas
  const usedTags = elements.map(el => el.tag);
  const availableTags = allTags.filter(tag => !usedTags.includes(tag));

  const handleAddField = (tag: PrintTag) => {
    const metadata = TAG_METADATA[tag];
    const newElement: UnifiedPrintElement = {
      id: `field_${Date.now()}`,
      tag: tag,
      label: metadata.label,
      visible: true,
      order: elements.length + 1,
      formatting: { bold: false, underline: false, align: 'left' },
      fontSize: 'medium',
      separator_below: { show: false, type: 'line', char: '-' }
    };

    onChange({ ...config, elements: [...elements, newElement] });
  };

  // Garantir que o campo {itens} sempre esteja presente e visível
  const hasItemsField = elements.some(el => el.tag === '{itens}');
  if (!hasItemsField && elements.length > 0) {
    const itemsMetadata = TAG_METADATA['{itens}'];
    const itemsElement: UnifiedPrintElement = {
      id: 'items_field',
      tag: '{itens}',
      label: itemsMetadata.label,
      visible: true,
      order: elements.length + 1,
      formatting: { bold: false, underline: false, align: 'left' },
      fontSize: 'medium',
      separator_below: { show: false, type: 'line', char: '-' }
    };
    onChange({ ...config, elements: [...elements, itemsElement] });
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Campos do Cupom</h3>
        <p className="text-sm text-muted-foreground">
          Arraste para reordenar os campos na impressão
        </p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={elements.map(el => el.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {elements
              .sort((a, b) => a.order - b.order)
              .map(element => (
                <UnifiedFieldCard
                  key={element.id}
                  element={element}
                  onUpdate={(updates) => {
                    // Garantir que o campo {itens} sempre fique visível
                    if (element.tag === '{itens}' && updates.visible === false) {
                      return;
                    }
                    handleUpdateElement(element.id, updates);
                  }}
                  onRemove={() => {
                    // Não permitir remover o campo {itens}
                    if (element.tag === '{itens}') {
                      return;
                    }
                    handleRemoveElement(element.id);
                  }}
                  disableRemove={element.tag === '{itens}'}
                  disableVisibilityToggle={element.tag === '{itens}'}
                />
              ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Adicionar novo campo - aparece depois dos campos existentes */}
      {availableTags.length > 0 && (
        <div className="pt-4 border-t">
          <div className="flex items-center gap-3">
            <Select onValueChange={(value) => handleAddField(value as PrintTag)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Adicionar novo campo..." />
              </SelectTrigger>
              <SelectContent>
                {availableTags.map(tag => {
                  const metadata = TAG_METADATA[tag];
                  return (
                    <SelectItem key={tag} value={tag}>
                      <span className="flex items-center gap-2">
                        <span>{metadata.icon}</span>
                        <span>{metadata.label}</span>
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="bg-muted/50 border border-dashed rounded-lg p-4 text-sm text-muted-foreground">
        <p className="font-medium mb-1">ℹ️ Nota:</p>
        <p>O campo "Itens do Pedido" é obrigatório e não pode ser removido ou desabilitado.</p>
      </div>
    </div>
  );
}
