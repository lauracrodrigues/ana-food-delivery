// v1.0.0 — Configuração de alertas de saldo API
// Admin define budget mensal por provider + threshold + WhatsApp pra alerta
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Loader2, Plus, Edit, Trash2, Bell, AlertTriangle, CheckCircle } from "lucide-react";

interface Alert {
  id: string;
  provider: string;
  monthly_budget_usd: number;
  alert_threshold_pct: number;
  alert_phone: string;
  alert_instance: string;
  enabled: boolean;
  last_alerted_at: string | null;
  last_usage_pct: number;
}

const PROVIDERS = [
  { value: "openai",    label: "OpenAI (GPT, Whisper)" },
  { value: "google",    label: "Google (TTS, Gemini)" },
  { value: "anthropic", label: "Anthropic (Claude)" },
  { value: "gemini",    label: "Gemini API" },
  { value: "groq",      label: "Groq" },
];

const empty = (): Partial<Alert> => ({
  provider: "openai",
  monthly_budget_usd: 20,
  alert_threshold_pct: 90,
  alert_phone: "",
  alert_instance: "Mais Sistem",
  enabled: true,
});

export function BillingAlertsTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState<Partial<Alert> | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  const { data: alerts = [], isLoading } = useQuery<Alert[]>({
    queryKey: ["billing-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_billing_alerts")
        .select("*")
        .order("provider");
      if (error) throw error;
      return data as Alert[];
    },
  });

  // Consumo mês corrente por provider (token_logs)
  const { data: usage = {} } = useQuery<Record<string, number>>({
    queryKey: ["billing-usage-month"],
    queryFn: async () => {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from("token_logs")
        .select("provider, custo_usd")
        .gte("criado_em", monthStart.toISOString());
      const agg: Record<string, number> = {};
      for (const l of data || []) {
        const p = l.provider || "?";
        agg[p] = (agg[p] || 0) + (Number(l.custo_usd) || 0);
      }
      return agg;
    },
    staleTime: 60_000,
  });

  const save = useMutation({
    mutationFn: async (d: Partial<Alert>) => {
      if (d.id) {
        const { error } = await supabase.from("api_billing_alerts").update({
          monthly_budget_usd: d.monthly_budget_usd,
          alert_threshold_pct: d.alert_threshold_pct,
          alert_phone: d.alert_phone,
          alert_instance: d.alert_instance,
          enabled: d.enabled,
        }).eq("id", d.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("api_billing_alerts").insert({
          provider: d.provider,
          monthly_budget_usd: d.monthly_budget_usd,
          alert_threshold_pct: d.alert_threshold_pct,
          alert_phone: d.alert_phone,
          alert_instance: d.alert_instance,
          enabled: d.enabled,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing-alerts"] });
      toast({ title: "Alerta salvo" });
      setShowDialog(false);
      setEditing(null);
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("api_billing_alerts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing-alerts"] });
      toast({ title: "Alerta removido" });
    },
  });

  // Simula envio teste
  const sendTest = useMutation({
    mutationFn: async (a: Alert) => {
      const { data, error } = await supabase.functions.invoke("send-billing-alert", {
        body: { alert_id: a.id, test: true },
      });
      if (error || !data?.success) throw new Error(data?.error || error?.message || "Falha");
    },
    onSuccess: () => toast({ title: "Alerta teste enviado pelo WhatsApp" }),
    onError: (e: any) => toast({ title: "Erro envio", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Bell className="h-5 w-5" /> Alertas de Saldo de API
          </h3>
          <p className="text-xs text-muted-foreground">
            Define orçamento mensal por provider. Recebe WhatsApp quando atingir % do limite.
          </p>
        </div>
        <Button size="sm" onClick={() => { setEditing(empty()); setShowDialog(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Novo alerta
        </Button>
      </div>

      {isLoading ? (
        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
      ) : alerts.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">
          Nenhum alerta configurado. Clique em "Novo alerta" pra começar.
        </CardContent></Card>
      ) : (
        <Card>
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead className="text-right">Budget</TableHead>
                  <TableHead className="text-right">Uso mês</TableHead>
                  <TableHead className="text-right">%</TableHead>
                  <TableHead>Alerta</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((a) => {
                  const used = usage[a.provider] || 0;
                  const pct = a.monthly_budget_usd > 0 ? (used / a.monthly_budget_usd) * 100 : 0;
                  const triggered = pct >= a.alert_threshold_pct;
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium capitalize">{a.provider}</TableCell>
                      <TableCell className="text-right tabular-nums">${a.monthly_budget_usd.toFixed(2)}</TableCell>
                      <TableCell className="text-right tabular-nums">${used.toFixed(4)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        <Badge variant={triggered ? "destructive" : pct > 50 ? "default" : "secondary"}>
                          {pct.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{a.alert_threshold_pct}%</TableCell>
                      <TableCell className="font-mono text-xs">{a.alert_phone}</TableCell>
                      <TableCell>
                        {!a.enabled ? <Badge variant="outline">Desativado</Badge>
                          : triggered ? <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Acima do limite</Badge>
                          : <Badge variant="secondary" className="gap-1"><CheckCircle className="h-3 w-3" />OK</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => sendTest.mutate(a)} title="Enviar alerta teste">
                            <Bell className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setEditing(a); setShowDialog(true); }}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { if (confirm("Remover?")) del.mutate(a.id); }}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={showDialog} onOpenChange={(v) => { if (!v) { setShowDialog(false); setEditing(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar alerta" : "Novo alerta"}</DialogTitle>
          </DialogHeader>

          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Provider</Label>
                <Select
                  value={editing.provider || "openai"}
                  onValueChange={(v) => setEditing({ ...editing, provider: v })}
                  disabled={!!editing.id}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Orçamento mensal (USD)</Label>
                <CurrencyInput
                  value={editing.monthly_budget_usd ?? 20}
                  onChange={(v) => setEditing({ ...editing, monthly_budget_usd: v })}
                  placeholder="$ 0.00"
                />
                <p className="text-xs text-muted-foreground mt-1">Quanto você colocou de saldo / quer gastar no mês</p>
              </div>
              <div>
                <Label>Avisar quando atingir (%)</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={editing.alert_threshold_pct ?? 90}
                  onChange={(e) => setEditing({ ...editing, alert_threshold_pct: Number(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground mt-1">90 = avisa quando faltar 10% do saldo</p>
              </div>
              <div>
                <Label>WhatsApp pra receber alerta</Label>
                <Input
                  value={editing.alert_phone || ""}
                  onChange={(e) => setEditing({ ...editing, alert_phone: e.target.value.replace(/\D/g, "") })}
                  placeholder="556292271019"
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground mt-1">DDI + DDD + número (só dígitos)</p>
              </div>
              <div>
                <Label>Instância Evolution (quem envia)</Label>
                <Input
                  value={editing.alert_instance || "Mais Sistem"}
                  onChange={(e) => setEditing({ ...editing, alert_instance: e.target.value })}
                  placeholder="Mais Sistem"
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label>Alerta ativo</Label>
                <Switch
                  checked={editing.enabled ?? true}
                  onCheckedChange={(v) => setEditing({ ...editing, enabled: v })}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDialog(false); setEditing(null); }}>Cancelar</Button>
            <Button onClick={() => editing && save.mutate(editing)} disabled={save.isPending}>
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
