// v1.0.0 — Configura grupo WhatsApp pra notificar pedidos prontos (backup)
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RefreshCw, MessageCircle, Users } from "lucide-react";

const API_BASE = "https://api.anafood.vip";

interface Group { jid: string; name: string; participants_count: number; }

export function WhatsAppGroupTab() {
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  const { data: settings, isLoading } = useQuery<any>({
    queryKey: ["store-settings-wa", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("store_settings")
        .select("wa_delivery_group_jid, wa_delivery_group_enabled, wa_delivery_group_timeout_min")
        .eq("company_id", companyId).maybeSingle();
      return data;
    },
    enabled: !!companyId,
  });

  const update = useMutation({
    mutationFn: async (patch: any) => {
      const { error } = await supabase.from("store_settings")
        .update(patch).eq("company_id", companyId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["store-settings-wa"] }),
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  async function fetchGroups() {
    setLoadingGroups(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const r = await fetch(`${API_BASE}/api/deliveries/wa-groups`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.detail || j.error);
      setGroups(j.groups || []);
      toast({ title: `${j.groups?.length || 0} grupos encontrados` });
    } catch (e: any) {
      toast({ title: "Falha ao buscar grupos", description: e.message, variant: "destructive" });
    } finally {
      setLoadingGroups(false);
    }
  }

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin mx-auto" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-emerald-500" />
          Backup: avisar grupo WhatsApp dos entregadores
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Se um pedido fica pronto sem entregador por X minutos, o sistema posta no grupo WhatsApp com endereço e dados.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div>
            <Label className="text-sm font-medium">Ativar backup grupo WhatsApp</Label>
            <p className="text-xs text-muted-foreground">Posta pedido no grupo se ficar parado</p>
          </div>
          <Switch
            checked={!!settings?.wa_delivery_group_enabled}
            onCheckedChange={(v) => update.mutate({ wa_delivery_group_enabled: v })}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm">Grupo escolhido</Label>
            <Button onClick={fetchGroups} disabled={loadingGroups} size="sm" variant="outline" className="gap-1 text-xs">
              {loadingGroups ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Buscar grupos
            </Button>
          </div>
          <Select
            value={settings?.wa_delivery_group_jid || ""}
            onValueChange={(v) => update.mutate({ wa_delivery_group_jid: v })}
            disabled={!settings?.wa_delivery_group_enabled}
          >
            <SelectTrigger>
              <SelectValue placeholder={groups.length ? "Selecione um grupo" : "Clique em 'Buscar grupos' primeiro"} />
            </SelectTrigger>
            <SelectContent>
              {groups.map(g => (
                <SelectItem key={g.jid} value={g.jid}>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" /> {g.name} ({g.participants_count})
                  </span>
                </SelectItem>
              ))}
              {/* Se já tem JID salvo mas grupos não carregados, exibe */}
              {settings?.wa_delivery_group_jid && !groups.find(g => g.jid === settings.wa_delivery_group_jid) && (
                <SelectItem value={settings.wa_delivery_group_jid}>{settings.wa_delivery_group_jid}</SelectItem>
              )}
            </SelectContent>
          </Select>
          <p className="text-[10px] text-muted-foreground mt-1">
            Grupos do WhatsApp conectado à sua loja. O bot precisa estar dentro do grupo.
          </p>
        </div>

        <div>
          <Label className="text-sm">Avisar após (minutos sem entregador)</Label>
          <Input
            type="number" min={1} max={60}
            value={settings?.wa_delivery_group_timeout_min ?? 5}
            onChange={(e) => update.mutate({ wa_delivery_group_timeout_min: Math.max(1, Number(e.target.value)) })}
            disabled={!settings?.wa_delivery_group_enabled}
            className="w-24 mt-1"
          />
        </div>

        <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded text-xs text-blue-300">
          <p className="font-medium mb-1">💡 Como funciona:</p>
          <p>Pedido fica em status "pronto" sem entregador → após X min → bot posta no grupo com endereço completo, telefone do cliente e valor. Entregadores do grupo veem e podem ir buscar.</p>
        </div>
      </CardContent>
    </Card>
  );
}
