import { useState, useRef, useEffect } from "react";

interface EditablePreviewElementProps {
  element: any;
  content: string;
  onUpdate: (updates: any) => void;
  onContentChange: (newContent: string) => void;
  isSelected: boolean;
  onSelect: () => void;
  isEditable: boolean;
  maxChars: number; // NOVO: largura para sincronizar com impressão
}

export function EditablePreviewElement({
  element,
  content,
  onUpdate,
  onContentChange,
  isSelected,
  onSelect,
  isEditable,
  maxChars,
}: EditablePreviewElementProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(content);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEditValue(content);
  }, [content]);

  const handleDoubleClick = () => {
    if (isEditable) {
      setIsEditing(true);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (editValue !== content) {
      onContentChange(editValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleBlur();
    }
    if (e.key === "Escape") {
      setEditValue(content);
      setIsEditing(false);
    }
  };

  const getFontSizeClass = () => {
    // Mapear para aproximar ESC/POS multipliers (2x, 4x)
    const sizeMap = {
      small: "text-[10px]",    // ESC/POS normal
      medium: "text-[10px]",   // IGUAL a small (como impressão)
      large: "text-[20px]",    // 2x do normal (ESC/POS large)
      xlarge: "text-[40px]",   // 4x do normal (ESC/POS xlarge)
    };
    return sizeMap[element.font_size as keyof typeof sizeMap] || "text-[10px]";
  };

  const getAlignClass = () => {
    const alignMap = {
      left: "text-left",
      center: "text-center",
      right: "text-right",
    };
    // Buscar alinhamento em element.formatting.align (nova estrutura)
    const align = element.formatting?.align || element.align || 'left';
    return alignMap[align as keyof typeof alignMap] || "text-left";
  };

  const formatClasses = `
    ${getFontSizeClass()}
    ${getAlignClass()}
    ${element.bold ? "font-bold" : ""}
    ${element.underline ? "underline" : ""}
    ${element.double_height ? "scale-y-150 origin-top" : ""}
    ${element.double_width ? "scale-x-150 origin-left" : ""}
  `.trim();

  // Renderizar separador se configurado (SINCRONIZADO COM IMPRESSÃO)
  const renderSeparator = () => {
    // Usar element.separator_below (nova estrutura) ou fallback
    const separatorConfig = element.separator_below || { show: false };
    
    if (!separatorConfig.show) return null;
    
    const char = separatorConfig.char || '-';
    // USAR maxChars da config (igual à impressão)
    const separatorLine = char.repeat(maxChars);
    
    return (
      <div className="text-[10px] text-foreground/20 leading-tight my-0.5">
        {separatorLine}
      </div>
    );
  };

  return (
    <>
      <div
        ref={elementRef}
        onClick={onSelect}
        onDoubleClick={handleDoubleClick}
        className={`
          relative cursor-pointer transition-all leading-tight
          ${isSelected ? "bg-primary/10 ring-2 ring-primary/50 rounded px-1" : "hover:bg-muted/30 rounded px-1"}
        `}
      >
        {isEditing ? (
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            autoFocus
            className={`w-full bg-background border border-primary rounded px-1 ${formatClasses}`}
            rows={Math.max(2, editValue.split("\n").length)}
          />
        ) : (
          <div className={formatClasses} style={{ whiteSpace: "pre-wrap" }}>
            {content}
          </div>
        )}
      </div>
      
      {renderSeparator()}
    </>
  );
}
