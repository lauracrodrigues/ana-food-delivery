import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Eye, EyeOff, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { UnifiedPrintElement, FontSize } from '@/types/printer-layout-extended';

interface UnifiedFieldCardProps {
  element: UnifiedPrintElement;
  onUpdate: (updated: Partial<UnifiedPrintElement>) => void;
  onRemove: () => void;
}

export function UnifiedFieldCard({ element, onUpdate, onRemove }: UnifiedFieldCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: element.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const fontSizeLabels: Record<FontSize, string> = {
    small: 'Pequeno',
    medium: 'Médio',
    large: 'Grande',
    xlarge: 'Muito Grande'
  };

  const alignLabels = {
    left: 'Esquerda',
    center: 'Centro',
    right: 'Direita'
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="p-4 mb-2">
        <div className="flex items-start gap-3">
          {/* Drag Handle */}
          <button
            className="cursor-grab active:cursor-grabbing mt-1 text-muted-foreground hover:text-foreground"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-5 w-5" />
          </button>

          {/* Conteúdo */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{element.order}. {element.label}</span>
                <code className="text-xs bg-muted px-2 py-1 rounded">{element.tag}</code>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={element.visible}
                  onCheckedChange={(checked) => onUpdate({ visible: checked })}
                />
                {element.visible ? (
                  <Eye className="h-4 w-4 text-green-600" />
                ) : (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>

            {/* Controles de formatação */}
            <div className="grid grid-cols-3 gap-2">
              {/* Tamanho da fonte */}
              <Select
                value={element.fontSize}
                onValueChange={(value) => onUpdate({ fontSize: value as FontSize })}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(fontSizeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Alinhamento */}
              <Select
                value={element.formatting.align}
                onValueChange={(value) => onUpdate({ 
                  formatting: { ...element.formatting, align: value as 'left' | 'center' | 'right' }
                })}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(alignLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Botões de estilo */}
              <div className="flex gap-1">
                <Button
                  variant={element.formatting.bold ? "default" : "outline"}
                  size="sm"
                  className="h-8 w-full font-bold"
                  onClick={() => onUpdate({
                    formatting: { ...element.formatting, bold: !element.formatting.bold }
                  })}
                >
                  B
                </Button>
                <Button
                  variant={element.formatting.underline ? "default" : "outline"}
                  size="sm"
                  className="h-8 w-full underline"
                  onClick={() => onUpdate({
                    formatting: { ...element.formatting, underline: !element.formatting.underline }
                  })}
                >
                  U
                </Button>
              </div>
            </div>

            {/* Separador abaixo */}
            <div className="flex items-center gap-2 pt-2 border-t">
              <Switch
                checked={element.separator_below.show}
                onCheckedChange={(checked) => onUpdate({
                  separator_below: { ...element.separator_below, show: checked }
                })}
                id={`separator-${element.id}`}
              />
              <label htmlFor={`separator-${element.id}`} className="text-xs text-muted-foreground">
                Separador abaixo
              </label>
              {element.separator_below.show && (
                <Select
                  value={element.separator_below.char}
                  onValueChange={(value) => onUpdate({
                    separator_below: { ...element.separator_below, char: value }
                  })}
                >
                  <SelectTrigger className="h-7 w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-">-</SelectItem>
                    <SelectItem value="=">=</SelectItem>
                    <SelectItem value=".">.</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Botão remover */}
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
