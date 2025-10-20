import { useState, useRef, useEffect } from "react";

interface EditablePreviewElementProps {
  element: any;
  content: string;
  onUpdate: (updates: any) => void;
  onContentChange: (newContent: string) => void;
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
    const sizeMap = {
      small: "text-[10px]",
      medium: "text-xs",
      large: "text-sm",
      xlarge: "text-base",
    };
    return sizeMap[element.font_size as keyof typeof sizeMap] || "text-xs";
  };

  const getAlignClass = () => {
    const alignMap = {
      left: "text-left",
      center: "text-center",
      right: "text-right",
    };
    return alignMap[element.align as keyof typeof alignMap] || "text-left";
  };

  const formatClasses = `
    ${getFontSizeClass()}
    ${getAlignClass()}
    ${element.bold ? "font-bold" : ""}
    ${element.underline ? "underline" : ""}
    ${element.double_height ? "scale-y-150 origin-top" : ""}
    ${element.double_width ? "scale-x-150 origin-left" : ""}
  `.trim();

  // Renderizar separador se configurado
  const renderSeparator = () => {
    if (!element.separator || element.separator === "none") return null;
    
    const separatorChar = element.separator === "equals" ? "=" : "-";
    const separatorLine = separatorChar.repeat(48);
    
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
