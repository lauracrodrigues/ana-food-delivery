import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Clock,
  Printer,
  Phone,
  AlertTriangle,
  Truck,
  Package,
} from "lucide-react";
import { Order, getNextStatus } from "./types";

interface OrderCardProps {
  order: Order;
  isSelected: boolean;
  onSelect: () => void;
  onClick: () => void;
  onPrint: (order: Order) => void;
  onStatusChange: (orderId: string, newStatus: string, previousStatus: string, order: Order) => void;
  onDragStart: (e: React.DragEvent, order: Order) => void;
  onDragEnd: (e: React.DragEvent) => void;
  alertTime: number;
  isPrinting: boolean;
  onOpenWhatsApp: (phone: string, orderNumber: string) => void;
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
  const isDelayed = elapsedMinutes >= alertTime && 
                   order.status !== "completed" && 
                   order.status !== "cancelled";

  const handleStatusChange = () => {
    const nextStatus = getNextStatus(order.status, order.type);
    onStatusChange(order.id, nextStatus, order.status, order);
  };

  return (
    <Card
      className={`cursor-move hover:shadow-lg transition-all duration-200 ease-out select-none hover:scale-[1.02] ${
        isDelayed ? "border-destructive border-2" : ""
      } ${
        order.status === "pending" ? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 animate-pulse-subtle" : ""
      }`}
      draggable
      onDragStart={(e) => onDragStart(e, order)}
      onDragEnd={onDragEnd}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelect}
              onClick={(e) => e.stopPropagation()}
            />
            <CardTitle className="text-sm">
              #{order.order_number || order.id.slice(0, 8)}
            </CardTitle>
          </div>
          <div className="flex items-center gap-1">
            {isDelayed && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-destructive/10 text-destructive">
                <AlertTriangle className="w-3 h-3" />
                <span className="text-xs font-medium">Atrasado</span>
              </div>
            )}
            {order.status === "preparing" && (
              <div className={`flex items-center gap-1 text-xs ${
                isDelayed ? "text-destructive font-medium" : "text-muted-foreground"
              }`}>
                <Clock className="w-3 h-3" />
                {elapsedMinutes} min
              </div>
            )}
          </div>
        </div>
        
        {order.status === "pending" && (
          <div className="flex justify-center mt-2">
            <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-gradient-to-r from-primary/10 to-primary/5 text-primary border border-primary/20">
              {order.source === "whatsapp" ? "Delivery WhatsApp" : 
               order.source === "digital_menu" ? "Delivery Cardápio Digital" :
               order.source === "counter" ? "Pedido Balcão" :
               order.type === "delivery" ? "Delivery Cardápio Digital" : "Pedido Balcão"}
            </div>
          </div>
        )}
        
        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs mt-2 ${
          order.type === "delivery" 
            ? "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400" 
            : "bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400"
        }`}>
          {order.type === "delivery" ? (
            <>
              <Truck className="w-3 h-3" />
              Entrega
            </>
          ) : (
            <>
              <Package className="w-3 h-3" />
              Retirada
            </>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        <div>
          <p className="font-medium text-sm">{order.customer_name}</p>
          {order.customer_phone && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenWhatsApp(order.customer_phone, order.order_number);
              }}
              className="flex items-center gap-1 text-xs text-green-600 hover:underline"
            >
              <Phone className="w-3 h-3" />
              {order.customer_phone}
            </button>
          )}
        </div>

        <div className="flex gap-1">
          {order.status !== "pending" && order.status !== "cancelled" && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-7 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onPrint(order);
              }}
              disabled={isPrinting}
            >
              <Printer className="w-3 h-3 mr-1" />
              {isPrinting ? "Imprimindo..." : "Imprimir"}
            </Button>
          )}

          {order.status !== "completed" && order.status !== "cancelled" && (
            <Button
              variant="default"
              size="sm"
              className="flex-1 h-7 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                handleStatusChange();
              }}
            >
              Avançar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
