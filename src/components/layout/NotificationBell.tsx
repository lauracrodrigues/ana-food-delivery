// v2.0.0 — Sino com alertas de atenção (insatisfação + atendente humano)
// Animação shake quando há alertas critical pendentes.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, ShoppingBag, Trash2, CheckCheck, AlertTriangle, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGlobalOrderNotifications } from "@/hooks/useGlobalOrderNotifications";
import { formatCurrency } from "@/lib/currency-formatter";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min}min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `há ${hr}h`;
  return `há ${Math.floor(hr / 24)}d`;
}

interface FallbackAlert {
  id: string;
  phone: string;
  motivo: string;
  severity: "info" | "warning" | "critical";
  contexto: string | null;
  detectado_em: string;
}

export function NotificationBell() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: companyId } = useQuery({
    queryKey: ["notif-company-id"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();
      return data?.company_id ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { notifications, unreadCount, markAsRead, markAllAsRead, clear } = useGlobalOrderNotifications(companyId);

  // Alertas pendentes (cliente pediu atendente humano OR insatisfação OR fora-do-escopo)
  const { data: alerts = [] } = useQuery<FallbackAlert[]>({
    queryKey: ["fallback-alerts", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase
        .from("fallback_atendente")
        .select("id, phone, motivo, severity, contexto, detectado_em")
        .eq("company_id", companyId)
        .eq("resolvido", false)
        .order("detectado_em", { ascending: false })
        .limit(20);
      return (data || []) as any;
    },
    enabled: !!companyId,
    refetchInterval: 30_000,
  });

  // Realtime: novo alerta → invalida cache + anima
  useEffect(() => {
    if (!companyId) return;
    const ch = supabase
      .channel(`fallback-${companyId}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "fallback_atendente",
        filter: `company_id=eq.${companyId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["fallback-alerts", companyId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [companyId, queryClient]);

  if (!companyId) return null;

  const criticalCount = alerts.filter(a => a.severity === "critical").length;
  const warningCount = alerts.filter(a => a.severity === "warning").length;
  const totalUnread = unreadCount + alerts.length;
  const hasCritical = criticalCount > 0;

  const handleClick = (notifId: string) => {
    markAsRead(notifId);
    setOpen(false);
    navigate("/orders");
  };

  const resolveAlert = async (id: string) => {
    await supabase.from("fallback_atendente")
      .update({ resolvido: true, resolvido_em: new Date().toISOString() })
      .eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["fallback-alerts", companyId] });
  };

  // Abre conversa do cliente direto no WhatsApp Web + marca alerta resolvido
  const openWhatsAppAndResolve = async (alertId: string, phone: string) => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length >= 10) {
      window.open(`https://web.whatsapp.com/send?phone=${digits}`, "_blank", "noopener,noreferrer");
    }
    await resolveAlert(alertId);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9"
          aria-label={`${totalUnread} notificações não lidas`}
        >
          {/* Shake só no ícone do sino, não no botão inteiro (badge + popover ficam legíveis) */}
          <Bell className={`h-5 w-5 ${hasCritical ? "text-red-500 animate-shake" : ""}`} />
          {totalUnread > 0 && (
            <span
              className={`absolute -top-0.5 -right-0.5 text-white text-[10px] font-bold min-w-[1rem] h-4 px-0.5 rounded-full flex items-center justify-center leading-none ${
                hasCritical ? "bg-red-600 animate-pulse" : "bg-red-500"
              }`}
            >
              {totalUnread > 9 ? "9+" : totalUnread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="font-semibold text-sm">Notificações</span>
            {totalUnread > 0 && (
              <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full font-medium">
                {totalUnread}
              </span>
            )}
          </div>
          <div className="flex gap-1">
            {unreadCount > 0 && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={markAllAsRead} title="Marcar todas como lidas">
                <CheckCheck className="h-3.5 w-3.5" />
              </Button>
            )}
            {notifications.length > 0 && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={clear} title="Limpar pedidos">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="max-h-96">
          {/* Seção: alertas de atenção (cliente precisa atendente / insatisfação) */}
          {alerts.length > 0 && (
            <div className="border-b">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/30">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                <span className="text-xs font-semibold text-amber-900 dark:text-amber-100">
                  Atenção necessária ({alerts.length})
                </span>
              </div>
              <div className="divide-y">
                {alerts.map(a => {
                  const severityBg = a.severity === "critical"
                    ? "bg-red-50 dark:bg-red-950/20 border-l-red-500"
                    : a.severity === "warning"
                    ? "bg-amber-50/50 dark:bg-amber-950/10 border-l-amber-500"
                    : "border-l-blue-500";
                  const motivoLabel = a.motivo === "request_humano" ? "Pediu atendente"
                    : a.motivo === "insatisfacao_detectada" ? "Possível insatisfação"
                    : a.motivo === "fora_escopo" ? "Fora do escopo do bot"
                    : a.motivo === "insistencia_cancelamento" ? "Insistindo em cancelar"
                    : a.motivo;
                  return (
                    <div key={a.id} className={`px-3 py-2 border-l-4 ${severityBg}`}>
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-medium text-sm">{motivoLabel}</span>
                            <Badge variant="outline" className="text-[10px] py-0">
                              {a.severity}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">📞 {a.phone}</p>
                          {a.contexto && (
                            <p className="text-xs italic text-muted-foreground mt-1 line-clamp-2">
                              "{a.contexto}"
                            </p>
                          )}
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {timeAgo(a.detectado_em)}
                          </p>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Button
                            size="sm"
                            variant="default"
                            className="h-7 px-2 text-xs gap-1"
                            onClick={() => openWhatsAppAndResolve(a.id, a.phone)}
                            title="Abrir conversa no WhatsApp Web + marcar resolvido"
                          >
                            <MessageCircle className="h-3 w-3" />
                            Atender
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-xs"
                            onClick={() => resolveAlert(a.id)}
                          >
                            ✓ OK
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Seção: pedidos novos */}
          {notifications.length === 0 && alerts.length === 0 ? (
            <div className="text-center py-8 px-4">
              <Bell className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm text-muted-foreground">Tudo tranquilo por aqui</p>
            </div>
          ) : notifications.length > 0 ? (
            <div className="divide-y">
              <div className="px-3 py-1.5 bg-muted/50">
                <span className="text-xs font-semibold text-muted-foreground">Pedidos recentes</span>
              </div>
              {notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n.id)}
                  className={`w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors ${!n.read ? "bg-blue-50/50 dark:bg-blue-950/20" : ""}`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${!n.read ? "bg-blue-500 text-white" : "bg-muted text-muted-foreground"}`}>
                      <ShoppingBag className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate">
                          Pedido {n.order_number ? `#${n.order_number}` : n.order_id.slice(-6).toUpperCase()}
                        </p>
                        <span className="text-xs text-muted-foreground shrink-0">{timeAgo(n.created_at)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {n.customer_name} · {formatCurrency(n.total)}
                      </p>
                    </div>
                    {!n.read && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-2" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : null}
        </ScrollArea>

        {(notifications.length > 0 || alerts.length > 0) && (
          <div className="border-t px-3 py-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => { setOpen(false); navigate("/orders"); }}
            >
              Ver todos os pedidos
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
