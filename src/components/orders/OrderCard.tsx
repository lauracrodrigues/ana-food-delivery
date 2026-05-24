// v2.5.0 — React.memo para evitar re-renders desnecessários no kanban
import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Printer,
  AlertTriangle,
  Truck,
  Package,
  MessageCircle,
  Smartphone,
  Hand,
  QrCode as QrCodeIcon,
  Store as StoreIcon,
  PauseCircle,
  PlayCircle,
} from "lucide-react";
import { MotoIcon } from "@/components/ui/moto-icon";
import { Order } from "./types";
import { getNextStatus, requiresDelivererAssignment } from "@/utils/orderStatusRules";
import { useOrderTimeAlert } from "@/hooks/useOrderTimeAlert";

interface OrderCardProps {
  order: Order;
  isSelected: boolean;
  isAgentPaused?: boolean;
  onSelect: () => void;
  onClick: () => void;
  onPrint: (order: Order, isReprint: boolean) => void;
  onStatusChange: (orderId: string, newStatus: string, previousStatus: string, order: Order) => void;
  onToggleAgentPause: (order: Order, pause: boolean) => void;
  // Chamado quando pedido de delivery em "Pronto" precisa escolher entregador antes de avançar
  onAssignDeliverer: (order: Order) => void;
  onChangeDeliverer: (order: Order) => void;
  onDragStart: (e: React.DragEvent, order: Order) => void;
  onDragEnd: (e: React.DragEvent) => void;
  alertTime: number;
  isPrinting: boolean;
  onOpenWhatsApp: (phone: string, orderNumber: string) => void;
}

function ProgressBar({ elapsed, maxTime }: { elapsed: number; maxTime: number }) {
  const pct = Math.min((elapsed / maxTime) * 100, 100);
  const color = pct >= 100 ? "bg-red-500" : pct >= 75 ? "bg-amber-400" : "bg-emerald-400";
  return (
    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 mt-1">
      <div className={`h-1.5 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// v3.1.0 — Badge da origem do pedido: ícone + cor por canal
// Suporta whatsapp, digital_menu, manual, qr_code, ifood (futuro), 99food (futuro)
function SourceBadge({ source }: { source?: string }) {
  const cfg = (() => {
    switch (source) {
      case "whatsapp":
        return { Icon: MessageCircle, bg: "bg-green-500", title: "WhatsApp" };
      case "digital_menu":
        return { Icon: Smartphone, bg: "bg-blue-500", title: "Cardápio Digital" };
      case "qr_code":
        return { Icon: QrCodeIcon, bg: "bg-purple-500", title: "QR Code Mesa" };
      case "manual":
        return { Icon: Hand, bg: "bg-amber-500", title: "Pedido Manual" };
      case "ifood":
        return { Icon: StoreIcon, bg: "bg-red-600", title: "iFood" };
      case "99food":
        return { Icon: StoreIcon, bg: "bg-yellow-500", title: "99Food" };
      default:
        return { Icon: StoreIcon, bg: "bg-gray-400", title: source || "Outro" };
    }
  })();
  const { Icon, bg, title } = cfg;
  return (
    <span
      className={`inline-flex items-center justify-center w-5 h-5 rounded-full ${bg} text-white shadow-sm shrink-0`}
      title={title}
      aria-label={title}
    >
      <Icon className="w-3 h-3" />
    </span>
  );
}

export const OrderCard = memo(function OrderCard({
  order,
  isSelected,
  isAgentPaused = false,
  onSelect,
  onClick,
  onPrint,
  onStatusChange,
  onToggleAgentPause,
  onAssignDeliverer,
  onChangeDeliverer,
  onDragStart,
  onDragEnd,
  alertTime,
  isPrinting,
  onOpenWhatsApp,
}: OrderCardProps) {
  const { elapsedMinutes, maxTime, pct, isOverdue: overdue, isWarning: warning } = useOrderTimeAlert(order, alertTime);

  const handleStatusChange = () => {
    if (requiresDelivererAssignment(order.type, order.status)) {
      onAssignDeliverer(order);
      return;
    }
    const nextStatus = getNextStatus(order.status, order.type);
    onStatusChange(order.id, nextStatus, order.status, order);
  };

  const itemCount = order.items?.length || 0;

  return (
    <Card
      className={`cursor-move hover:shadow-md select-none transition-all duration-200 ease-out ${
        isAgentPaused ? "border-orange-300 ring-1 ring-orange-200 dark:border-orange-700" :
        overdue ? "border-red-300 ring-1 ring-red-300 dark:border-red-700 dark:ring-red-700" :
        warning ? "border-amber-200 dark:border-amber-800" :
        "border-gray-100 dark:border-gray-800"
      }`}
      draggable
      onDragStart={(e) => {
        onDragStart(e, order);
        if (e.currentTarget instanceof HTMLElement) {
          e.currentTarget.style.transform = "rotate(2deg) scale(1.05)";
          e.currentTarget.style.opacity = "0.7";
        }
      }}
      onDragEnd={(e) => {
        onDragEnd(e);
        if (e.currentTarget instanceof HTMLElement) {
          e.currentTarget.style.transform = "";
          e.currentTarget.style.opacity = "";
        }
      }}
      onClick={onClick}
    >
      {/* Alert banner — atrasado ou atenção */}
      {overdue && (
        <div className="bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-t-xl flex items-center gap-1.5">
          <AlertTriangle className="w-3 h-3" />
          ATRASADO — {elapsedMinutes}min (limite: {maxTime}min)
        </div>
      )}
      {warning && !overdue && (
        <div className="bg-amber-400 text-white text-[10px] font-bold px-3 py-1 rounded-t-xl flex items-center gap-1.5">
          <AlertTriangle className="w-3 h-3" />
          ATENÇÃO — {elapsedMinutes}min de {maxTime}min
        </div>
      )}

      <CardContent className={`p-2 ${overdue || warning ? "rounded-b-xl" : "rounded-xl"}`}>
        {/* Top row — checkbox + número + tipo */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelect}
              onClick={(e) => e.stopPropagation()}
              className="w-3.5 h-3.5"
            />
            {/* v3.1.0 — Badge de origem do pedido (WhatsApp/Cardápio/iFood/99Food) */}
            <SourceBadge source={(order as any).source} />
            <span className="text-sm font-bold text-gray-800 dark:text-gray-100">
              #{order.order_number || order.id.slice(0, 8)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Badge PAGO destacado quando pagamento confirmado (PIX MP / cartão) */}
            {order.payment_status === "approved" && (
              <span className="flex items-center gap-0.5 text-[10px] bg-green-500 text-white px-2 py-0.5 rounded-full font-bold shadow-sm animate-pulse-once">
                ✓ PAGO
              </span>
            )}
            {/* Badge AGENDADO destacado quando scheduled_for futuro — mostra hora */}
            {order.scheduled_for && (
              <span className="flex items-center gap-0.5 text-[10px] bg-indigo-500 text-white px-2 py-0.5 rounded-full font-bold shadow-sm" title={`Agendado pra ${new Date(order.scheduled_for).toLocaleString("pt-BR")}`}>
                📅 {new Date(order.scheduled_for).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            {/* v3.0.0 — Sub-status badges (coluna unificada Pronto/Saiu) */}
            {order.status === "ready" && (
              <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-full font-bold shadow-sm">
                ✓ PRONTO
              </span>
            )}
            {(order.status === "delivering" || order.status === "out_for_delivery") && (
              <span className="text-[10px] bg-purple-600 text-white px-2 py-0.5 rounded-full font-bold shadow-sm">
                🛵 SAIU
              </span>
            )}
            {order.type === "delivery" ? (
              <span className="flex items-center gap-0.5 text-[10px] bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full font-medium border border-blue-100 dark:border-blue-900">
                <Truck className="w-2.5 h-2.5" />Delivery
              </span>
            ) : (
              <span className="flex items-center gap-0.5 text-[10px] bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded-full font-medium border border-purple-100 dark:border-purple-900">
                <Package className="w-2.5 h-2.5" />Retirada
              </span>
            )}
          </div>
        </div>

        {/* Cliente + bairro em linha única */}
        <div className="flex items-center gap-1 min-w-0">
          <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate flex-1">{order.customer_name}</p>
          {order.neighborhood && (
            <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate shrink-0 max-w-[90px]">
              📍{order.neighborhood}
            </p>
          )}
        </div>

        {/* Entregador vinculado */}
        {order.type === "delivery" && (
          <div className="flex items-center gap-1 mt-1">
            <MotoIcon className="w-3 h-3 shrink-0 text-purple-500" />
            <span className="text-[10px] text-purple-600 dark:text-purple-400 truncate flex-1">
              {order.deliverer_name ?? "Sem entregador"}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onChangeDeliverer(order); }}
              className="text-[10px] text-gray-400 hover:text-purple-600 transition-colors shrink-0 underline"
              title="Trocar entregador"
            >
              {order.deliverer_name ? "trocar" : "vincular"}
            </button>
          </div>
        )}

        {/* Progress bar compacta */}
        <div className="mt-1">
          <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">
            <span>{elapsedMinutes}min</span>
            <span>/ {maxTime}min</span>
          </div>
          <ProgressBar elapsed={elapsedMinutes} maxTime={maxTime} />
        </div>

        {/* Items + pagamento + ações — tudo em uma linha */}
        <div className="flex items-center gap-1 mt-1.5 pt-1.5 border-t border-gray-100 dark:border-gray-800">
          <span className="text-[10px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded shrink-0">
            {itemCount} {itemCount === 1 ? "item" : "itens"}
          </span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 truncate flex-1">{order.payment_method}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenWhatsApp(order.customer_phone, order.order_number);
            }}
            className="flex items-center gap-0.5 text-[10px] text-gray-400 hover:text-green-600 transition-colors shrink-0"
            title="WhatsApp"
          >
            <MessageCircle className="w-3 h-3" />
          </button>
          {order.status !== "completed" && order.status !== "cancelled" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleAgentPause(order, !isAgentPaused);
              }}
              className={`flex items-center gap-0.5 text-[10px] transition-colors shrink-0 ${
                isAgentPaused ? "text-orange-500 hover:text-orange-700" : "text-gray-400 hover:text-orange-500"
              }`}
              title={isAgentPaused ? "Retomar agente" : "Pausar agente"}
            >
              {isAgentPaused ? <PlayCircle className="w-3 h-3" /> : <PauseCircle className="w-3 h-3" />}
            </button>
          )}
          {order.status !== "pending" && order.status !== "cancelled" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPrint(order, true);
              }}
              disabled={isPrinting}
              className="flex items-center gap-0.5 text-[10px] text-gray-400 hover:text-blue-600 transition-colors shrink-0 disabled:opacity-50"
              title="Imprimir"
            >
              <Printer className="w-3 h-3" />
            </button>
          )}
        </div>

        {order.status !== "completed" && order.status !== "cancelled" && (
          <Button
            variant="default"
            size="sm"
            className="w-full mt-1.5 h-6 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              handleStatusChange();
            }}
          >
            Avançar
          </Button>
        )}
      </CardContent>
    </Card>
  );
});
