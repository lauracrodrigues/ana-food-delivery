import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Eye, EyeOff, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { PrintElement, FontSize, TAG_METADATA } from '@/types/printer-layout-extended';

interface DraggableFieldProps {
  element: PrintElement;
  onUpdate: (id: string, updates: Partial<PrintElement>) => void;
  onRemove: (id: string) => void;
  tagMetadata: typeof TAG_METADATA;
}

export function DraggableField({ element, onUpdate, onRemove, tagMetadata }: DraggableFieldProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: element.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const metadata = tagMetadata[element.tag];

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={`mb-2 ${!element.visible ? 'opacity-50' : ''}`}>
        <CardContent className="p-3">
          <div className="flex items-start gap-3">
            {/* Drag Handle */}
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing mt-1"
            >
              <GripVertical className="h-5 w-5 text-muted-foreground" />
            </div>

            {/* Content */}
            <div className="flex-1 space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{metadata.icon}</span>
                  <span className="font-medium text-sm">{metadata.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={element.visible}
                    onCheckedChange={(checked) => onUpdate(element.id, { visible: checked })}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemove(element.id)}
                    className="h-8 w-8"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Controls */}
              {element.visible && (
                <div className="grid grid-cols-2 gap-3">
                  {/* Font Size */}
                  <div className="space-y-1">
                    <Label className="text-xs">Tamanho</Label>
                    <Select
                      value={element.fontSize}
                      onValueChange={(value) => onUpdate(element.id, { fontSize: value as FontSize })}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Pequeno</SelectItem>
                        <SelectItem value="medium">Médio</SelectItem>
                        <SelectItem value="large">Grande</SelectItem>
                        <SelectItem value="xlarge">Extra Grande</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Alignment */}
                  <div className="space-y-1">
                    <Label className="text-xs">Alinhamento</Label>
                    <RadioGroup
                      value={element.formatting.align}
                      onValueChange={(value) => 
                        onUpdate(element.id, { 
                          formatting: { ...element.formatting, align: value as 'left' | 'center' | 'right' }
                        })
                      }
                      className="flex gap-2"
                    >
                      <div className="flex items-center">
                        <RadioGroupItem value="left" id={`${element.id}-left`} className="sr-only" />
                        <Label 
                          htmlFor={`${element.id}-left`}
                          className={`cursor-pointer px-2 py-1 text-xs rounded border ${
                            element.formatting.align === 'left' ? 'bg-primary text-primary-foreground' : 'bg-background'
                          }`}
                        >
                          ←
                        </Label>
                      </div>
                      <div className="flex items-center">
                        <RadioGroupItem value="center" id={`${element.id}-center`} className="sr-only" />
                        <Label 
                          htmlFor={`${element.id}-center`}
                          className={`cursor-pointer px-2 py-1 text-xs rounded border ${
                            element.formatting.align === 'center' ? 'bg-primary text-primary-foreground' : 'bg-background'
                          }`}
                        >
                          ↔
                        </Label>
                      </div>
                      <div className="flex items-center">
                        <RadioGroupItem value="right" id={`${element.id}-right`} className="sr-only" />
                        <Label 
                          htmlFor={`${element.id}-right`}
                          className={`cursor-pointer px-2 py-1 text-xs rounded border ${
                            element.formatting.align === 'right' ? 'bg-primary text-primary-foreground' : 'bg-background'
                          }`}
                        >
                          →
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Bold & Underline */}
                  <div className="col-span-2 flex gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`${element.id}-bold`}
                        checked={element.formatting.bold}
                        onCheckedChange={(checked) =>
                          onUpdate(element.id, {
                            formatting: { ...element.formatting, bold: !!checked }
                          })
                        }
                      />
                      <Label htmlFor={`${element.id}-bold`} className="text-xs font-bold">
                        Negrito
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`${element.id}-underline`}
                        checked={element.formatting.underline}
                        onCheckedChange={(checked) =>
                          onUpdate(element.id, {
                            formatting: { ...element.formatting, underline: !!checked }
                          })
                        }
                      />
                      <Label htmlFor={`${element.id}-underline`} className="text-xs underline">
                        Sublinhado
                      </Label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
