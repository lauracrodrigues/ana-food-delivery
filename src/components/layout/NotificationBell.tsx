// v1.0.0 — Sino de notificações no header admin (novos pedidos em qualquer página)
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, ShoppingBag, Trash2, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useGlobalOrderNotifications } from "@/hooks/useGlobalOrderNotifications";
import { formatCurrency } from "@/lib/currency-formatter";

// Tempo relativo simples ("há 2 min")
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min}min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `há ${hr}h`;
  const day = Math.floor(hr / 24);
  return `há ${day}d`;
}

export function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  // Pega company_id do usuário logado
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

  if (!companyId) return null;

  const handleClick = (notifId: string, orderId: string) => {
    markAsRead(notifId);
    setOpen(false);
    navigate("/orders");
    // Highlight do pedido específico ficaria via state — deixar pra depois
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9"
          aria-label={`${unreadCount} notificações não lidas`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center leading-none animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="font-semibold text-sm">Notificações</span>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full font-medium">
                {unreadCount}
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
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={clear} title="Limpar tudo">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Lista */}
        <ScrollArea className="h-80">
          {notifications.length === 0 ? (
            <div className="text-center py-8 px-4">
              <Bell className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm text-muted-foreground">Sem novos pedidos</p>
              <p className="text-xs text-muted-foreground mt-1">
                Notificações aparecem aqui em tempo real
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n.id, n.order_id)}
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
                        {n.type === "table" && " · Mesa"}
                        {n.type === "delivery" && " · Entrega"}
                        {n.type === "pickup" && " · Retirada"}
                      </p>
                    </div>
                    {!n.read && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-2" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
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
