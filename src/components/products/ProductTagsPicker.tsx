// v1.0.0 — Picker de tags pra produtos (admin)
import { PRODUCT_TAGS } from "@/lib/product-tags";
import { Label } from "@/components/ui/label";
import { Check } from "lucide-react";

interface ProductTagsPickerProps {
  value: string[];
  onChange: (tags: string[]) => void;
  label?: string;
}

export function ProductTagsPicker({ value, onChange, label = "Etiquetas" }: ProductTagsPickerProps) {
  const toggle = (tagId: string) => {
    if (value.includes(tagId)) {
      onChange(value.filter(t => t !== tagId));
    } else {
      onChange([...value, tagId]);
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <p className="text-xs text-muted-foreground">
        Aparecem como badges no cardápio. Cliente filtra por tag.
      </p>
      <div className="flex flex-wrap gap-2">
        {PRODUCT_TAGS.map((tag) => {
          const active = value.includes(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggle(tag.id)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                active
                  ? `${tag.color} ring-1 ring-offset-1 ring-current`
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {active && <Check className="h-3 w-3" />}
              <span>{tag.emoji}</span>
              <span>{tag.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
