// v1.0.0 — CRUD admin: campanhas/promoções automáticas por horário (happy hour)
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Plus, Edit2, Trash2, Clock, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/currency-formatter";

const WEEKDAYS = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
];

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  scope: "all" | "category" | "products";
  category_ids: string[];
  product_ids: string[];
  valid_days_of_week: number[];
  valid_start_time: string;
  valid_end_time: string;
  is_active: boolean;
  created_at: string;
}

export default function Campaigns() {
  const { toast } = useToast();
  const qc = useQueryClient();

  // Company ID do usuário logado
  const { data: companyId } = useQuery({
    queryKey: ["my-company-id"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();
      return data?.company_id ?? null;
    },
  });

  // Campanhas
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["campaigns", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from("campaigns" as any)
        .select("*").eq("company_id", companyId).order("created_at", { ascending: false });
      return (data as Campaign[]) || [];
    },
    enabled: !!companyId,
  });

  // Categorias e produtos da empresa (pra escopo)
  const { data: categories = [] } = useQuery({
    queryKey: ["categories", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from("categories").select("id, name").eq("company_id", companyId);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from("products").select("id, name").eq("company_id", companyId);
      return data || [];
    },
    enabled: !!companyId,
  });

  const [editing, setEditing] = useState<Campaign | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  const openCreate = () => {
    setEditing({
      id: "",
      name: "",
      description: null,
      discount_type: "percentage",
      discount_value: 10,
      scope: "all",
      category_ids: [],
      product_ids: [],
      valid_days_of_week: [1, 2, 3, 4, 5],
      valid_start_time: "17:00",
      valid_end_time: "19:00",
      is_active: true,
      created_at: "",
    });
    setShowDialog(true);
  };

  const openEdit = (c: Campaign) => {
    setEditing({ ...c });
    setShowDialog(true);
  };

  const save = async () => {
    if (!editing || !companyId) return;
    if (!editing.name.trim()) {
      toast({ title: "Nome obrigatório", variant: "destructive" });
      return;
    }
    if (editing.scope === "category" && editing.category_ids.length === 0) {
      toast({ title: "Selecione ao menos 1 categoria", variant: "destructive" });
      return;
    }
    if (editing.scope === "products" && editing.product_ids.length === 0) {
      toast({ title: "Selecione ao menos 1 produto", variant: "destructive" });
      return;
    }

    const payload: any = {
      company_id: companyId,
      name: editing.name.trim(),
      description: editing.description?.trim() || null,
      discount_type: editing.discount_type,
      discount_value: editing.discount_value,
      scope: editing.scope,
      category_ids: editing.scope === "category" ? editing.category_ids : [],
      product_ids: editing.scope === "products" ? editing.product_ids : [],
      valid_days_of_week: editing.valid_days_of_week,
      valid_start_time: editing.valid_start_time,
      valid_end_time: editing.valid_end_time,
      is_active: editing.is_active,
    };

    let error;
    if (editing.id) {
      ({ error } = await supabase.from("campaigns" as any).update(payload).eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("campaigns" as any).insert(payload));
    }
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editing.id ? "Campanha atualizada" : "Campanha criada" });
    setShowDialog(false);
    qc.invalidateQueries({ queryKey: ["campaigns", companyId] });
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir esta campanha?")) return;
    const { error } = await supabase.from("campaigns" as any).delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Campanha excluída" });
    qc.invalidateQueries({ queryKey: ["campaigns", companyId] });
  };

  const toggleActive = async (c: Campaign) => {
    await supabase.from("campaigns" as any).update({ is_active: !c.is_active }).eq("id", c.id);
    qc.invalidateQueries({ queryKey: ["campaigns", companyId] });
  };

  const toggleWeekday = (day: number) => {
    if (!editing) return;
    const set = new Set(editing.valid_days_of_week);
    if (set.has(day)) set.delete(day);
    else set.add(day);
    setEditing({ ...editing, valid_days_of_week: Array.from(set).sort() });
  };

  const toggleScopeItem = (id: string, type: "category" | "product") => {
    if (!editing) return;
    const field = type === "category" ? "category_ids" : "product_ids";
    const set = new Set(editing[field]);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    setEditing({ ...editing, [field]: Array.from(set) });
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6" />
            Campanhas
          </h1>
          <p className="text-sm text-muted-foreground">Promoções automáticas por horário e dias da semana</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Nova campanha
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            <Sparkles className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p>Nenhuma campanha cadastrada</p>
            <p className="text-xs mt-1">Crie campanhas tipo Happy Hour, terça da pizza, etc</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {campaigns.map(c => (
            <Card key={c.id}>
              <CardContent className="p-4 flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold">{c.name}</p>
                    {c.is_active ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Ativa</span>
                    ) : (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Inativa</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {c.discount_type === "percentage" ? `${c.discount_value}% off` : `${formatCurrency(c.discount_value)} off`}
                    {" · "}
                    {c.scope === "all" ? "Todos produtos" : c.scope === "category" ? `${c.category_ids.length} categoria(s)` : `${c.product_ids.length} produto(s)`}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Clock className="h-3 w-3" />
                    {c.valid_start_time.slice(0, 5)}–{c.valid_end_time.slice(0, 5)}
                    {" · "}
                    {c.valid_days_of_week.length === 7 ? "Todos os dias" : c.valid_days_of_week.map(d => WEEKDAYS[d].label).join(", ")}
                  </p>
                </div>
                <Switch checked={c.is_active} onCheckedChange={() => toggleActive(c)} />
                <Button size="icon" variant="ghost" onClick={() => openEdit(c)}>
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

      {/* Dialog criar/editar */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar campanha" : "Nova campanha"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })}
                  placeholder="Happy Hour Pizza" />
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={editing.description ?? ""} onChange={e => setEditing({ ...editing, description: e.target.value })}
                  rows={2} placeholder="Opcional" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={editing.discount_type}
                    onValueChange={(v: "percentage" | "fixed") => setEditing({ ...editing, discount_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                      <SelectItem value="fixed">Valor fixo (R$)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Valor</Label>
                  <Input type="number" step="0.01" min="0" value={editing.discount_value}
                    onChange={e => setEditing({ ...editing, discount_value: Number(e.target.value) })} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Aplica em</Label>
                <Select value={editing.scope}
                  onValueChange={(v: "all" | "category" | "products") => setEditing({ ...editing, scope: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os produtos</SelectItem>
                    <SelectItem value="category">Categorias específicas</SelectItem>
                    <SelectItem value="products">Produtos específicos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Seletor de categorias */}
              {editing.scope === "category" && (
                <div className="space-y-1 border rounded-lg p-3 max-h-40 overflow-y-auto">
                  {categories.map(cat => (
                    <label key={cat.id} className="flex items-center gap-2 py-1 cursor-pointer">
                      <Checkbox checked={editing.category_ids.includes(cat.id)}
                        onCheckedChange={() => toggleScopeItem(cat.id, "category")} />
                      <span className="text-sm">{cat.name}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* Seletor de produtos */}
              {editing.scope === "products" && (
                <div className="space-y-1 border rounded-lg p-3 max-h-40 overflow-y-auto">
                  {products.map(p => (
                    <label key={p.id} className="flex items-center gap-2 py-1 cursor-pointer">
                      <Checkbox checked={editing.product_ids.includes(p.id)}
                        onCheckedChange={() => toggleScopeItem(p.id, "product")} />
                      <span className="text-sm">{p.name}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* Dias da semana */}
              <div className="space-y-2">
                <Label>Dias da semana</Label>
                <div className="flex gap-1 flex-wrap">
                  {WEEKDAYS.map(d => {
                    const on = editing.valid_days_of_week.includes(d.value);
                    return (
                      <button key={d.value} type="button" onClick={() => toggleWeekday(d.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors
                          ${on ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-muted"}`}>
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Horário */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Início</Label>
                  <Input type="time" value={editing.valid_start_time.slice(0, 5)}
                    onChange={e => setEditing({ ...editing, valid_start_time: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Fim</Label>
                  <Input type="time" value={editing.valid_end_time.slice(0, 5)}
                    onChange={e => setEditing({ ...editing, valid_end_time: e.target.value })} />
                </div>
              </div>

              {/* Ativa */}
              <div className="flex items-center justify-between border rounded-lg p-3">
                <Label>Campanha ativa</Label>
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
