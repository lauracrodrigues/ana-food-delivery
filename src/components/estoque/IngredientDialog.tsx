// IngredientDialog.tsx — v1.0.0
// Modal para criar/editar ingrediente
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface Ingredient {
  id?: string;
  name: string;
  unit: string;
  stock: number;
  min_stock: number;
  cost_price: number | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Ingredient | null;
  onSave: (data: Ingredient) => void;
  isSaving?: boolean;
}

const UNITS = ["un", "kg", "g", "L", "ml", "cx", "pct", "dz"];

const empty: Ingredient = { name: "", unit: "un", stock: 0, min_stock: 0, cost_price: null };

export function IngredientDialog({ open, onOpenChange, initial, onSave, isSaving }: Props) {
  const [form, setForm] = useState<Ingredient>(empty);

  useEffect(() => {
    setForm(initial ? { ...initial } : empty);
  }, [initial, open]);

  const set = (k: keyof Ingredient, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Editar Ingrediente" : "Novo Ingrediente"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Nome</Label>
            <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Ex: Frango, Arroz, Óleo..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Unidade</Label>
              <Select value={form.unit} onValueChange={v => set("unit", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Preço de custo (R$)</Label>
              <Input
                type="number" step="0.01" min="0"
                value={form.cost_price ?? ""}
                onChange={e => set("cost_price", e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="0,00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Estoque atual</Label>
              <Input
                type="number" step="0.001" min="0"
                value={form.stock}
                onChange={e => set("stock", parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1">
              <Label>Estoque mínimo (alerta)</Label>
              <Input
                type="number" step="0.001" min="0"
                value={form.min_stock}
                onChange={e => set("min_stock", parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => onSave(form)} disabled={!form.name.trim() || isSaving}>
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
