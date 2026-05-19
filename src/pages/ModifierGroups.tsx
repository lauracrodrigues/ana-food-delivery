// v1.0.0 — CRUD de Grupos de Opções (Acompanhamentos)
// Fase 2 do plano catalogo-modifiers
// Permite criar grupos (Arroz, Mistura, Salada) com seus itens
// (Arroz Branco, Frango, Carne+R$3 etc) — reutilizáveis entre produtos
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, Layers, X } from "lucide-react";
import { formatCurrency } from "@/lib/currency-formatter";

interface ModifierItem {
  id: string;
  group_id: string;
  name: string;
  price_delta: number;
  available: boolean;
  sort_order: number;
}

interface ModifierGroup {
  id: string;
  company_id: string;
  name: string;
  display_type: "radio" | "checkbox" | "quantity";
  min_select: number;
  max_select: number;
  is_required: boolean;
  sort_order: number;
  items?: ModifierItem[]; // populado via query separada
}

export default function ModifierGroups() {
  const { companyId } = useCompanyId();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showDialog, setShowDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ModifierGroup | null>(null);
  const [groupForm, setGroupForm] = useState<Partial<ModifierGroup>>({
    name: "",
    display_type: "checkbox",
    min_select: 0,
    max_select: 1,
    is_required: false,
    sort_order: 0,
  });
  const [newItem, setNewItem] = useState({ name: "", price_delta: 0 });

  // Lista grupos da empresa + items via query única
  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["modifier-groups", companyId],
    queryFn: async (): Promise<ModifierGroup[]> => {
      if (!companyId) return [];
      const { data: gs } = await supabase
        .from("modifier_groups" as any)
        .select("*")
        .eq("company_id", companyId)
        .order("sort_order");
      if (!gs) return [];
      const groupIds = (gs as any[]).map(g => g.id);
      if (groupIds.length === 0) return gs as any;
      const { data: its } = await supabase
        .from("modifier_items" as any)
        .select("*")
        .in("group_id", groupIds)
        .order("sort_order");
      // Combina grupos com seus items
      return (gs as any[]).map(g => ({
        ...g,
        items: (its as any[] || []).filter(i => i.group_id === g.id),
      }));
    },
    enabled: !!companyId,
  });

  // CRUD grupo
  const saveGroupMutation = useMutation({
    mutationFn: async (values: Partial<ModifierGroup>) => {
      if (!companyId) throw new Error("Empresa não encontrada");
      if (!values.name?.trim()) throw new Error("Nome é obrigatório");
      const payload = {
        company_id: companyId,
        name: values.name.trim(),
        display_type: values.display_type ?? "checkbox",
        min_select: values.min_select ?? 0,
        max_select: values.max_select ?? 1,
        is_required: values.is_required ?? false,
        sort_order: values.sort_order ?? 0,
      };
      if (editingGroup?.id) {
        const { error } = await supabase.from("modifier_groups" as any).update(payload).eq("id", editingGroup.id);
        if (error) throw error;
        return { id: editingGroup.id, isNew: false };
      } else {
        const { data, error } = await supabase.from("modifier_groups" as any).insert(payload).select("id").single();
        if (error) throw error;
        return { id: (data as any).id, isNew: true };
      }
    },
    onSuccess: ({ id, isNew }) => {
      queryClient.invalidateQueries({ queryKey: ["modifier-groups", companyId] });
      toast({ title: isNew ? "Grupo criado ✓" : "Grupo atualizado ✓" });
      if (isNew) {
        // Recarrega o group recém criado pra adicionar items
        setTimeout(() => {
          const g = (queryClient.getQueryData(["modifier-groups", companyId]) as ModifierGroup[] || []).find(g => g.id === id);
          if (g) setEditingGroup(g);
        }, 200);
      }
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("modifier_groups" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modifier-groups", companyId] });
      toast({ title: "Grupo removido ✓" });
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  // CRUD item dentro do grupo
  const addItemMutation = useMutation({
    mutationFn: async ({ group_id, name, price_delta }: { group_id: string; name: string; price_delta: number }) => {
      if (!name.trim()) throw new Error("Nome do item é obrigatório");
      const { error } = await supabase.from("modifier_items" as any).insert({
        group_id, name: name.trim(), price_delta, sort_order: 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modifier-groups", companyId] });
      setNewItem({ name: "", price_delta: 0 });
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("modifier_items" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["modifier-groups", companyId] }),
  });

  const handleOpenNew = () => {
    setEditingGroup(null);
    setGroupForm({ name: "", display_type: "checkbox", min_select: 0, max_select: 1, is_required: false, sort_order: 0 });
    setShowDialog(true);
  };

  const handleOpenEdit = (g: ModifierGroup) => {
    setEditingGroup(g);
    setGroupForm(g);
    setShowDialog(true);
  };

  const handleSaveGroup = () => saveGroupMutation.mutate(groupForm);

  const handleDelete = (g: ModifierGroup) => {
    if (!confirm(`Remover grupo "${g.name}"? Itens também serão deletados.`)) return;
    deleteGroupMutation.mutate(g.id);
  };

  // Sincroniza editingGroup com cache atualizado (após add/delete item, refresh do dialog)
  const currentEditing = editingGroup ? groups.find(g => g.id === editingGroup.id) || editingGroup : null;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Layers className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Grupos de Opções</h1>
            <p className="text-sm text-muted-foreground">
              Acompanhamentos, adicionais e escolhas — reutilizáveis entre produtos
            </p>
          </div>
        </div>
        <Button onClick={handleOpenNew} className="gap-2">
          <Plus className="h-4 w-4" /> Novo grupo
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Carregando...</div>
          ) : groups.length === 0 ? (
            <div className="p-12 text-center">
              <Layers className="h-12 w-12 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-muted-foreground">Nenhum grupo cadastrado ainda.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Exemplos: "Escolha do arroz", "Mistura", "Saladas"
              </p>
              <Button onClick={handleOpenNew} className="mt-4">Criar primeiro grupo</Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Min / Max</TableHead>
                  <TableHead>Itens</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map(g => (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {g.name}
                        {g.is_required && <Badge variant="secondary" className="text-xs">obrigatório</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{g.display_type}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {g.min_select} / {g.max_select}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{g.items?.length ?? 0} itens</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => handleOpenEdit(g)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(g)} className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingGroup ? `Editar grupo: ${editingGroup.name}` : "Novo grupo"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nome *</Label>
                <Input
                  placeholder="Ex: Escolha do arroz"
                  value={groupForm.name ?? ""}
                  onChange={e => setGroupForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo de seleção</Label>
                <Select
                  value={groupForm.display_type ?? "checkbox"}
                  onValueChange={(v) => setGroupForm(f => ({ ...f, display_type: v as any }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="radio">Rádio (escolha única)</SelectItem>
                    <SelectItem value="checkbox">Checkbox (múltipla)</SelectItem>
                    <SelectItem value="quantity">Quantidade (N do mesmo)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Min de escolhas</Label>
                <Input
                  type="number" min={0}
                  value={groupForm.min_select ?? 0}
                  onChange={e => setGroupForm(f => ({ ...f, min_select: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Max de escolhas</Label>
                <Input
                  type="number" min={1}
                  value={groupForm.max_select ?? 1}
                  onChange={e => setGroupForm(f => ({ ...f, max_select: Number(e.target.value) }))}
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div>
                <Label>Obrigatório?</Label>
                <p className="text-xs text-muted-foreground">Cliente deve escolher pelo menos {groupForm.min_select || 1}</p>
              </div>
              <Switch
                checked={groupForm.is_required ?? false}
                onCheckedChange={(v) => setGroupForm(f => ({ ...f, is_required: v, min_select: v && (f.min_select ?? 0) < 1 ? 1 : f.min_select }))}
              />
            </div>

            {/* Items inline — só aparecem quando grupo já foi salvo */}
            {currentEditing && (
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-sm font-semibold">Itens do grupo</Label>
                {(currentEditing.items?.length ?? 0) === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum item ainda — adicione abaixo.</p>
                ) : (
                  <div className="space-y-1">
                    {currentEditing.items?.map(it => (
                      <div key={it.id} className="flex items-center gap-2 p-2 rounded border bg-card">
                        <span className="flex-1 text-sm">{it.name}</span>
                        {Number(it.price_delta) > 0 && (
                          <Badge variant="secondary" className="text-xs">+{formatCurrency(it.price_delta)}</Badge>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => deleteItemMutation.mutate(it.id)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <Input
                    placeholder="Nome do item (ex: Frango)"
                    value={newItem.name}
                    onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))}
                    onKeyDown={e => {
                      if (e.key === "Enter" && newItem.name.trim()) {
                        addItemMutation.mutate({ group_id: currentEditing.id, ...newItem });
                      }
                    }}
                  />
                  <Input
                    type="number" step="0.01" placeholder="0,00 (opcional)"
                    className="w-32"
                    value={newItem.price_delta || ""}
                    onChange={e => setNewItem(p => ({ ...p, price_delta: Number(e.target.value) }))}
                  />
                  <Button
                    onClick={() => addItemMutation.mutate({ group_id: currentEditing.id, ...newItem })}
                    disabled={!newItem.name.trim() || addItemMutation.isPending}
                  >
                    Adicionar
                  </Button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Fechar</Button>
            <Button onClick={handleSaveGroup} disabled={saveGroupMutation.isPending}>
              {editingGroup ? "Salvar alterações" : "Criar grupo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
