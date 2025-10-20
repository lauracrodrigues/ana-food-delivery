import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { FloatingToolbar } from "./FloatingToolbar";
import type { UnifiedPrintElement } from "@/types/printer-layout-extended";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface EditablePreviewElementProps {
  element: UnifiedPrintElement;
  content: string;
  onUpdate: (updates: Partial<UnifiedPrintElement>) => void;
  onContentChange?: (newContent: string) => void;
  isSelected: boolean;
  onSelect: () => void;
  isEditable: boolean;
}

export function EditablePreviewElement({
  element,
  content,
  onUpdate,
  onContentChange,
  isSelected,
  onSelect,
  isEditable,
}: EditablePreviewElementProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ top: 0, left: 0 });
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const elementRef = useRef<HTMLDivElement>(null);

  const getFontSizeClass = (size: string) => {
    const sizes = {
      small: 'text-[10px]',
      medium: 'text-xs',
      large: 'text-sm',
      xlarge: 'text-base',
    };
    return sizes[size as keyof typeof sizes] || sizes.medium;
  };

  const getAlignClass = (align: string) => {
    const aligns = {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right',
    };
    return aligns[align as keyof typeof aligns] || aligns.left;
  };

  const handleContentBlur = () => {
    setIsEditingContent(false);
  };

  const isMultiline = content.length > 40 || element.tag === '{mensagem_rodape}';

  const handleMouseEnter = () => {
    setIsHovered(true);
    // Calcular posição da toolbar
    if (elementRef.current) {
      const rect = elementRef.current.getBoundingClientRect();
      setToolbarPosition({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX - 180 // Toolbar à esquerda
      });
    }
  };

  const handleMouseLeave = () => {
    const timeout = setTimeout(() => {
      setIsHovered(false);
    }, 300);
    hoverTimeoutRef.current = timeout;
  };

  const handleToolbarMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsHovered(true);
  };

  return (
    <div
      ref={elementRef}
      className="relative group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onSelect}
    >
      {/* Elemento renderizado */}
      {isEditingContent && isEditable ? (
        isMultiline ? (
          <Textarea
            value={content}
            onChange={(e) => onContentChange?.(e.target.value)}
            onBlur={handleContentBlur}
            className="min-h-[60px] font-mono text-xs"
            autoFocus
          />
        ) : (
          <Input
            value={content}
            onChange={(e) => onContentChange?.(e.target.value)}
            onBlur={handleContentBlur}
            className="font-mono text-xs"
            autoFocus
          />
        )
      ) : (
        <div
          className={`
            ${getFontSizeClass(element.fontSize)}
            ${getAlignClass(element.formatting.align)}
            ${element.formatting.bold ? 'font-bold' : ''}
            ${element.formatting.underline ? 'underline' : ''}
            ${isSelected ? 'ring-2 ring-primary bg-primary/5' : ''}
            ${isHovered ? 'bg-muted/50' : ''}
            cursor-pointer transition-all duration-150 px-2 py-1 rounded font-mono
            whitespace-pre-wrap break-words
          `}
        >
          {element.prefix && <span className="text-muted-foreground">{element.prefix}</span>}
          {content || <span className="text-muted-foreground italic">Clique para editar</span>}
          {element.suffix && <span className="text-muted-foreground">{element.suffix}</span>}
        </div>
      )}

      {/* Toolbar flutuante no hover - usando Portal */}
      {isHovered && !isEditingContent && createPortal(
        <div 
          style={{
            position: 'fixed',
            top: `${toolbarPosition.top}px`,
            left: `${toolbarPosition.left}px`,
            zIndex: 9999
          }}
          onMouseEnter={handleToolbarMouseEnter} 
          onMouseLeave={handleMouseLeave}
        >
          <FloatingToolbar
            element={element}
            onUpdate={onUpdate}
            onEditContent={() => setIsEditingContent(true)}
            isEditable={isEditable}
          />
        </div>,
        document.body
      )}
    </div>
  );
}
