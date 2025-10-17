import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { AlignLeft, AlignCenter, AlignRight, Pencil } from "lucide-react";
import type { UnifiedPrintElement, FontSize } from "@/types/printer-layout-extended";

interface FloatingToolbarProps {
  element: UnifiedPrintElement;
  onUpdate: (updates: Partial<UnifiedPrintElement>) => void;
  onEditContent?: () => void;
  isEditable: boolean;
}

export function FloatingToolbar({ element, onUpdate, onEditContent, isEditable }: FloatingToolbarProps) {
  return (
    <div className="absolute -top-14 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="bg-popover border rounded-lg shadow-lg p-2 flex gap-1 items-center">
        {/* Botões de tamanho */}
        <ToggleGroup 
          type="single" 
          value={element.fontSize} 
          onValueChange={(v) => v && onUpdate({ fontSize: v as FontSize })}
        >
          <ToggleGroupItem value="small" className="h-8 px-2 text-xs">
            P
          </ToggleGroupItem>
          <ToggleGroupItem value="medium" className="h-8 px-2 text-sm">
            M
          </ToggleGroupItem>
          <ToggleGroupItem value="large" className="h-8 px-2">
            G
          </ToggleGroupItem>
          <ToggleGroupItem value="xlarge" className="h-8 px-2 text-lg">
            GG
          </ToggleGroupItem>
        </ToggleGroup>
        
        <Separator orientation="vertical" className="h-6" />
        
        {/* Alinhamento */}
        <ToggleGroup 
          type="single" 
          value={element.formatting.align} 
          onValueChange={(v) => v && onUpdate({ formatting: { ...element.formatting, align: v as any }})}
        >
          <ToggleGroupItem value="left" className="h-8 px-2">
            <AlignLeft className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="center" className="h-8 px-2">
            <AlignCenter className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="right" className="h-8 px-2">
            <AlignRight className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
        
        <Separator orientation="vertical" className="h-6" />
        
        {/* Bold/Underline */}
        <Button
          size="sm"
          variant={element.formatting.bold ? "default" : "ghost"}
          className="h-8 w-8 p-0 font-bold"
          onClick={() => onUpdate({ formatting: { ...element.formatting, bold: !element.formatting.bold }})}
        >
          B
        </Button>
        <Button
          size="sm"
          variant={element.formatting.underline ? "default" : "ghost"}
          className="h-8 w-8 p-0 underline"
          onClick={() => onUpdate({ formatting: { ...element.formatting, underline: !element.formatting.underline }})}
        >
          U
        </Button>
        
        {/* Editar texto (apenas para campos editáveis) */}
        {isEditable && (
          <>
            <Separator orientation="vertical" className="h-6" />
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-8 w-8 p-0" 
              onClick={onEditContent}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
