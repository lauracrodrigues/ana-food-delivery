// v2.0.0 — estilo "Urgência & Timeline" — barra progresso, alertas visuais, layout denso
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Printer,
  AlertTriangle,
  Truck,
  Package,
  MessageCircle,
} from "lucide-react";
import { Order, getNextStatus } from "./types";

interface OrderCardProps {
  order: Order;
  isSelected: boolean;
  onSelect: () => void;
  onClick: () => void;
  onPrint: (order: Order, isReprint: boolean) => void;
  onStatusChange: (orderId: string, newStatus: string, previousStatus: string, order: Order) => void;
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

export function OrderCard({
  order,
  isSelected,
  onSelect,
  onClick,
  onPrint,
  onStatusChange,
  onDragStart,
  onDragEnd,
  alertTime,
  isPrinting,
  onOpenWhatsApp,
}: OrderCardProps) {
  const elapsedMinutes = Math.floor(
    (Date.now() - new Date(order.created_at).getTime()) / 60000
  );

  // Tempo limite varia por status
  const maxTime = order.status === 'pending' ? 15 :
                  order.status === 'preparing' ? alertTime || 30 :
                  order.status === 'ready' ? 10 :
                  order.status === 'delivering' ? 45 : 60;

  const pct = (elapsedMinutes / maxTime) * 100;
  const overdue = pct >= 100;
  const warning = pct >= 75 && !overdue;

  const handleStatusChange = () => {
    const nextStatus = getNextStatus(order.status, order.type);
    onStatusChange(order.id, nextStatus, order.status, order);
  };

  const itemCount = order.items?.length || 0;

  return (
    <Card
      className={`cursor-move hover:shadow-md select-none transition-all duration-200 ease-out ${
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

      <CardContent className={`p-3 ${overdue || warning ? "rounded-b-xl" : "rounded-xl"}`}>
        {/* Top row — número + tipo */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelect}
              onClick={(e) => e.stopPropagation()}
            />
            <span className="text-base font-bold text-gray-800 dark:text-gray-100">
              #{order.order_number || order.id.slice(0, 8)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {order.type === "delivery" ? (
              <span className="flex items-center gap-1 text-[10px] bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium border border-blue-100 dark:border-blue-900">
                <Truck className="w-3 h-3" />Delivery
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full font-medium border border-purple-100 dark:border-purple-900">
                <Package className="w-3 h-3" />Retirada
              </span>
            )}
          </div>
        </div>

        {/* Cliente */}
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{order.customer_name}</p>
        {order.neighborhood && (
          <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 mt-0.5 truncate">
            📍 {order.neighborhood}
          </p>
        )}

        {/* Progress bar */}
        <div className="mt-2">
          <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">
            <span>{elapsedMinutes}min aguardando</span>
            <span>limite {maxTime}min</span>
          </div>
          <ProgressBar elapsed={elapsedMinutes} maxTime={maxTime} />
        </div>

        {/* Items summary + pagamento */}
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
              {itemCount} {itemCount === 1 ? "item" : "itens"}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">{order.payment_method}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenWhatsApp(order.customer_phone, order.order_number);
            }}
            className="flex-1 flex items-center justify-center gap-1 text-[11px] text-gray-500 hover:text-green-600 bg-gray-50 dark:bg-gray-800 hover:bg-green-50 dark:hover:bg-green-950 rounded-lg py-1.5 transition-colors border border-gray-100 dark:border-gray-700"
          >
            <MessageCircle className="w-3.5 h-3.5" />WhatsApp
          </button>
          {order.status !== "pending" && order.status !== "cancelled" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPrint(order, true);
              }}
              disabled={isPrinting}
              className="flex-1 flex items-center justify-center gap-1 text-[11px] text-gray-500 hover:text-blue-600 bg-gray-50 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-lg py-1.5 transition-colors border border-gray-100 dark:border-gray-700 disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5" />{isPrinting ? "..." : "Imprimir"}
            </button>
          )}
        </div>

        {order.status !== "completed" && order.status !== "cancelled" && (
          <Button
            variant="default"
            size="sm"
            className="w-full mt-2 h-7 text-xs"
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
}
