// v1.0.0 — Alerta de pedidos recebidos durante a noite (loja fechada)
// Aparece no Dashboard quando há pedidos scheduled criados nas últimas 12h
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Moon, ArrowRight, X } from "lucide-react";
import { Link } from "react-router-dom";
import { formatCurrency } from "@/lib/currency-formatter";

const STORAGE_KEY = "anafood-night-alert-seen-at";

export function NightOrdersAlert() {
  const { companyId } = useCompanyId();
  const [dismissed, setDismissed] = useState(false);

  // Last seen timestamp (per-device)
  const lastSeen = typeof window !== "undefined"
    ? Number(localStorage.getItem(STORAGE_KEY) || 0)
    : 0;

  const { data: orders = [] } = useQuery({
    queryKey: ["night-orders", companyId, lastSeen],
    queryFn: async () => {
      if (!companyId) return [];
      const cutoff = new Date(Math.max(lastSeen, Date.now() - 12 * 60 * 60 * 1000)).toISOString();
      const { data } = await supabase
        .from("orders")
        .select("id, order_number, customer_name, total, created_at, status, scheduled_for")
        .eq("company_id", companyId)
        .in("status", ["scheduled", "pending"])
        .gte("created_at", cutoff)
        .order("created_at", { ascending: false })
        .limit(20);
      // Filtra só os que foram criados ENTRE last_seen e agora
      return (data || []).filter(o => new Date(o.created_at).getTime() > lastSeen);
    },
    enabled: !!companyId,
    refetchInterval: 60_000,
  });

  // Som ao detectar pedidos novos (uma vez)
  useEffect(() => {
    if (orders.length > 0 && !dismissed) {
      try {
        const audio = new Audio("/sounds/default-notification.mp3");
        audio.volume = 0.6;
        audio.play().catch(() => {});
      } catch {}
    }
  }, [orders.length, dismissed]);

  if (dismissed || orders.length === 0) return null;

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setDismissed(true);
  };

  const totalRevenue = orders.reduce((s, o) => s + (Number(o.total) || 0), 0);

  return (
    <Card className="border-l-4 border-l-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 mb-4">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <div className="bg-indigo-500/10 p-2 rounded-full">
              <Moon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-indigo-900 dark:text-indigo-100">
                {orders.length} pedido{orders.length > 1 ? "s" : ""} recebido{orders.length > 1 ? "s" : ""} durante a noite
              </h3>
              <p className="text-sm text-indigo-800 dark:text-indigo-200 mt-1">
                Total: <strong>{formatCurrency(totalRevenue)}</strong> · Chegaram pelo cardápio digital enquanto a loja estava fechada
              </p>

              <div className="mt-3 space-y-1.5 max-h-40 overflow-y-auto">
                {orders.slice(0, 5).map(o => (
                  <div key={o.id} className="flex items-center justify-between text-sm bg-background/60 rounded px-2 py-1">
                    <span className="font-medium">#{o.order_number} — {o.customer_name}</span>
                    <span className="text-muted-foreground">{formatCurrency(Number(o.total))}</span>
                  </div>
                ))}
                {orders.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center">+{orders.length - 5} pedidos</p>
                )}
              </div>

              <div className="flex gap-2 mt-3">
                <Button asChild size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                  <Link to="/orders">
                    Ver no Kanban <ArrowRight className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
                <Button size="sm" variant="outline" onClick={handleDismiss}>
                  Já vi
                </Button>
              </div>
            </div>
          </div>
          <Button size="icon" variant="ghost" onClick={handleDismiss} className="h-7 w-7 text-muted-foreground">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
