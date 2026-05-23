// v1.1.0 — Painel "Automações": auto-avanço status + retenção de cancelamento
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Clock, ArrowRight, Zap, Gift, Moon } from "lucide-react";

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

      {/* v1.1.0 — Card retenção de cancelamento */}
      <RetentionCard companyId={companyId} />

      {/* v1.2.0 — Card horário silencioso */}
      <QuietHoursCard companyId={companyId} />
    </div>
  );
}

// v1.2.0 — Configura janela silenciosa: bot NÃO envia proativos (lembrete/upsell/etc)
function QuietHoursCard({ companyId }: { companyId: string | undefined }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["company-quiet", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data } = await supabase
        .from("companies")
        .select("quiet_hours_enabled, quiet_start, quiet_end, quiet_sundays, quiet_holidays")
        .eq("id", companyId)
        .maybeSingle();
      return data as any;
    },
    enabled: !!companyId,
  });

  const update = useMutation({
    mutationFn: async (patch: any) => {
      if (!companyId) throw new Error("Sem empresa");
      const { error } = await supabase.from("companies").update(patch).eq("id", companyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-quiet"] });
      toast({ title: "Salvo" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return null;
  const holidays = (data?.quiet_holidays || []) as string[];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Moon className="h-5 w-5 text-indigo-500" />
          Horário Silencioso (Não Perturbe)
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Bot fica MUDO neste horário: NÃO envia lembretes, upsells, alertas de pedido atrasado,
          nem cobrança de títulos. Continua respondendo se cliente mandar mensagem primeiro.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div>
            <Label className="text-sm font-semibold">🌙 Ativar horário silencioso</Label>
            <p className="text-xs text-muted-foreground mt-0.5">Não incomoda cliente fora do expediente</p>
          </div>
          <Switch
            checked={data?.quiet_hours_enabled ?? true}
            onCheckedChange={(v) => update.mutate({ quiet_hours_enabled: v })}
          />
        </div>

        {(data?.quiet_hours_enabled ?? true) && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Início (silêncio começa)</Label>
                <Input
                  type="time"
                  value={data?.quiet_start || "18:00"}
                  onChange={(e) => update.mutate({ quiet_start: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Fim (silêncio termina)</Label>
                <Input
                  type="time"
                  value={data?.quiet_end || "08:00"}
                  onChange={(e) => update.mutate({ quiet_end: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <Label className="text-sm">Bloqueio em domingos</Label>
              <Switch
                checked={data?.quiet_sundays ?? true}
                onCheckedChange={(v) => update.mutate({ quiet_sundays: v })}
              />
            </div>

            <div>
              <Label className="text-xs">Feriados (datas adicionais)</Label>
              <p className="text-[10px] text-muted-foreground mb-2">
                Feriados nacionais fixos (01/01, 21/04, 01/05, 07/09, 12/10, 02/11, 15/11, 25/12) já são bloqueados automaticamente.
                Adicione aqui datas extras (carnaval, recesso, etc).
              </p>
              <div className="flex gap-2">
                <Input
                  type="date"
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const newList = [...new Set([...holidays, e.target.value])].sort();
                    update.mutate({ quiet_holidays: newList });
                    e.target.value = "";
                  }}
                  className="max-w-[180px]"
                />
              </div>
              {holidays.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {holidays.map(d => (
                    <button
                      key={d}
                      onClick={() => update.mutate({ quiet_holidays: holidays.filter(h => h !== d) })}
                      className="text-xs px-2 py-1 bg-muted hover:bg-destructive/10 rounded flex items-center gap-1"
                      title="Remover"
                    >
                      {new Date(d + "T00:00").toLocaleDateString("pt-BR")} ×
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// v1.1.0 — Configuração do cupom de retenção quando cliente cancela pedido
function RetentionCard({ companyId }: { companyId: string | undefined }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["company-retention", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data } = await supabase
        .from("companies")
        .select("cancellation_retention_enabled, cancellation_retention_percent")
        .eq("id", companyId)
        .maybeSingle();
      return data as any;
    },
    enabled: !!companyId,
  });

  const update = useMutation({
    mutationFn: async (patch: { cancellation_retention_enabled?: boolean; cancellation_retention_percent?: number }) => {
      if (!companyId) throw new Error("Sem empresa");
      const { error } = await supabase.from("companies").update(patch).eq("id", companyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-retention"] });
      toast({ title: "Configuração salva" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Gift className="h-5 w-5 text-amber-500" />
          Retenção em Cancelamento (Cupom)
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Quando cliente pedir pra cancelar pedido em preparo/pronto, bot oferece prioridade primeiro.
          Se cliente insistir, oferece cupom de desconto pro próximo pedido — tentativa de manter o cliente.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div>
            <Label className="text-sm font-semibold">🎁 Oferecer cupom ao cancelar</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Cliente que cancela recebe código pra usar no próximo pedido
            </p>
          </div>
          <Switch
            checked={!!data?.cancellation_retention_enabled}
            onCheckedChange={(v) => update.mutate({ cancellation_retention_enabled: v })}
          />
        </div>
        {data?.cancellation_retention_enabled && (
          <div>
            <Label className="text-xs">Desconto do cupom (%)</Label>
            <Input
              type="number" min={5} max={50}
              value={data?.cancellation_retention_percent ?? 15}
              onChange={(e) => {
                const v = Math.max(5, Math.min(50, parseInt(e.target.value) || 15));
                update.mutate({ cancellation_retention_percent: v });
              }}
              className="mt-1 max-w-[120px]"
            />
            <p className="text-[10px] text-muted-foreground mt-1">Sugestão: 10-20%</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
