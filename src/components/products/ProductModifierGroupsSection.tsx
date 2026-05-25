// v1.0.0 — Aba "Acompanhamentos" no produto
// Permite vincular grupos de opções a um produto + override min/max
// Fase 3 do plano catalogo-modifiers
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Layers, X, Plus, ArrowUp, ArrowDown } from "lucide-react";
import { CreateModifierGroupDialog } from "./CreateModifierGroupDialog";

interface ModifierGroup {
  id: string;
  name: string;
  display_type: string;
  min_select: number;
  max_select: number;
  is_required: boolean;
}

interface ProductGroupLink {
  product_id: string;
  group_id: string;
  min_override: number | null;
  max_override: number | null;
  sort_order: number;
  group?: ModifierGroup;
}

interface Props {
  productId: string;
}

export function ProductModifierGroupsSection({ productId }: Props) {
  const { companyId } = useCompanyId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);

  // Todos grupos da empresa (pra opções de adicionar)
  const { data: allGroups = [] } = useQuery({
    queryKey: ["modifier-groups", companyId],
    queryFn: async (): Promise<ModifierGroup[]> => {
      if (!companyId) return [];
      const { data } = await supabase
        .from("modifier_groups" as any)
        .select("id, name, display_type, min_select, max_select, is_required")
        .eq("company_id", companyId)
        .order("name");
      return (data as any) ?? [];
    },
    enabled: !!companyId,
  });

  // Grupos vinculados a este produto
  const { data: links = [], isLoading } = useQuery({
    queryKey: ["product-modifier-groups", productId],
    queryFn: async (): Promise<ProductGroupLink[]> => {
      const { data: rels } = await supabase
        .from("product_modifier_groups" as any)
        .select("*")
        .eq("product_id", productId)
        .order("sort_order");
      const list = (rels as any[]) ?? [];
      // Combina com grupos (single query, in)
      const ids = list.map(l => l.group_id);
      if (ids.length === 0) return list as any;
      const { data: groups } = await supabase
        .from("modifier_groups" as any)
        .select("id, name, display_type, min_select, max_select, is_required")
        .in("id", ids);
      return list.map(l => ({
        ...l,
        group: (groups as any[] || []).find(g => g.id === l.group_id),
      }));
    },
    enabled: !!productId,
  });

  // Adiciona grupo ao produto
  const addLinkMutation = useMutation({
    mutationFn: async (group_id: string) => {
      const nextOrder = links.length;
      const { error } = await supabase.from("product_modifier_groups" as any).insert({
        product_id: productId,
        group_id,
        sort_order: nextOrder,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["product-modifier-groups", productId] }),
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  // Remove vínculo
  const removeLinkMutation = useMutation({
    mutationFn: async (group_id: string) => {
      const { error } = await supabase
        .from("product_modifier_groups" as any)
        .delete()
        .eq("product_id", productId)
        .eq("group_id", group_id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["product-modifier-groups", productId] }),
  });

  // Atualiza override / sort
  const updateLinkMutation = useMutation({
    mutationFn: async ({ group_id, patch }: { group_id: string; patch: Partial<ProductGroupLink> }) => {
      const { error } = await supabase
        .from("product_modifier_groups" as any)
        .update(patch)
        .eq("product_id", productId)
        .eq("group_id", group_id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["product-modifier-groups", productId] }),
  });

  const reorder = async (idx: number, dir: -1 | 1) => {
    const target = links[idx + dir];
    if (!target) return;
    const current = links[idx];
    await Promise.all([
      updateLinkMutation.mutateAsync({ group_id: current.group_id, patch: { sort_order: target.sort_order } }),
      updateLinkMutation.mutateAsync({ group_id: target.group_id, patch: { sort_order: current.sort_order } }),
    ]);
  };

  // Grupos disponíveis pra adicionar (exclui já vinculados)
  const linkedIds = new Set(links.map(l => l.group_id));
  const available = allGroups.filter(g => !linkedIds.has(g.id));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Grupos de Opções Vinculados</span>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1">
          <Plus className="h-3 w-3" /> Novo grupo
        </Button>
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Carregando...</p>
      ) : links.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Nenhum grupo vinculado a este produto.</p>
            <p className="text-xs text-muted-foreground mt-1">Adicione grupos abaixo pra permitir customização.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {links.map((link, idx) => {
            const g = link.group;
            if (!g) return null;
            const effMin = link.min_override ?? g.min_select;
            const effMax = link.max_override ?? g.max_select;
            return (
              <div key={link.group_id} className="flex items-center gap-2 p-2 rounded-lg border bg-card">
                <div className="flex flex-col">
                  <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => reorder(idx, -1)} disabled={idx === 0}>
                    <ArrowUp className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => reorder(idx, 1)} disabled={idx === links.length - 1}>
                    <ArrowDown className="h-3 w-3" />
                  </Button>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{g.name}</span>
                    <Badge variant="outline" className="text-xs capitalize">{g.display_type}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Padrão grupo: {g.min_select}–{g.max_select} · Efetivo aqui: <strong>{effMin}–{effMax}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <Input
                    type="number" min={0}
                    className="h-7 w-14 text-xs"
                    placeholder={String(g.min_select)}
                    value={link.min_override ?? ""}
                    onChange={e => {
                      const v = e.target.value === "" ? null : Number(e.target.value);
                      updateLinkMutation.mutate({ group_id: link.group_id, patch: { min_override: v } });
                    }}
                    title="Override mínimo (vazio = usar do grupo)"
                  />
                  <span className="text-muted-foreground text-xs">–</span>
                  <Input
                    type="number" min={1}
                    className="h-7 w-14 text-xs"
                    placeholder={String(g.max_select)}
                    value={link.max_override ?? ""}
                    onChange={e => {
                      const v = e.target.value === "" ? null : Number(e.target.value);
                      updateLinkMutation.mutate({ group_id: link.group_id, patch: { max_override: v } });
                    }}
                    title="Override máximo (vazio = usar do grupo)"
                  />
                </div>

                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeLinkMutation.mutate(link.group_id)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Adicionar grupo */}
      {available.length > 0 && (
        <div className="flex gap-2">
          <Select onValueChange={(v) => addLinkMutation.mutate(v)}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Adicionar grupo de opções..." />
            </SelectTrigger>
            <SelectContent>
              {available.map(g => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name} ({g.display_type}, {g.min_select}-{g.max_select})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {allGroups.length === 0 && links.length === 0 && (
        <Card className="border-dashed bg-muted/30">
          <CardContent className="p-4 text-center space-y-2">
            <Plus className="h-5 w-5 mx-auto opacity-50" />
            <p className="text-sm text-muted-foreground">Nenhum grupo cadastrado ainda.</p>
            <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
              Criar primeiro grupo
            </Button>
          </CardContent>
        </Card>
      )}

      <CreateModifierGroupDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        productId={productId}
        nextSortOrder={links.length}
      />
    </div>
  );
}
