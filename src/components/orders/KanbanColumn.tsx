import { OrderCard } from "./OrderCard";
import { Order } from "./types";

interface KanbanColumnProps {
  column: {
    id: string;
    title: string;
    color: string;
  };
  orders: Order[];
  onDrop: (e: React.DragEvent, status: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onCardClick: (order: Order) => void;
  onCardSelect: (orderId: string) => void;
  selectedOrders: Set<string>;
  onPrintOrder: (order: Order, isReprint: boolean) => void;
  onUpdateStatus: (orderId: string, newStatus: string, previousStatus: string, order: Order) => void;
  onDragStart: (e: React.DragEvent, order: Order) => void;
  onDragEnd: (e: React.DragEvent) => void;
  alertTime: number;
  isPrinting: boolean;
  isDraggedOver: boolean;
  onOpenWhatsApp: (phone: string, orderNumber: string) => void;
}

// Mapa de cores light/dark por coluna
const COLUMN_BG: Record<string, string> = {
  pending: "bg-blue-50/80 dark:bg-blue-950/30",
  preparing: "bg-yellow-50/80 dark:bg-yellow-950/30",
  ready: "bg-green-50/80 dark:bg-green-950/30",
  delivering: "bg-purple-50/80 dark:bg-purple-950/30",
  completed: "bg-gray-50/80 dark:bg-gray-900/30",
  cancelled: "bg-red-50/80 dark:bg-red-950/30",
};

export function KanbanColumn({
  column,
  orders,
  onDrop,
  onDragOver,
  onCardClick,
  onCardSelect,
  selectedOrders,
  onPrintOrder,
  onUpdateStatus,
  onDragStart,
  onDragEnd,
  alertTime,
  isPrinting,
  isDraggedOver,
  onOpenWhatsApp,
}: KanbanColumnProps) {
  const bgClass = COLUMN_BG[column.id] || "bg-gray-50/80 dark:bg-gray-900/30";

  return (
    <div
      className="flex-shrink-0 w-80 flex flex-col h-full"
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, column.id)}
    >
      <div className={`${column.color} text-white p-3 rounded-t-lg flex-shrink-0`}>
        <h3 className="font-semibold">
          {column.title} ({orders.length})
        </h3>
      </div>

      {/* Fundo colorido + scroll independente + placeholder visual no drag */}
      <div className={`flex-1 min-h-0 ${bgClass} border border-border overflow-y-auto p-2 rounded-b-lg space-y-2 transition-all duration-300 ${
        isDraggedOver ? 'ring-2 ring-primary/50 bg-primary/5 scale-[1.01]' : ''
      }`}>
        {orders.length > 0 ? (
          orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              isSelected={selectedOrders.has(order.id)}
              onSelect={() => onCardSelect(order.id)}
              onClick={() => onCardClick(order)}
              onPrint={onPrintOrder}
              onStatusChange={onUpdateStatus}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              alertTime={alertTime}
              isPrinting={isPrinting}
              onOpenWhatsApp={onOpenWhatsApp}
            />
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Nenhum pedido
          </div>
        )}
      </div>
    </div>
  );
}
