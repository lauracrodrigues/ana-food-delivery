// v1.0.0 — Painel "Automações" — regras de auto-avanço de status por timeout
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Clock, ArrowRight, Zap } from "lucide-react";

interface Rule {
  id: string;
  from_status: string;
  to_status: string;
  timeout_minutes: number;
  enabled: boolean;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:    { label: "Pendente",    color: "bg-amber-500" },
  confirmed:  { label: "Confirmado",  color: "bg-blue-500" },
  preparing:  { label: "Preparando",  color: "bg-indigo-500" },
  ready:      { label: "Pronto",      color: "bg-emerald-500" },
};

export function AutomationRulesTab() {
  const { companyId } = useCompanyId();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: rules = [], isLoading } = useQuery<Rule[]>({
    queryKey: ["automation-rules", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("order_automation_rules")
        .select("*")
        .eq("company_id", companyId)
        .order("from_status");
      if (error) throw error;
      return data as Rule[];
    },
    enabled: !!companyId,
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Rule> }) => {
      const { error } = await supabase.from("order_automation_rules")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["automation-rules"] }),
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-5 w-5 text-emerald-500" />
            Automação de Status
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Avança status automaticamente após o tempo definido. Útil quando ninguém está no PDV.
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin mx-auto" />
          ) : rules.length === 0 ? (
            <p className="text-sm text-center text-muted-foreground py-6">
              Nenhuma regra configurada ainda.
            </p>
          ) : (
            <div className="space-y-3">
              {rules.map((r) => {
                const fromLbl = STATUS_LABELS[r.from_status] || { label: r.from_status, color: "bg-slate-500" };
                const toLbl   = STATUS_LABELS[r.to_status]   || { label: r.to_status, color: "bg-slate-500" };
                return (
                  <div key={r.id} className="flex items-center justify-between gap-3 p-3 border rounded-lg">
                    <div className="flex items-center gap-2 flex-1">
                      <span className={`px-2 py-0.5 rounded-md text-xs text-white ${fromLbl.color}`}>
                        {fromLbl.label}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className={`px-2 py-0.5 rounded-md text-xs text-white ${toLbl.color}`}>
                        {toLbl.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        type="number"
                        min={1}
                        max={120}
                        value={r.timeout_minutes}
                        onChange={(e) => update.mutate({
                          id: r.id,
                          patch: { timeout_minutes: Math.max(1, Number(e.target.value)) }
                        })}
                        className="w-20 h-8 text-sm"
                        disabled={!r.enabled}
                      />
                      <span className="text-xs text-muted-foreground">min</span>
                    </div>

                    <Switch
                      checked={r.enabled}
                      onCheckedChange={(v) => update.mutate({ id: r.id, patch: { enabled: v } })}
                    />
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-300">
            <p className="font-medium mb-1">⚠️ Atenção:</p>
            <p>
              O auto-avanço considera o último update do pedido. Se ninguém alterou em <b>X minutos</b>,
              o sistema avança sozinho. Recomendado para cliente que opera sem ninguém no PDV.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
