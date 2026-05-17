// v1.0.0 — Alerta de chamadas de garçom pendentes (no topo da página Orders)
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Bell, Check, X, HelpCircle, Receipt, Droplet, MoreHorizontal } from "lucide-react";

interface WaiterCall {
  id: string;
  table_number: string;
  reason: string;
  status: string;
  created_at: string;
}

interface WaiterCallsAlertProps {
  companyId: string;
}

const REASON_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  help:  { label: "Ajuda",  icon: HelpCircle,       color: "text-blue-600" },
  bill:  { label: "Conta",  icon: Receipt,          color: "text-green-600" },
  water: { label: "Água",   icon: Droplet,          color: "text-cyan-600" },
  other: { label: "Outro",  icon: MoreHorizontal,   color: "text-muted-foreground" },
};

export function WaiterCallsAlert({ companyId }: WaiterCallsAlertProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [audioPlayed, setAudioPlayed] = useState<Set<string>>(new Set());

  const { data: calls = [] } = useQuery({
    queryKey: ["waiter-calls", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase
        .from("waiter_calls" as any)
        .select("*")
        .eq("company_id", companyId)
        .eq("status", "pending")
        .order("created_at", { ascending: true });
      return (data || []) as unknown as WaiterCall[];
    },
    enabled: !!companyId,
    refetchInterval: 5000, // poll a cada 5s
  });

  // Realtime subscription pra notificação imediata
  useEffect(() => {
    if (!companyId) return;
    const channel = supabase
      .channel(`waiter_calls:${companyId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "waiter_calls", filter: `company_id=eq.${companyId}` },
        () => qc.invalidateQueries({ queryKey: ["waiter-calls", companyId] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [companyId, qc]);

  // Toca beep ao receber nova chamada
  useEffect(() => {
    calls.forEach(call => {
      if (!audioPlayed.has(call.id)) {
        try {
          const audio = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=");
          audio.volume = 0.5;
          audio.play().catch(() => {});
        } catch {}
        setAudioPlayed(prev => new Set(prev).add(call.id));
      }
    });
  }, [calls, audioPlayed]);

  const handleResolve = async (callId: string) => {
    const { error } = await supabase
      .from("waiter_calls" as any)
      .update({ status: "resolved", resolved_at: new Date().toISOString() })
      .eq("id", callId);
    if (error) {
      toast({ title: "Erro ao resolver", variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["waiter-calls", companyId] });
    toast({ title: "Chamada resolvida" });
  };

  if (calls.length === 0) return null;

  return (
    <div className="bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-300 rounded-xl p-3 mb-4 animate-pulse-once">
      <div className="flex items-center gap-2 mb-2">
        <Bell className="h-5 w-5 text-amber-600 animate-bounce" />
        <h3 className="font-bold text-amber-800 dark:text-amber-200">
          {calls.length} chamada{calls.length > 1 ? "s" : ""} de garçom pendente{calls.length > 1 ? "s" : ""}
        </h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {calls.map((call) => {
          const cfg = REASON_LABELS[call.reason] || REASON_LABELS.help;
          const Icon = cfg.icon;
          const minutesAgo = Math.floor((Date.now() - new Date(call.created_at).getTime()) / 60000);
          return (
            <div key={call.id} className="bg-white dark:bg-card rounded-lg p-2.5 border border-amber-200 flex items-center gap-2">
              <Icon className={`h-5 w-5 ${cfg.color} shrink-0`} />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">Mesa {call.table_number}</p>
                <p className="text-xs text-muted-foreground">
                  {cfg.label} · há {minutesAgo === 0 ? "agora" : `${minutesAgo}m`}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleResolve(call.id)}
                className="h-7 w-7 p-0 text-green-600"
                aria-label="Atendido"
              >
                <Check className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
