// v1.0.0 — Config ordenação do cardápio público
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDownAZ } from "lucide-react";

type SortMode = "manual" | "alphabetical" | "price_asc" | "price_desc" | "newest";

const OPTIONS: { value: SortMode; label: string; desc: string }[] = [
  { value: "manual",       label: "Manual",         desc: "Usa o campo display_order definido em cada produto" },
  { value: "alphabetical", label: "Alfabética (A-Z)", desc: "Ordem alfabética pelo nome" },
  { value: "price_asc",    label: "Preço crescente", desc: "Mais barato primeiro" },
  { value: "price_desc",   label: "Preço decrescente", desc: "Mais caro primeiro" },
  { value: "newest",       label: "Mais recentes",   desc: "Produtos novos no topo" },
];

export function MenuSortConfig() {
  const { companyId } = useCompanyId();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["store-settings-sort", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data } = await supabase
        .from("store_settings")
        .select("menu_sort_mode")
        .eq("company_id", companyId)
        .maybeSingle();
      return data;
    },
    enabled: !!companyId,
  });

  const current = ((data as any)?.menu_sort_mode || "manual") as SortMode;

  const mutate = useMutation({
    mutationFn: async (mode: SortMode) => {
      if (!companyId) throw new Error("Empresa não encontrada");
      const { error } = await supabase.from("store_settings").upsert(
        { company_id: companyId, menu_sort_mode: mode, updated_at: new Date().toISOString() },
        { onConflict: "company_id" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["store-settings-sort", companyId] });
      toast({ title: "Ordenação atualizada ✓" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowDownAZ className="h-5 w-5" />
          Ordem dos Produtos no Cardápio
        </CardTitle>
        <CardDescription>
          Define como os produtos aparecem listados no cardápio digital pra os clientes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label>Modo de ordenação</Label>
          <Select value={current} onValueChange={(v) => mutate.mutate(v as SortMode)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>
                  <div className="flex flex-col">
                    <span className="font-medium">{o.label}</span>
                    <span className="text-xs text-muted-foreground">{o.desc}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
