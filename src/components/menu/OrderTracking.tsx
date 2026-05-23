// v1.2.0 — Tela acompanhamento + push opt-in + cancelamento com motivos
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/currency-formatter";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, ChefHat, Package, Bike, Star, Phone, ReceiptText, X, ArrowLeft } from "lucide-react";
import { PushOptInBanner } from "./PushOptInBanner";
import { CancelOrderDialog } from "./CancelOrderDialog";
import { OrderReviewForm } from "./OrderReviewForm";

interface OrderTrackingProps {
  orderId: string;
  companyId?: string;
  company: { id?: string; name: string; fantasy_name: string; phone?: string; whatsapp?: string };
  onClose: () => void;
}

type OrderStatus = "pending" | "confirmed" | "preparing" | "ready" | "delivering" | "delivered" | "cancelled";

const STATUS_STEPS: { key: OrderStatus; label: string; icon: any; desc: string }[] = [
  { key: "pending",    label: "Recebido",       icon: ReceiptText, desc: "Pedido enviado, aguardando confirmação" },
  { key: "confirmed",  label: "Confirmado",     icon: CheckCircle2, desc: "Loja confirmou seu pedido!" },
  { key: "preparing",  label: "Em Preparo",     icon: ChefHat,     desc: "Sua comida está sendo preparada" },
  { key: "ready",      label: "Pronto",         icon: Package,     desc: "Pedido pronto para retirada/entrega" },
  { key: "delivering", label: "Saiu p/ Entrega",icon: Bike,        desc: "Entregador a caminho" },
  { key: "delivered",  label: "Entregue",       icon: Star,        desc: "Bom apetite! 🎉" },
];

const STATUS_ORDER: OrderStatus[] = ["pending", "confirmed", "preparing", "ready", "delivering", "delivered"];

function getStepIndex(status: string) {
  return Math.max(0, STATUS_ORDER.indexOf(status as OrderStatus));
}

const STATUS_COLORS: Record<string, string> = {
  pending:    "text-amber-500",
  confirmed:  "text-blue-500",
  preparing:  "text-orange-500",
  ready:      "text-green-500",
  delivering: "text-purple-500",
  delivered:  "text-green-600",
  cancelled:  "text-destructive",
};

export function OrderTracking({ orderId, company, onClose }: OrderTrackingProps) {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cancelOpen, setCancelOpen] = useState(false);

  const fetchOrder = useCallback(async () => {
    const { data } = await supabase.rpc("get_order_tracking", { p_order_id: orderId });
    if (data) {
      setOrder(data);
      // Limpa localStorage se pedido finalizado
      if (["delivered","cancelled"].includes(data.status) && company.id) {
        localStorage.removeItem(`anafood_order_${company.id}`);
      }
    }
    setLoading(false);
  }, [orderId, company.id]);

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(fetchOrder, 15000);
    return () => clearInterval(interval);
  }, [fetchOrder]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground text-sm">Carregando pedido...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-muted-foreground">Pedido não encontrado.</p>
        <Button onClick={onClose}>Voltar ao cardápio</Button>
      </div>
    );
  }

  const isCancelled = order.status === "cancelled";
  const isDelivered = order.status === "delivered";
  const currentStep = getStepIndex(order.status);
  const currentInfo = STATUS_STEPS[currentStep];
  const CurrentIcon = currentInfo?.icon ?? CheckCircle2;
  const orderNum = order.order_number ? `#${order.order_number}` : `#${String(orderId).slice(-6).toUpperCase()}`;
  const items: any[] = Array.isArray(order.items) ? order.items : [];
  const contactNum = company.whatsapp || company.phone;

  return (
    <div className="fixed inset-0 bg-background flex flex-col overflow-hidden">
      {/* Header com botão voltar */}
      <div className="bg-primary text-primary-foreground px-4 py-4 relative shrink-0">
        {/* Botão voltar — esquerda */}
        <button
          onClick={onClose}
          className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-primary-foreground/15 hover:bg-primary-foreground/25 flex items-center justify-center transition-colors"
          aria-label="Voltar ao cardápio"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="text-center px-12">
          <p className="text-sm opacity-80">{company.fantasy_name || company.name}</p>
          <h1 className="text-xl font-bold mt-0.5">Pedido {orderNum}</h1>
          <p className="text-xs opacity-80 mt-0.5">
            {new Date(order.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        {/* Botão X — direita */}
        <button
          onClick={onClose}
          className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-primary-foreground/15 hover:bg-primary-foreground/25 flex items-center justify-center transition-colors"
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 max-w-md mx-auto w-full">

        {/* Banner opt-in push — só pra pedidos não finalizados */}
        {order.customer_phone && company.id && !isDelivered && !isCancelled && (
          <PushOptInBanner companyId={company.id} customerPhone={order.customer_phone} />
        )}

        {/* Status atual — destaque */}
        {!isCancelled ? (
          <div className={`rounded-2xl border-2 p-4 text-center space-y-2 ${isDelivered ? "border-green-400 bg-green-50" : "border-primary/20 bg-primary/5"}`}>
            <div className="flex justify-center">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center ${isDelivered ? "bg-green-100" : "bg-primary/10"}`}>
                <CurrentIcon className={`w-7 h-7 ${isDelivered ? "text-green-600" : "text-primary"}`} />
              </div>
            </div>
            <p className={`text-lg font-bold ${isDelivered ? "text-green-700" : "text-foreground"}`}>
              {currentInfo?.label}
            </p>
            <p className="text-sm text-muted-foreground">{currentInfo?.desc}</p>
            {order.estimated_time && !isDelivered && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground pt-1">
                <Clock className="w-3.5 h-3.5" />
                Tempo estimado: ~{order.estimated_time} min
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-destructive/30 bg-destructive/5 p-4 text-center">
            <p className="font-bold text-destructive">Pedido cancelado</p>
            <p className="text-sm text-muted-foreground mt-1">Entre em contato com a loja para mais informações.</p>
          </div>
        )}

        {/* v1.3.0 — Stepper com animação igual à página /p/:shortId
            Ativa: pulse no ícone + halo animate-ping ao redor
            Done: check verde
            Pending: cinza */}
        {!isCancelled && (
          <div className="bg-card border rounded-xl p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Acompanhamento</p>
            <div className="space-y-0">
              {(() => {
                const visibleSteps = STATUS_STEPS.filter(s => s.key !== "delivering" || order.type === "delivery");
                return visibleSteps.map((step, idx) => {
                  const isActive = idx === currentStep;
                  const isDone   = idx < currentStep;
                  const isPending = idx > currentStep;
                  const StepIcon = step.icon;
                  const colorClass = STATUS_COLORS[step.key] || "text-primary";
                  const bgActive = step.key === "preparing" ? "bg-orange-500"
                    : step.key === "ready" ? "bg-green-500"
                    : step.key === "delivering" ? "bg-purple-500"
                    : step.key === "delivered" ? "bg-emerald-500"
                    : step.key === "confirmed" ? "bg-blue-500"
                    : "bg-amber-500";

                  return (
                    <div key={step.key} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`
                          relative h-10 w-10 rounded-full flex items-center justify-center transition-all
                          ${isActive  ? `${bgActive} text-white shadow-lg` : ""}
                          ${isDone    ? "bg-emerald-500 text-white" : ""}
                          ${isPending ? "bg-muted text-muted-foreground" : ""}
                        `}>
                          {/* Halo pulsante ativo */}
                          {isActive && (
                            <span className={`absolute inline-flex h-full w-full rounded-full ${bgActive} opacity-50 animate-ping`} />
                          )}
                          {isDone ? (
                            <CheckCircle2 className="h-5 w-5" />
                          ) : (
                            <StepIcon className={`h-5 w-5 ${isActive ? "animate-pulse" : ""}`} />
                          )}
                        </div>
                        {/* Conector vertical */}
                        {idx < visibleSteps.length - 1 && (
                          <div className={`w-0.5 h-6 my-1 ${idx < currentStep ? "bg-emerald-500" : "bg-muted"}`} />
                        )}
                      </div>
                      <div className="pt-2 pb-2 flex-1">
                        <p className={`text-sm font-medium ${
                          isActive ? `${colorClass} font-semibold` :
                          isPending ? "text-muted-foreground/50" :
                          "text-foreground"
                        }`}>
                          {step.label}
                        </p>
                        {isActive && (
                          <p className="text-xs text-muted-foreground animate-pulse">Em andamento...</p>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {/* Resumo do pedido */}
        <div className="bg-card border rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Resumo</p>
          {items.length > 0 ? (
            <div className="space-y-2">
              {items.map((item: any, i: number) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {item.quantity}× {item.name}
                  </span>
                  <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Itens não disponíveis</p>
          )}
          <div className="border-t pt-2 flex justify-between font-bold">
            <span>Total</span>
            <span className="text-primary">{formatCurrency(order.total)}</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Pagamento</span>
            <span className="capitalize">{order.payment_method?.replace("_", " ") ?? "—"}</span>
          </div>
          {order.observations && (
            <p className="text-xs text-muted-foreground border-t pt-2">Obs: {order.observations}</p>
          )}
        </div>

        {/* Form de avaliação — só pra pedidos entregues/concluídos */}
        {(isDelivered || ["completed", "archived"].includes(order.status)) && (
          <OrderReviewForm orderId={orderId} customerPhone={order.customer_phone} />
        )}

        {/* Contato com a loja */}
        {contactNum && (
          <a
            href={`https://wa.me/55${contactNum.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-green-400 text-green-700 bg-green-50 text-sm font-medium hover:bg-green-100 transition-colors"
          >
            <Phone className="w-4 h-4" />
            Falar com a loja no WhatsApp
          </a>
        )}

        {/* Novo pedido */}
        <Button variant="outline" className="w-full" onClick={onClose}>
          Fazer novo pedido
        </Button>

        {/* Botão cancelar — bloqueado pra pedidos finalizados (delivered/completed/archived) ou em entrega */}
        {!isDelivered && !isCancelled && !["delivering", "completed", "archived"].includes(order.status) && (
          <button
            type="button"
            onClick={() => setCancelOpen(true)}
            className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors py-2"
          >
            <X className="h-3 w-3" />
            Cancelar pedido
          </button>
        )}

        <p className="text-center text-xs text-muted-foreground pb-4">
          Atualização automática a cada 15 segundos
        </p>
      </div>

      {/* Modal de motivos de cancelamento */}
      <CancelOrderDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        orderId={orderId}
        onCancelled={() => { fetchOrder(); }}
      />
    </div>
  );
}
