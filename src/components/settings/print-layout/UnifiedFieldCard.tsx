import { forwardRef, useImperativeHandle, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Type } from 'lucide-react';
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
  isHighlighted?: boolean;
}

export interface UnifiedFieldCardRef {
  scrollIntoView: () => void;
}

export const UnifiedFieldCard = forwardRef<UnifiedFieldCardRef, UnifiedFieldCardProps>(
  function UnifiedFieldCard({ element, onUpdate, onRemove, disableRemove = false, disableVisibilityToggle = false, isHighlighted = false }, ref) {
    const cardRef = useRef<HTMLDivElement>(null);
    
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging
    } = useSortable({ id: element.id });

    useImperativeHandle(ref, () => ({
      scrollIntoView: () => {
        cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }));

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
        <div ref={cardRef}>
          <Card className={`p-1 mb-1 transition-all ${isHighlighted ? 'ring-2 ring-primary bg-primary/5 animate-pulse' : ''}`}>
            <div className="flex items-start gap-1">
              {/* Drag Handle */}
              <button
                className="cursor-grab active:cursor-grabbing mt-0.5 text-muted-foreground hover:text-foreground"
                {...attributes}
                {...listeners}
              >
                <GripVertical className="h-3.5 w-3.5" />
              </button>

              {/* Conteúdo */}
              <div className="flex-1 space-y-0.5">
                {/* Header: Switch + Nome + Tag + Botão Remover */}
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1 flex-1">
                    {/* Switch à esquerda */}
                    <Switch
                      className="scale-[0.6]"
                      checked={element.visible}
                      onCheckedChange={(checked) => onUpdate({ visible: checked })}
                      disabled={disableVisibilityToggle}
                    />
                    <span className="font-medium text-[9px]">{element.order}. {element.label}</span>
                    <code className="text-[8px] bg-muted px-0.5 py-0.5 rounded">{element.tag}</code>
                  </div>
                  {/* Botão remover no canto direito */}
                  {!disableRemove && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 h-5 w-5 p-0"
                      onClick={onRemove}
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </Button>
                  )}
                </div>

                {/* Controles de formatação + Separador */}
                <div className="grid grid-cols-5 gap-0.5">
                  {/* Tamanho */}
                  <Select
                    value={element.fontSize}
                    onValueChange={(value) => onUpdate({ fontSize: value as FontSize })}
                  >
                    <SelectTrigger className="h-5 text-[9px] py-0">
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
                    <SelectTrigger className="h-5 text-[9px] py-0">
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
                      className="h-5 w-full font-bold text-[9px] p-0"
                      onClick={() => onUpdate({
                        formatting: { ...element.formatting, bold: !element.formatting.bold }
                      })}
                    >
                      B
                    </Button>
                    <Button
                      variant={element.formatting.underline ? "default" : "outline"}
                      size="sm"
                      className="h-5 w-full underline text-[9px] p-0"
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
                        className="h-5 text-[9px] p-0"
                      >
                        <Type className="h-2.5 w-2.5" />
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

                  {/* Separador integrado */}
                  <Select
                    value={element.separator_below.show ? element.separator_below.char : 'none'}
                    onValueChange={(value) => {
                      if (value === 'none') {
                        onUpdate({ separator_below: { ...element.separator_below, show: false } });
                      } else {
                        onUpdate({ separator_below: { show: true, type: 'line', char: value } });
                      }
                    }}
                  >
                    <SelectTrigger className="h-5 text-[9px] py-0">
                      <SelectValue placeholder="Sep" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-xs">Sem</SelectItem>
                      <SelectItem value="-" className="text-xs">-</SelectItem>
                      <SelectItem value="=" className="text-xs">=</SelectItem>
                      <SelectItem value="." className="text-xs">.</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }
);
