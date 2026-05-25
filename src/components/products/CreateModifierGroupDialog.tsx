// v1.0.0 — Dialog inline criar grupo de opções + items (estilo Saipos)
// Cria modifier_groups + modifier_items + auto-vincula ao produto atual
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, X, Loader2 } from "lucide-react";

interface NewItem {
  name: string;
  price_delta: number;
  available_weekdays: string[]; // [] = todos dias
}

const WEEKDAYS = [
  { key: "monday",    label: "Seg" },
  { key: "tuesday",   label: "Ter" },
  { key: "wednesday", label: "Qua" },
  { key: "thursday",  label: "Qui" },
  { key: "friday",    label: "Sex" },
  { key: "saturday",  label: "Sáb" },
  { key: "sunday",    label: "Dom" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  nextSortOrder: number;
}

export function CreateModifierGroupDialog({ open, onOpenChange, productId, nextSortOrder }: Props) {
  const { companyId } = useCompanyId();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [displayType, setDisplayType] = useState<"single" | "multiple">("multiple");
  const [minSelect, setMinSelect] = useState(0);
  const [maxSelect, setMaxSelect] = useState(1);
  const [isRequired, setIsRequired] = useState(false);
  const [items, setItems] = useState<NewItem[]>([
    { name: "", price_delta: 0, available_weekdays: [] },
  ]);

  const reset = () => {
    setName("");
    setDisplayType("multiple");
    setMinSelect(0);
    setMaxSelect(1);
    setIsRequired(false);
    setItems([{ name: "", price_delta: 0, available_weekdays: [] }]);
  };

  const addItem = () => setItems((arr) => [...arr, { name: "", price_delta: 0, available_weekdays: [] }]);
  const removeItem = (idx: number) => setItems((arr) => arr.filter((_, i) => i !== idx));
  const updateItem = (idx: number, patch: Partial<NewItem>) => {
    setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };
  const toggleWeekday = (idx: number, key: string) => {
    setItems((arr) => arr.map((it, i) => {
      if (i !== idx) return it;
      const has = it.available_weekdays.includes(key);
      return { ...it, available_weekdays: has ? it.available_weekdays.filter(d => d !== key) : [...it.available_weekdays, key] };
    }));
  };

  const create = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Empresa não encontrada");
      if (!name.trim()) throw new Error("Nome do grupo é obrigatório");
      const validItems = items.filter((i) => i.name.trim().length > 0);
      if (validItems.length === 0) throw new Error("Adicione ao menos 1 item ao grupo");
      if (minSelect > maxSelect) throw new Error("Mínimo não pode ser maior que máximo");

      // 1. Cria grupo
      const { data: group, error: gErr } = await supabase
        .from("modifier_groups" as any)
        .insert({
          company_id: companyId,
          name: name.trim(),
          display_type: displayType,
          min_select: minSelect,
          max_select: maxSelect,
          is_required: isRequired,
          sort_order: 0,
        } as any)
        .select()
        .single();
      if (gErr) throw gErr;
      const gId = (group as any).id;

      // 2. Cria items
      const itemsPayload = validItems.map((it, idx) => ({
        group_id: gId,
        name: it.name.trim(),
        price_delta: it.price_delta || 0,
        available_weekdays: it.available_weekdays.length === 0 ? null : it.available_weekdays,
        available: true,
        sort_order: idx,
      }));
      const { error: iErr } = await supabase.from("modifier_items" as any).insert(itemsPayload);
      if (iErr) throw iErr;

      // 3. Vincula ao produto
      const { error: lErr } = await supabase.from("product_modifier_groups" as any).insert({
        product_id: productId,
        group_id: gId,
        sort_order: nextSortOrder,
      });
      if (lErr) throw lErr;
    },
    onSuccess: () => {
      toast({ title: "Grupo criado e vinculado ao produto ✓" });
      queryClient.invalidateQueries({ queryKey: ["modifier-groups", companyId] });
      queryClient.invalidateQueries({ queryKey: ["product-modifier-groups", productId] });
      reset();
      onOpenChange(false);
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo grupo de opções</DialogTitle>
          <DialogDescription>
            Crie um grupo (ex: Proteínas, Acompanhamentos, Salada) e seus itens. Vincula automaticamente ao produto.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Config do grupo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label>Nome do grupo *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Proteínas, Acompanhamentos, Salada"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Tipo de seleção</Label>
              <Select value={displayType} onValueChange={(v: any) => {
                setDisplayType(v);
                if (v === "single") setMaxSelect(1);
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Única (radio)</SelectItem>
                  <SelectItem value="multiple">Múltipla (checkbox)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Obrigatório?</Label>
              <div className="flex items-center gap-2 h-10">
                <Switch checked={isRequired} onCheckedChange={(v) => { setIsRequired(v); if (v && minSelect === 0) setMinSelect(1); }} />
                <span className="text-sm text-muted-foreground">{isRequired ? "Sim" : "Não"}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Mínimo de escolhas</Label>
              <Input type="number" min={0} value={minSelect} onChange={(e) => setMinSelect(Math.max(0, parseInt(e.target.value) || 0))} />
            </div>

            <div className="space-y-1.5">
              <Label>Máximo de escolhas</Label>
              <Input type="number" min={1} value={maxSelect} onChange={(e) => setMaxSelect(Math.max(1, parseInt(e.target.value) || 1))} disabled={displayType === "single"} />
            </div>
          </div>

          {/* Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Itens do grupo *</Label>
              <Button size="sm" variant="outline" onClick={addItem}>
                <Plus className="w-3 h-3 mr-1" /> Adicionar item
              </Button>
            </div>

            <div className="space-y-2">
              {items.map((item, idx) => (
                <Card key={idx}>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder={`Nome do item ${idx + 1} (ex: Frango grelhado)`}
                        value={item.name}
                        onChange={(e) => updateItem(idx, { name: e.target.value })}
                        className="flex-1"
                      />
                      <div className="w-32">
                        <CurrencyInput
                          value={item.price_delta}
                          onChange={(v) => updateItem(idx, { price_delta: v })}
                        />
                      </div>
                      {items.length > 1 && (
                        <Button size="icon" variant="ghost" onClick={() => removeItem(idx)} className="text-destructive">
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    {/* Dias disponíveis */}
                    <div className="flex flex-wrap gap-1">
                      <span className="text-xs text-muted-foreground self-center mr-1">Dias:</span>
                      {WEEKDAYS.map((d) => {
                        const active = item.available_weekdays.includes(d.key);
                        return (
                          <button
                            key={d.key}
                            type="button"
                            onClick={() => toggleWeekday(idx, d.key)}
                            className={`text-xs px-2 py-0.5 rounded border transition ${
                              active ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"
                            }`}
                          >
                            {d.label}
                          </button>
                        );
                      })}
                      <span className="text-xs text-muted-foreground self-center ml-1">
                        {item.available_weekdays.length === 0 ? "(todos)" : ""}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }} disabled={create.isPending}>
            Cancelar
          </Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending || !name.trim()}>
            {create.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Criar grupo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
