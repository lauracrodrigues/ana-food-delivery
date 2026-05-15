// v1.0.0 — CRUD cardápio do dia (consumido pelo agente Ana Food via cardapioService)
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/currency-formatter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar, Plus, Trash2, Edit2, Loader2, Copy } from "lucide-react";

interface CardapioItem {
  id: string;
  company_id: string;
  data: string; // YYYY-MM-DD
  tipo: string;
  nome: string;
  preco: number | null;
  disponivel: boolean;
}

const TIPOS = [
  { value: "tamanho",        label: "🍱 Tamanho", emoji: "🍱" },
  { value: "proteina",       label: "🥩 Proteína", emoji: "🥩" },
  { value: "acompanhamento", label: "🍚 Acompanhamento", emoji: "🍚" },
  { value: "salada",         label: "🥗 Salada", emoji: "🥗" },
  { value: "bebida",         label: "🥤 Bebida", emoji: "🥤" },
  { value: "sobremesa",      label: "🍰 Sobremesa", emoji: "🍰" },
  { value: "combo",          label: "📦 Combo", emoji: "📦" },
];

function getTipoEmoji(tipo: string): string {
  return TIPOS.find(t => t.value === tipo)?.emoji || "•";
}

export default function DailyMenu() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(today);

  const { data: companyId } = useQuery({
    queryKey: ["my-company-id"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();
      return data?.company_id ?? null;
    },
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["cardapio-dia", companyId, selectedDate],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from("cardapio_dia" as any)
        .select("*").eq("company_id", companyId).eq("data", selectedDate)
        .order("tipo").order("nome");
      return (data as CardapioItem[]) || [];
    },
    enabled: !!companyId,
  });

  const [editing, setEditing] = useState<Partial<CardapioItem> | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  const openCreate = () => {
    setEditing({ tipo: "proteina", nome: "", preco: null, disponivel: true });
    setShowDialog(true);
  };

  const openEdit = (item: CardapioItem) => {
    setEditing({ ...item });
    setShowDialog(true);
  };

  const save = async () => {
    if (!editing || !companyId) return;
    if (!editing.nome?.trim()) {
      toast({ title: "Nome obrigatório", variant: "destructive" });
      return;
    }
    const payload: any = {
      company_id: companyId,
      data: selectedDate,
      tipo: editing.tipo,
      nome: editing.nome.trim(),
      preco: editing.preco || null,
      disponivel: editing.disponivel ?? true,
    };
    let error;
    if (editing.id) {
      ({ error } = await supabase.from("cardapio_dia" as any).update(payload).eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("cardapio_dia" as any).insert(payload));
    }
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editing.id ? "Item atualizado" : "Item adicionado" });
    setShowDialog(false);
    qc.invalidateQueries({ queryKey: ["cardapio-dia", companyId, selectedDate] });
  };

  const remove = async (id: string) => {
    if (!confirm("Remover item do cardápio?")) return;
    await supabase.from("cardapio_dia" as any).delete().eq("id", id);
    toast({ title: "Item removido" });
    qc.invalidateQueries({ queryKey: ["cardapio-dia", companyId, selectedDate] });
  };

  const toggleDisponivel = async (item: CardapioItem) => {
    await supabase.from("cardapio_dia" as any).update({ disponivel: !item.disponivel }).eq("id", item.id);
    qc.invalidateQueries({ queryKey: ["cardapio-dia", companyId, selectedDate] });
  };

  // Copiar cardápio de outro dia pra este
  const copyFromDate = async (fromDate: string) => {
    if (!companyId) return;
    const { data: source } = await supabase.from("cardapio_dia" as any)
      .select("tipo, nome, preco, disponivel").eq("company_id", companyId).eq("data", fromDate);
    if (!source || source.length === 0) {
      toast({ title: "Dia origem vazio", variant: "destructive" });
      return;
    }
    const payload = (source as any[]).map(s => ({ ...s, company_id: companyId, data: selectedDate }));
    const { error } = await supabase.from("cardapio_dia" as any).insert(payload);
    if (error) {
      toast({ title: "Erro ao copiar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `${source.length} itens copiados` });
    qc.invalidateQueries({ queryKey: ["cardapio-dia", companyId, selectedDate] });
  };

  // Texto do cardápio formatado pra WhatsApp (preview)
  const formattedMenu = items.length > 0
    ? TIPOS.map(t => {
        const list = items.filter(i => i.tipo === t.value && i.disponivel);
        if (list.length === 0) return null;
        return `${t.emoji} ${t.label.replace(t.emoji, '').trim()}:\n${list.map(i =>
          `• ${i.nome}${i.preco ? ` — ${formatCurrency(i.preco)}` : ''}`
        ).join('\n')}`;
      }).filter(Boolean).join('\n\n')
    : "Cardápio vazio";

  // Grupos visuais
  const groupedByTipo = TIPOS.map(t => ({
    tipo: t,
    items: items.filter(i => i.tipo === t.value),
  })).filter(g => g.items.length > 0);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6" /> Cardápio do dia
          </h1>
          <p className="text-sm text-muted-foreground">
            Consumido automaticamente pelo agente WhatsApp Ana Food
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
            className="w-40" />
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Item
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Itens cadastrados */}
        <div className="lg:col-span-2 space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : items.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12 text-muted-foreground">
                <Calendar className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p>Sem itens pra {new Date(selectedDate + "T00:00").toLocaleDateString("pt-BR")}</p>
                <p className="text-xs mt-1">Adicione itens manualmente ou copie de outro dia</p>
                <div className="flex gap-2 justify-center mt-4">
                  <Button size="sm" variant="outline" onClick={() => {
                    const yesterday = new Date(selectedDate);
                    yesterday.setDate(yesterday.getDate() - 1);
                    copyFromDate(yesterday.toISOString().slice(0, 10));
                  }}>
                    <Copy className="h-3.5 w-3.5 mr-1.5" /> Copiar de ontem
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    const lastWeek = new Date(selectedDate);
                    lastWeek.setDate(lastWeek.getDate() - 7);
                    copyFromDate(lastWeek.toISOString().slice(0, 10));
                  }}>
                    <Copy className="h-3.5 w-3.5 mr-1.5" /> Mesmo dia semana passada
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            groupedByTipo.map(g => (
              <Card key={g.tipo.value}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{g.tipo.label}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  {g.items.map(item => (
                    <div key={item.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border ${item.disponivel ? '' : 'opacity-50'}`}>
                      <span className="flex-1 text-sm">{item.nome}</span>
                      {item.preco != null && (
                        <span className="text-sm font-medium text-primary">{formatCurrency(item.preco)}</span>
                      )}
                      <Switch checked={item.disponivel} onCheckedChange={() => toggleDisponivel(item)} />
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(item)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(item.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Preview formatado WhatsApp */}
        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="text-base">Preview WhatsApp</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 rounded-lg p-3 text-sm whitespace-pre-wrap font-mono">
                {formattedMenu}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full mt-3 gap-1.5"
                onClick={() => { navigator.clipboard.writeText(formattedMenu); toast({ title: "Cardápio copiado" }); }}
              >
                <Copy className="h-3.5 w-3.5" /> Copiar texto
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog editar */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar item" : "Novo item do cardápio"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={editing.tipo}
                  onValueChange={(v) => setEditing({ ...editing, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input value={editing.nome ?? ""} onChange={e => setEditing({ ...editing, nome: e.target.value })}
                  placeholder="Ex: Arroz branco" />
              </div>
              <div className="space-y-2">
                <Label>Preço (opcional)</Label>
                <Input type="number" step="0.01" min="0" value={editing.preco ?? ""}
                  onChange={e => setEditing({ ...editing, preco: e.target.value ? Number(e.target.value) : null })}
                  placeholder="Vazio = sem preço (parte do prato)" />
              </div>
              <div className="flex items-center justify-between border rounded-lg p-3">
                <Label>Disponível hoje</Label>
                <Switch checked={editing.disponivel ?? true}
                  onCheckedChange={(v) => setEditing({ ...editing, disponivel: v })} />
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
