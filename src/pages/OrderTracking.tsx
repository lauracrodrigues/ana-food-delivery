// v1.1.0 — Página pública de rastreio com timeline animada
// URL: anafood.vip/p/{shortId} (8 chars do UUID sem hífen)
// - Timeline vertical com 4 etapas (Confirmado → Preparo → Pronto/Saiu → Entregue)
// - Ícone da etapa ATUAL pulsa pra destacar
// - Etapas passadas mostram check verde
// - Etapas futuras ficam cinza
// - Polling 15s pra atualizar live
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Package, ChefHat, Bike, CheckCircle2, XCircle, Check } from "lucide-react";
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

// v1.1.0 — Steps da timeline (ordem cronológica). status do pedido mapeia pra um índice
type StepKey = "confirmed" | "preparing" | "ready_or_out" | "delivered";
interface Step {
  key: StepKey;
  label: string;
  icon: any;
  // Cores aplicadas quando ativo (pulsa)
  bgActive: string;
  textActive: string;
}

const STEPS: Step[] = [
  { key: "confirmed",   label: "Pedido confirmado",     icon: Package,     bgActive: "bg-blue-500",    textActive: "text-blue-500" },
  { key: "preparing",   label: "Preparando na cozinha", icon: ChefHat,     bgActive: "bg-orange-500",  textActive: "text-orange-500" },
  { key: "ready_or_out",label: "",                      icon: Bike,        bgActive: "bg-purple-500",  textActive: "text-purple-500" },
  { key: "delivered",   label: "Entregue",              icon: CheckCircle2,bgActive: "bg-emerald-500", textActive: "text-emerald-500" },
];

// Map status real do pedido → índice da etapa atual + label dinâmica do step 3
function resolveCurrentStep(status: string, type: string): { idx: number; cancelled: boolean; step3Label: string } {
  const step3Label = type === "delivery" ? "Saiu pra entrega" : "Pronto pra retirar";
  if (status === "cancelled") return { idx: -1, cancelled: true, step3Label };
  if (["pending", "confirmed"].includes(status))                      return { idx: 0, cancelled: false, step3Label };
  if (status === "preparing")                                          return { idx: 1, cancelled: false, step3Label };
  if (["ready", "out_for_delivery", "delivering"].includes(status))   return { idx: 2, cancelled: false, step3Label };
  if (["delivered", "completed"].includes(status))                     return { idx: 3, cancelled: false, step3Label };
  return { idx: 0, cancelled: false, step3Label };
}

export default function OrderTracking() {
  const { shortId } = useParams<{ shortId: string }>();
  const [order, setOrder] = useState<OrderTracking | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = async () => {
    if (!shortId) {
      setNotFound(true);
      setLoading(false);
      return;
    }
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

  const companyName = order.company?.fantasy_name || order.company?.name || "Loja";
  const { idx: currentStep, cancelled, step3Label } = resolveCurrentStep(order.status, order.type);

  // ETA: created_at + delivery_time_minutes (só quando ainda não finalizou)
  let etaText = "";
  if (order.delivery_time_minutes && !cancelled && currentStep < 3) {
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
            <p className="text-sm text-muted-foreground">Acompanhamento do pedido</p>
            <h1 className="text-lg font-bold">{companyName}</h1>
          </div>
        </div>

        {/* Card principal */}
        <Card>
          <CardHeader className="pb-3">
            <p className="text-xs text-muted-foreground">PEDIDO</p>
            <CardTitle className="text-3xl font-bold">#{order.order_number}</CardTitle>
            {etaText && (
              <p className="text-xs text-muted-foreground mt-1">
                Previsão de pronto: <span className="font-semibold">{etaText}</span>
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-5">
            {cancelled ? (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 text-red-600">
                <XCircle className="h-8 w-8" />
                <p className="font-semibold">Pedido cancelado</p>
              </div>
            ) : (
              // v1.1.0 — Timeline vertical: cada step renderizado com ícone animado se ativo
              <div className="space-y-0">
                {STEPS.map((step, i) => {
                  const isActive   = i === currentStep;
                  const isDone     = i < currentStep;
                  const isPending  = i > currentStep;
                  const Icon       = step.icon;
                  const label      = step.key === "ready_or_out" ? step3Label : step.label;

                  return (
                    <div key={step.key} className="flex items-start gap-3 relative">
                      {/* Ícone circular */}
                      <div className="flex flex-col items-center">
                        <div
                          className={`
                            relative h-12 w-12 rounded-full flex items-center justify-center transition-all
                            ${isActive  ? `${step.bgActive} text-white shadow-lg` : ""}
                            ${isDone    ? "bg-emerald-500 text-white" : ""}
                            ${isPending ? "bg-muted text-muted-foreground" : ""}
                          `}
                        >
                          {/* Halo pulsante quando ativo (ping infinito) */}
                          {isActive && (
                            <span className={`absolute inline-flex h-full w-full rounded-full ${step.bgActive} opacity-50 animate-ping`} />
                          )}
                          {isDone ? <Check className="h-6 w-6" /> : <Icon className={`h-6 w-6 ${isActive ? "animate-pulse" : ""}`} />}
                        </div>
                        {/* Linha conectora (vertical) entre steps */}
                        {i < STEPS.length - 1 && (
                          <div className={`w-0.5 h-8 my-1 ${i < currentStep ? "bg-emerald-500" : "bg-muted"}`} />
                        )}
                      </div>
                      {/* Label do step */}
                      <div className="pt-3 pb-2 flex-1">
                        <p className={`text-sm font-medium ${isActive ? step.textActive + " font-semibold" : isPending ? "text-muted-foreground" : ""}`}>
                          {label}
                        </p>
                        {isActive && (
                          <p className="text-xs text-muted-foreground animate-pulse">Em andamento...</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="text-sm space-y-1 pt-3 border-t">
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
          🔄 Atualizando automaticamente
        </p>
      </div>
    </div>
  );
}
