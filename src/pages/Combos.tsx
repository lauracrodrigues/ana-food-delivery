// v1.0.0 — CRUD admin Compre-e-Ganhe (combo_campaigns)
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input"; // v1.0.1 — máscara R$
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Gift, Plus, Edit2, Trash2, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/currency-formatter";

interface ComboCampaign {
  id: string;
  name: string;
  description: string | null;
  trigger_type: "qty_get" | "min_value";
  trigger_qty: number | null;
  trigger_value: number | null;
  trigger_product_id: string | null;
  reward_product_id: string | null;
  reward_discount_pct: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
}

export default function Combos() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: companyId } = useQuery({
    queryKey: ["my-company-id"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();
      return data?.company_id ?? null;
    },
  });

  const { data: combos = [], isLoading } = useQuery({
    queryKey: ["combos", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from("combo_campaigns" as any)
        .select("*").eq("company_id", companyId).order("created_at", { ascending: false });
      return (data as ComboCampaign[]) || [];
    },
    enabled: !!companyId,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products-list", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from("products").select("id, name").eq("company_id", companyId);
      return data || [];
    },
    enabled: !!companyId,
  });

  const [editing, setEditing] = useState<ComboCampaign | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  const openCreate = () => {
    setEditing({
      id: "", name: "", description: null,
      trigger_type: "qty_get", trigger_qty: 2, trigger_value: null,
      trigger_product_id: null, reward_product_id: null,
      reward_discount_pct: 100, valid_from: null, valid_until: null, is_active: true,
    });
    setShowDialog(true);
  };

  const save = async () => {
    if (!editing || !companyId) return;
    if (!editing.name.trim()) {
      toast({ title: "Nome obrigatório", variant: "destructive" });
      return;
    }
    if (!editing.reward_product_id) {
      toast({ title: "Selecione um produto recompensa", variant: "destructive" });
      return;
    }
    if (editing.trigger_type === "qty_get" && (!editing.trigger_qty || editing.trigger_qty < 1)) {
      toast({ title: "Quantidade mínima inválida", variant: "destructive" });
      return;
    }
    if (editing.trigger_type === "min_value" && (!editing.trigger_value || editing.trigger_value <= 0)) {
      toast({ title: "Valor mínimo inválido", variant: "destructive" });
      return;
    }

    const payload: any = {
      company_id: companyId,
      name: editing.name.trim(),
      description: editing.description?.trim() || null,
      trigger_type: editing.trigger_type,
      trigger_qty: editing.trigger_type === "qty_get" ? editing.trigger_qty : null,
      trigger_value: editing.trigger_type === "min_value" ? editing.trigger_value : null,
      trigger_product_id: editing.trigger_product_id,
      reward_product_id: editing.reward_product_id,
      reward_discount_pct: editing.reward_discount_pct,
      valid_from: editing.valid_from,
      valid_until: editing.valid_until,
      is_active: editing.is_active,
    };

    let error;
    if (editing.id) {
      ({ error } = await supabase.from("combo_campaigns" as any).update(payload).eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("combo_campaigns" as any).insert(payload));
    }
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editing.id ? "Combo atualizado" : "Combo criado" });
    setShowDialog(false);
    qc.invalidateQueries({ queryKey: ["combos", companyId] });
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este combo?")) return;
    await supabase.from("combo_campaigns" as any).delete().eq("id", id);
    toast({ title: "Combo excluído" });
    qc.invalidateQueries({ queryKey: ["combos", companyId] });
  };

  const toggleActive = async (c: ComboCampaign) => {
    await supabase.from("combo_campaigns" as any).update({ is_active: !c.is_active }).eq("id", c.id);
    qc.invalidateQueries({ queryKey: ["combos", companyId] });
  };

  const productName = (id: string | null) => products.find(p => p.id === id)?.name || "—";

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Gift className="h-6 w-6" /> Combos
          </h1>
          <p className="text-sm text-muted-foreground">Promoções compre-e-ganhe</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Novo combo
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : combos.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            <Gift className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p>Nenhum combo cadastrado</p>
            <p className="text-xs mt-1">Ex: "Compre 2 marmitas, ganhe 1 refri"</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {combos.map(c => (
            <Card key={c.id}>
              <CardContent className="p-4 flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold">{c.name}</p>
                    {c.is_active ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Ativo</span>
                    ) : (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Inativo</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    📌 {c.trigger_type === "qty_get"
                      ? `Compre ${c.trigger_qty}${c.trigger_product_id ? ` de ${productName(c.trigger_product_id)}` : ''}`
                      : `Gaste ${formatCurrency(c.trigger_value || 0)}`}
                    {" → "}
                    🎁 {c.reward_discount_pct === 100 ? "Ganhe" : `${c.reward_discount_pct}% off em`} {productName(c.reward_product_id)}
                  </p>
                </div>
                <Switch checked={c.is_active} onCheckedChange={() => toggleActive(c)} />
                <Button size="icon" variant="ghost" onClick={() => { setEditing({ ...c }); setShowDialog(true); }}>
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => remove(c.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar combo" : "Novo combo"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })}
                  placeholder="Combo Família" />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={editing.description ?? ""} onChange={e => setEditing({ ...editing, description: e.target.value })}
                  rows={2} placeholder="Opcional" />
              </div>

              <div className="space-y-2">
                <Label>Tipo de gatilho</Label>
                <Select value={editing.trigger_type}
                  onValueChange={(v: "qty_get" | "min_value") => setEditing({ ...editing, trigger_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="qty_get">Por quantidade (ex: compre 2 marmitas)</SelectItem>
                    <SelectItem value="min_value">Por valor mínimo (ex: gaste R$ 50)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editing.trigger_type === "qty_get" ? (
                <>
                  <div className="space-y-2">
                    <Label>Quantidade mínima</Label>
                    <Input type="number" min="1" value={editing.trigger_qty ?? 1}
                      onChange={e => setEditing({ ...editing, trigger_qty: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Produto gatilho (opcional, vazio = qualquer)</Label>
                    <Select value={editing.trigger_product_id ?? "any"}
                      onValueChange={(v) => setEditing({ ...editing, trigger_product_id: v === "any" ? null : v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Qualquer produto</SelectItem>
                        {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <Label>Valor mínimo (R$)</Label>
                  {/* Máscara R$ */}
                  <CurrencyInput value={editing.trigger_value ?? 0}
                    onChange={(n) => setEditing({ ...editing, trigger_value: n })} />
                </div>
              )}

              <div className="space-y-2">
                <Label>Produto recompensa *</Label>
                <Select value={editing.reward_product_id ?? ""}
                  onValueChange={(v) => setEditing({ ...editing, reward_product_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>% de desconto na recompensa (100 = grátis)</Label>
                <Input type="number" min="0" max="100" value={editing.reward_discount_pct}
                  onChange={e => setEditing({ ...editing, reward_discount_pct: Number(e.target.value) })} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Válido de</Label>
                  <Input type="date" value={editing.valid_from ?? ""}
                    onChange={e => setEditing({ ...editing, valid_from: e.target.value || null })} />
                </div>
                <div className="space-y-2">
                  <Label>Válido até</Label>
                  <Input type="date" value={editing.valid_until ?? ""}
                    onChange={e => setEditing({ ...editing, valid_until: e.target.value || null })} />
                </div>
              </div>

              <div className="flex items-center justify-between border rounded-lg p-3">
                <Label>Combo ativo</Label>
                <Switch checked={editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
