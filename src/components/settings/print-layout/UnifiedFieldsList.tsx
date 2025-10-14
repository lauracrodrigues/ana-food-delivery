import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { UnifiedFieldCard } from './UnifiedFieldCard';
import type { ExtendedLayoutConfig, UnifiedPrintElement, PrintTag } from '@/types/printer-layout-extended';

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

  const handleAddField = () => {
    const newElement: UnifiedPrintElement = {
      id: `custom_${Date.now()}`,
      tag: '{nome_empresa}' as PrintTag,
      label: 'Novo Campo',
      visible: true,
      order: elements.length + 1,
      formatting: { bold: false, underline: false, align: 'left' },
      fontSize: 'medium',
      separator_below: { show: false, type: 'line', char: '-' }
    };

    onChange({ ...config, elements: [...elements, newElement] });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Campos do Cupom</h3>
          <p className="text-sm text-muted-foreground">
            Arraste para reordenar os campos na impressão
          </p>
        </div>
        <Button onClick={handleAddField} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Campo
        </Button>
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
                  onUpdate={(updates) => handleUpdateElement(element.id, updates)}
                  onRemove={() => handleRemoveElement(element.id)}
                />
              ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="bg-muted/50 border border-dashed rounded-lg p-4 text-sm text-muted-foreground">
        <p className="font-medium mb-1">ℹ️ Nota:</p>
        <p>Os itens do pedido são fixos e aparecem após os campos configuráveis acima.</p>
      </div>
    </div>
  );
}
