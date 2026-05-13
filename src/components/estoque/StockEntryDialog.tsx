// StockEntryDialog.tsx — v1.0.0
// Modal para registrar entrada de estoque (compra/ajuste)
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Ingredient } from "./IngredientDialog";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ingredients: Ingredient[];
  onSave: (data: { ingredient_id: string; type: "in" | "adjustment"; quantity: number; reason: string }) => void;
  isSaving?: boolean;
  preselectedId?: string;
}

export function StockEntryDialog({ open, onOpenChange, ingredients, onSave, isSaving, preselectedId }: Props) {
  const [ingredientId, setIngredientId] = useState(preselectedId || "");
  const [type, setType] = useState<"in" | "adjustment">("in");
  const [quantity, setQuantity] = useState<number>(0);
  const [reason, setReason] = useState("");

  const reset = () => { setIngredientId(preselectedId || ""); setType("in"); setQuantity(0); setReason(""); };

  const handleSave = () => {
    if (!ingredientId || quantity <= 0) return;
    onSave({ ingredient_id: ingredientId, type, quantity, reason });
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={v => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Entrada de Estoque</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Ingrediente</Label>
            <Select value={ingredientId} onValueChange={setIngredientId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {ingredients.map(i => (
                  <SelectItem key={i.id} value={i.id!}>{i.name} ({i.unit})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Tipo</Label>
            <Select value={type} onValueChange={v => setType(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="in">Entrada (compra/recebimento)</SelectItem>
                <SelectItem value="adjustment">Ajuste manual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Quantidade</Label>
            <Input
              type="number" step="0.001" min="0.001"
              value={quantity || ""}
              onChange={e => setQuantity(parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
          </div>

          <div className="space-y-1">
            <Label>Motivo / Observação (opcional)</Label>
            <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Ex: Compra fornecedor X" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!ingredientId || quantity <= 0 || isSaving}>
            {isSaving ? "Salvando..." : "Registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
