// v1.0.0 — Aba "Disponíveis" no app entregador
// Lista pedidos prontos/preparando sem entregador. Soft-claim pra acumular antes da rota.
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, X, Package, MapPin, Play, Lock } from "lucide-react";
import { RouteOffersCard } from "./RouteOffersCard";

const API_BASE = "https://api.anafood.vip";

interface Available {
  id: string;
  order_number: number | string;
  customer_name: string;
  address: any;
  status: string;
  total: number;
  type: string;
}

interface MyOrder {
  id: string;
  order_number: number | string;
  customer_name: string;
  address: any;
  status: string;
}

interface Props {
  delivererId: string;
  routeStatus: "idle" | "collecting" | "on_route";
  onRouteStarted: () => void;
}

function fmtAddr(a: any): string {
  if (!a) return "";
  if (typeof a === "string") return a;
  const parts = [a.street && a.number ? `${a.street}, ${a.number}` : a.street, a.neighborhood, a.city].filter(Boolean);
  return parts.join(", ");
}

async function authHeader() {
  const { data: { session } } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${session?.access_token}` };
}

export function AvailableOrdersTab({ delivererId, routeStatus, onRouteStarted }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Pedidos disponíveis (sem deliverer)
  const { data: available = [], isLoading } = useQuery<Available[]>({
    queryKey: ["available-orders"],
    queryFn: async () => {
      const r = await fetch(`${API_BASE}/api/deliveries/available`, { headers: await authHeader() });
      const j = await r.json();
      return j.orders || [];
    },
    refetchInterval: 8000,
  });

  // Meus pedidos coletados (ainda não em rota)
  const { data: mine = [] } = useQuery<MyOrder[]>({
    queryKey: ["my-collected", delivererId],
    queryFn: async () => {
      const { data } = await supabase.from("orders")
        .select("id, order_number, customer_name, address, status")
        .eq("deliverer_id", delivererId)
        .in("status", ["preparing", "ready"]);
      return (data || []) as MyOrder[];
    },
    enabled: !!delivererId,
    refetchInterval: 5000,
  });

  // Realtime: invalida ao mudar orders
  useEffect(() => {
    const ch = supabase.channel("deliverer-available")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        queryClient.invalidateQueries({ queryKey: ["available-orders"] });
        queryClient.invalidateQueries({ queryKey: ["my-collected"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [queryClient]);

  const claim = useMutation({
    mutationFn: async (orderId: string) => {
      const r = await fetch(`${API_BASE}/api/deliveries/claim-soft`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ order_id: orderId }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.detail || j.error);
      return j;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["available-orders"] });
      queryClient.invalidateQueries({ queryKey: ["my-collected"] });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const release = useMutation({
    mutationFn: async (orderId: string) => {
      const r = await fetch(`${API_BASE}/api/deliveries/release`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ order_id: orderId }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.detail || j.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["available-orders"] });
      queryClient.invalidateQueries({ queryKey: ["my-collected"] });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const startRoute = useMutation({
    mutationFn: async () => {
      const r = await fetch(`${API_BASE}/api/deliveries/start-route`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.detail || j.error);
      return j;
    },
    onSuccess: (j) => {
      toast({ title: `Rota iniciada — ${j.count} pedidos`, description: "Use QR pra pegar mais durante a rota." });
      onRouteStarted();
      queryClient.invalidateQueries({ queryKey: ["available-orders"] });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const onRoute = routeStatus === "on_route";

  return (
    <div className="space-y-4 pb-24">
      {/* v1.0.0 — Ofertas de rota agrupada (cluster automático) */}
      {!onRoute && <RouteOffersCard onAccepted={() => { queryClient.invalidateQueries(); }} />}

      {/* Meus coletados — destacado se tem pelo menos 1 */}
      {mine.length > 0 && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-emerald-300">
              📦 Coletados ({mine.length})
            </h3>
            {!onRoute && (
              <Button
                onClick={() => startRoute.mutate()}
                disabled={startRoute.isPending}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 gap-1"
              >
                <Play className="w-3 h-3" /> Iniciar rota
              </Button>
            )}
          </div>
          <div className="space-y-2">
            {mine.map((o) => (
              <div key={o.id} className="flex items-center justify-between gap-2 bg-background/50 rounded p-2 text-xs">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">#{o.order_number} · {o.customer_name}</div>
                  <div className="text-muted-foreground truncate flex items-center gap-1">
                    <MapPin className="h-3 w-3 shrink-0" />
                    {fmtAddr(o.address)}
                  </div>
                </div>
                {!onRoute && (
                  <Button
                    onClick={() => release.mutate(o.id)}
                    disabled={release.isPending}
                    variant="ghost" size="sm" className="h-7 w-7 p-0"
                    title="Soltar pedido"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lock visual quando on_route */}
      {onRoute && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs flex items-start gap-2">
          <Lock className="h-4 w-4 text-amber-300 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-300">Você está em rota</p>
            <p className="text-amber-200/80 mt-0.5">
              Pra pegar pedidos novos durante a rota use o <b>scanner QR</b> no recibo.
            </p>
          </div>
        </div>
      )}

      {/* Disponíveis */}
      <div>
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <Package className="h-4 w-4" />
          Disponíveis ({available.length})
        </h3>

        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : available.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">
            Nenhum pedido disponível. Aguarde novos pedidos prontos.
          </p>
        ) : (
          <div className="space-y-2">
            {available.map((o) => (
              <div key={o.id} className="bg-card border rounded-lg p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">#{o.order_number}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        o.status === "ready" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                      }`}>
                        {o.status === "ready" ? "Pronto" : "Preparando"}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{o.customer_name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{fmtAddr(o.address)}</span>
                    </div>
                  </div>
                  <Button
                    onClick={() => claim.mutate(o.id)}
                    disabled={claim.isPending || onRoute}
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 gap-1 shrink-0"
                  >
                    <Plus className="w-3 h-3" />
                    Pegar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
