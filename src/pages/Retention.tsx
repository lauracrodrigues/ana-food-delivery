// v1.0.0 — Política de retenção LGPD + execução manual de limpeza + audit log
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/use-user-role";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Trash2, Eye, Save, Loader2, AlertTriangle } from "lucide-react";

interface RetentionPolicy {
  msg_history_days: number;
  abandoned_state_hours: number;
  soft_deleted_grace_days: number;
  logs_days: number;
  anonymize_orders_after_days: number;
  customer_locations_days: number;
  expired_coupons_days: number;
  reviews_anonymize_days: number;
}

interface CleanupLog {
  id: string;
  table_name: string;
  action: string;
  rows_affected: number;
  triggered_by: string;
  dry_run: boolean;
  executed_at: string;
}

const DEFAULT_POLICY: RetentionPolicy = {
  msg_history_days: 90,
  abandoned_state_hours: 24,
  soft_deleted_grace_days: 30,
  logs_days: 30,
  anonymize_orders_after_days: 1825,
  customer_locations_days: 180,
  expired_coupons_days: 90,
  reviews_anonymize_days: 730,
};

const FIELDS: { key: keyof RetentionPolicy; label: string; unit: string; help: string }[] = [
  { key: "msg_history_days",            label: "Conversas WhatsApp",       unit: "dias",  help: "Apaga mensagens antigas. Padrão: 90 dias." },
  { key: "abandoned_state_hours",       label: "Pedidos abandonados",      unit: "horas", help: "Reseta carrinhos não finalizados. Padrão: 24h." },
  { key: "soft_deleted_grace_days",     label: "Soft-delete grace",        unit: "dias",  help: "Cliente pediu pra excluir — apaga de vez após. Padrão: 30 dias." },
  { key: "customer_locations_days",     label: "Localizações GPS",         unit: "dias",  help: "Histórico de GPS do cliente. Padrão: 180 dias." },
  { key: "anonymize_orders_after_days", label: "Anonimizar pedidos",       unit: "dias",  help: "Mantém valor/produtos, remove nome/telefone/endereço. Padrão: 1825 (5 anos — exigência fiscal)." },
  { key: "expired_coupons_days",        label: "Cupons expirados",         unit: "dias",  help: "Desativa cupons vencidos há X dias. Padrão: 90." },
  { key: "reviews_anonymize_days",      label: "Anonimizar avaliações",    unit: "dias",  help: "Remove telefone de avaliações antigas. Padrão: 730 (2 anos)." },
  { key: "logs_days",                   label: "Logs aplicação",           unit: "dias",  help: "Padrão: 30 dias." },
];

const ACTION_LABELS: Record<string, string> = {
  delete: "Deletados",
  reset: "Resetados",
  anonymize: "Anonimizados",
  hard_delete: "Excluídos definitivos",
  deactivate: "Desativados",
  export: "Exportação",
  customer_delete: "Exclusão cliente (LGPD)",
};

interface RetentionProps {
  embedded?: boolean; // true = renderizado dentro de Settings tab (sem padding/header próprio)
}

export default function Retention({ embedded = false }: RetentionProps = {}) {
  const { companyId } = useUserRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [policy, setPolicy] = useState<RetentionPolicy>(DEFAULT_POLICY);
  const [dirty, setDirty] = useState(false);
  const [running, setRunning] = useState(false);

  // Carrega policy atual
  useQuery({
    queryKey: ["retention-policy", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data } = await supabase.from("companies").select("retention_policy").eq("id", companyId).single();
      if (data?.retention_policy) {
        setPolicy({ ...DEFAULT_POLICY, ...(data.retention_policy as any) });
      }
      return data;
    },
    enabled: !!companyId,
  });

  // Audit log
  const { data: logs = [] } = useQuery({
    queryKey: ["cleanup-log", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from("data_cleanup_log" as any)
        .select("*")
        .eq("company_id", companyId)
        .order("executed_at", { ascending: false })
        .limit(50);
      return (data || []) as unknown as CleanupLog[];
    },
    enabled: !!companyId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Empresa não identificada");
      const { error } = await supabase.from("companies").update({ retention_policy: policy }).eq("id", companyId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Política salva!" });
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ["retention-policy"] });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  // Executa limpeza
  const handleRun = async (dryRun: boolean) => {
    if (!companyId) return;
    setRunning(true);
    try {
      const { data, error } = await supabase.rpc("cleanup_expired_data" as any, {
        p_company_id: companyId,
        p_dry_run: dryRun,
        p_categories: null,
      });
      if (error) throw new Error(error.message);

      const result = data as any;
      const totals = Object.entries(result || {})
        .filter(([k, v]) => typeof v === "number" && v > 0)
        .map(([k, v]) => `${k}: ${v}`)
        .join(" · ");

      toast({
        title: dryRun ? "Dry-run (simulação)" : "Limpeza executada",
        description: totals || "Nada pra limpar agora.",
      });
      queryClient.invalidateQueries({ queryKey: ["cleanup-log"] });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className={embedded ? "space-y-6" : "p-6 max-w-5xl mx-auto space-y-6"}>
      {!embedded && (
        <div className="flex items-center gap-3">
          <Shield className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Retenção de Dados (LGPD)</h1>
            <p className="text-sm text-muted-foreground">Política de limpeza automática + audit log de cumprimento</p>
          </div>
        </div>
      )}

      {/* Política */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Política de Retenção</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FIELDS.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <Label>{f.label}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    value={policy[f.key]}
                    onChange={(e) => {
                      setPolicy({ ...policy, [f.key]: parseInt(e.target.value, 10) || 0 });
                      setDirty(true);
                    }}
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground">{f.unit}</span>
                </div>
                <p className="text-xs text-muted-foreground">{f.help}</p>
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <Button onClick={() => saveMutation.mutate()} disabled={!dirty || saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar política
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Execução manual */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Executar limpeza agora</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 rounded-lg p-3 flex gap-2 items-start">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <strong>Faça dry-run primeiro.</strong> Simulação mostra o que seria limpo sem deletar nada.
              Cron automático roda diariamente às 4h da manhã.
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleRun(true)} disabled={running}>
              {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Eye className="h-4 w-4 mr-2" />}
              Dry-run (simulação)
            </Button>
            <Button variant="destructive" onClick={() => handleRun(false)} disabled={running}>
              {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Executar limpeza real
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Audit log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Audit Log (últimas 50 execuções)</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma execução ainda.</p>
          ) : (
            <div className="space-y-1.5">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between text-sm border-b last:border-0 py-1.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.executed_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                    </span>
                    <span className="font-medium truncate">{log.table_name}</span>
                    <span className="text-xs text-muted-foreground">{ACTION_LABELS[log.action] || log.action}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${log.dry_run ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                      {log.dry_run ? "simulação" : "real"}
                    </span>
                    <span className="font-mono font-semibold w-12 text-right">{log.rows_affected}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
