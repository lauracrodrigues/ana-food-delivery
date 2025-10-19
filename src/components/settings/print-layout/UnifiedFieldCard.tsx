import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Eye, EyeOff, Trash2, Type } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { UnifiedPrintElement, FontSize } from '@/types/printer-layout-extended';

interface UnifiedFieldCardProps {
  element: UnifiedPrintElement;
  onUpdate: (updated: Partial<UnifiedPrintElement>) => void;
  onRemove: () => void;
  disableRemove?: boolean;
  disableVisibilityToggle?: boolean;
}

export function UnifiedFieldCard({ element, onUpdate, onRemove, disableRemove = false, disableVisibilityToggle = false }: UnifiedFieldCardProps) {
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
    small: 'P',
    medium: 'M',
    large: 'G',
    xlarge: 'GG'
  };

  const alignLabels = {
    left: '←',
    center: '↔',
    right: '→'
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="p-1.5 mb-1.5">
        <div className="flex items-start gap-1.5">
          {/* Drag Handle */}
          <button
            className="cursor-grab active:cursor-grabbing mt-0.5 text-muted-foreground hover:text-foreground"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>

          {/* Conteúdo */}
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="font-medium text-[10px]">{element.order}. {element.label}</span>
                <code className="text-[9px] bg-muted px-1 py-0.5 rounded">{element.tag}</code>
              </div>
              <div className="flex items-center gap-1">
                <Switch
                  className="scale-75"
                  checked={element.visible}
                  onCheckedChange={(checked) => onUpdate({ visible: checked })}
                  disabled={disableVisibilityToggle}
                />
                {element.visible ? (
                  <Eye className="h-2.5 w-2.5 text-green-600" />
                ) : (
                  <EyeOff className="h-2.5 w-2.5 text-muted-foreground" />
                )}
              </div>
            </div>

            {/* Controles de formatação */}
            <div className="grid grid-cols-4 gap-1">
              {/* Tamanho */}
              <Select
                value={element.fontSize}
                onValueChange={(value) => onUpdate({ fontSize: value as FontSize })}
              >
                <SelectTrigger className="h-6 text-[10px] py-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(fontSizeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value} className="text-xs">{label}</SelectItem>
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
                <SelectTrigger className="h-6 text-[10px] py-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(alignLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value} className="text-xs">{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Bold/Underline */}
              <div className="flex gap-0.5">
                <Button
                  variant={element.formatting.bold ? "default" : "outline"}
                  size="sm"
                  className="h-6 w-full font-bold text-[10px] p-0"
                  onClick={() => onUpdate({
                    formatting: { ...element.formatting, bold: !element.formatting.bold }
                  })}
                >
                  B
                </Button>
                <Button
                  variant={element.formatting.underline ? "default" : "outline"}
                  size="sm"
                  className="h-6 w-full underline text-[10px] p-0"
                  onClick={() => onUpdate({
                    formatting: { ...element.formatting, underline: !element.formatting.underline }
                  })}
                >
                  U
                </Button>
              </div>

              {/* Prefix/Suffix */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={element.prefix || element.suffix ? "default" : "outline"}
                    size="sm"
                    className="h-6 text-[10px] p-0"
                  >
                    <Type className="h-3 w-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3" side="right">
                  <div className="space-y-2">
                    <Label className="text-xs">Texto Antes</Label>
                    <Input
                      value={element.prefix || ''}
                      onChange={(e) => onUpdate({ prefix: e.target.value })}
                      placeholder="Ex: Tel: "
                      className="h-7 text-xs"
                    />
                    <Label className="text-xs">Texto Depois</Label>
                    <Input
                      value={element.suffix || ''}
                      onChange={(e) => onUpdate({ suffix: e.target.value })}
                      placeholder="Ex: (WhatsApp)"
                      className="h-7 text-xs"
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Separador */}
            <div className="flex items-center gap-1 pt-0.5 border-t">
              <Switch
                className="scale-75"
                checked={element.separator_below.show}
                onCheckedChange={(checked) => onUpdate({
                  separator_below: { ...element.separator_below, show: checked }
                })}
                id={`sep-${element.id}`}
              />
              <label htmlFor={`sep-${element.id}`} className="text-[9px] text-muted-foreground">Sep</label>
              {element.separator_below.show && (
                <Select
                  value={element.separator_below.char}
                  onValueChange={(value) => onUpdate({
                    separator_below: { ...element.separator_below, char: value }
                  })}
                >
                  <SelectTrigger className="h-5 w-12 text-[9px] py-0">
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
          {!disableRemove && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10 h-6 w-6 p-0"
              onClick={onRemove}
            >
              <Trash2 className="h-2.5 w-2.5" />
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
