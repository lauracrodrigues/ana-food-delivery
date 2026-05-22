// v1.0.0 — Página pública de rastreio de pedido pelo QR Code do recibo
// URL: anafood.vip/p/{shortId} (8 chars do UUID sem hífen)
// Cliente escaneia QR no recibo, vê status atualizado em tempo real
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Package, ChefHat, Bike, CheckCircle2, XCircle } from "lucide-react";
import { formatCurrency } from "@/lib/currency-formatter";

interface OrderTracking {
  id: string;
  order_number: number;
  status: string;
  customer_name: string;
  total: number;
  created_at: string;
  delivery_time_minutes: number | null;
  type: string;
  company: { name: string; fantasy_name: string | null; logo_url: string | null } | null;
}

const STATUS_META: Record<string, { label: string; icon: any; color: string }> = {
  pending:        { label: "Aguardando confirmação",   icon: Package,      color: "text-amber-500" },
  confirmed:      { label: "Confirmado, indo p/ cozinha", icon: Package,   color: "text-blue-500" },
  preparing:      { label: "Em preparo na cozinha",    icon: ChefHat,      color: "text-orange-500" },
  ready:          { label: "Pronto pra retirar/entrega", icon: CheckCircle2, color: "text-emerald-500" },
  out_for_delivery: { label: "Saiu pra entrega",       icon: Bike,         color: "text-purple-500" },
  delivering:     { label: "Saiu pra entrega",         icon: Bike,         color: "text-purple-500" },
  delivered:      { label: "Entregue! ✓",              icon: CheckCircle2, color: "text-emerald-600" },
  completed:      { label: "Concluído",                icon: CheckCircle2, color: "text-emerald-600" },
  cancelled:      { label: "Pedido cancelado",         icon: XCircle,      color: "text-red-500" },
};

export default function OrderTracking() {
  const { shortId } = useParams<{ shortId: string }>();
  const [order, setOrder] = useState<OrderTracking | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Carrega pedido pelo prefixo do UUID
  const load = async () => {
    if (!shortId) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    // shortId = 8 chars hex do UUID sem hífens — busca usando LIKE no id::text
    // @ts-expect-error -- generated types
    const { data, error } = await supabase
      .from("orders")
      .select("id, order_number, status, customer_name, total, created_at, delivery_time_minutes, type, company:companies(name, fantasy_name, logo_url)")
      .ilike("id", `${shortId.toLowerCase()}%`)
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      setNotFound(true);
    } else {
      setOrder(data as any);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // Polling a cada 15s (cliente acompanha live)
    const interval = setInterval(load, 15_000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shortId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="py-10 text-center">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-3" />
            <h2 className="text-xl font-bold mb-2">Pedido não encontrado</h2>
            <p className="text-sm text-muted-foreground">
              O código escaneado não corresponde a nenhum pedido. Verifique o QR Code do recibo.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const meta = STATUS_META[order.status] || STATUS_META.pending;
  const Icon = meta.icon;
  const companyName = order.company?.fantasy_name || order.company?.name || "Loja";

  // ETA: created_at + delivery_time_minutes
  let etaText = "";
  if (order.delivery_time_minutes && ["pending", "confirmed", "preparing"].includes(order.status)) {
    const eta = new Date(new Date(order.created_at).getTime() + order.delivery_time_minutes * 60_000);
    etaText = eta.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="min-h-screen bg-background p-4 flex items-center justify-center">
      <div className="w-full max-w-md space-y-4">
        {/* Header empresa */}
        <div className="flex items-center gap-3">
          {order.company?.logo_url ? (
            <img src={order.company.logo_url} alt={companyName} className="w-12 h-12 rounded-lg object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-primary/10" />
          )}
          <div>
            <p className="text-sm text-muted-foreground">Acompanhamento</p>
            <h1 className="text-lg font-bold">{companyName}</h1>
          </div>
        </div>

        {/* Status atual */}
        <Card>
          <CardHeader className="pb-3">
            <p className="text-xs text-muted-foreground">PEDIDO</p>
            <CardTitle className="text-3xl font-bold">#{order.order_number}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={`flex items-center gap-3 p-4 rounded-lg bg-muted/50 ${meta.color}`}>
              <Icon className="h-8 w-8" />
              <div className="flex-1">
                <p className="font-semibold">{meta.label}</p>
                {etaText && <p className="text-xs text-muted-foreground">Previsão: {etaText}</p>}
              </div>
            </div>

            <div className="text-sm space-y-1 pt-2 border-t">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cliente</span>
                <span className="font-medium">{order.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="font-bold">{formatCurrency(order.total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Modalidade</span>
                <span>{order.type === "delivery" ? "Entrega" : "Retirada"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-center text-muted-foreground">
          Esta página atualiza automaticamente a cada 15 segundos
        </p>
      </div>
    </div>
  );
}
