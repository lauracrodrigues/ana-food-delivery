// v1.0.0 — Card de ofertas de rota agrupada (cluster automático)
import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Route, MapPin, Clock, Package, Loader2 } from "lucide-react";

const API_BASE = "https://api.anafood.vip";

interface Offer {
  id: string;
  order_ids: string[];
  total_distance_km: number;
  est_duration_min: number;
  expires_at: string;
  orders: Array<{ id: string; order_number: any; customer_name: string; address: any; total: number }>;
}

async function authHeader() {
  const { data: { session } } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${session?.access_token}` };
}

function fmtAddr(a: any): string {
  if (!a) return "";
  if (typeof a === "string") return a;
  return [a.street, a.neighborhood].filter(Boolean).join(", ");
}

export function RouteOffersCard({ onAccepted }: { onAccepted: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: offers = [] } = useQuery<Offer[]>({
    queryKey: ["route-offers"],
    queryFn: async () => {
      const r = await fetch(`${API_BASE}/api/deliveries/route-offers`, { headers: await authHeader() });
      const j = await r.json();
      return j.offers || [];
    },
    refetchInterval: 10_000,
  });

  useEffect(() => {
    const ch = supabase.channel("route-offers-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_route_offers" },
        () => queryClient.invalidateQueries({ queryKey: ["route-offers"] })
      ).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [queryClient]);

  const accept = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`${API_BASE}/api/deliveries/route-offers/${id}/accept`, {
        method: "POST",
        headers: await authHeader(),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.detail || j.error);
      return j;
    },
    onSuccess: (j) => {
      toast({ title: `Rota aceita — ${j.count} pedidos!`, description: "Boa entrega." });
      onAccepted();
      queryClient.invalidateQueries({ queryKey: ["route-offers"] });
    },
    onError: (e: any) => toast({ title: "Falha", description: e.message, variant: "destructive" }),
  });

  if (!offers.length) return null;

  return (
    <div className="space-y-2">
      {offers.map((o) => {
        const expiresMs = new Date(o.expires_at).getTime() - Date.now();
        const expiresMin = Math.max(0, Math.round(expiresMs / 60_000));
        return (
          <div key={o.id} className="rounded-xl border-2 border-emerald-500 bg-emerald-500/10 p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-emerald-300 flex items-center gap-1">
                <Route className="h-4 w-4" /> Rota disponível
              </h3>
              <span className="text-[10px] text-emerald-300/80">expira em {expiresMin}m</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs mb-2">
              <div className="flex items-center gap-1">
                <Package className="h-3 w-3" /> {o.order_ids.length} pedidos
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {o.total_distance_km}km
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> ~{o.est_duration_min}min
              </div>
            </div>

            <div className="text-[10px] text-muted-foreground mb-2 max-h-20 overflow-y-auto">
              {o.orders.map(or => (
                <div key={or.id} className="truncate">
                  #{or.order_number} · {or.customer_name} · {fmtAddr(or.address)}
                </div>
              ))}
            </div>

            <Button
              onClick={() => accept.mutate(o.id)}
              disabled={accept.isPending}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              size="sm"
            >
              {accept.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aceitar rota →"}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
