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
  onPrintOrder: (order: Order) => void;
  onUpdateStatus: (orderId: string, newStatus: string, previousStatus: string, order: Order) => void;
  onDragStart: (e: React.DragEvent, order: Order) => void;
  onDragEnd: (e: React.DragEvent) => void;
  alertTime: number;
  isPrinting: boolean;
  isDraggedOver: boolean;
  onOpenWhatsApp: (phone: string, orderNumber: string) => void;
}

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
  return (
    <div
      className="flex-shrink-0 w-80"
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, column.id)}
    >
      <div className={`${column.color} text-white p-3 rounded-t-lg`}>
        <h3 className="font-semibold">
          {column.title} ({orders.length})
        </h3>
      </div>

      <div className={`bg-card border border-border min-h-[400px] max-h-[calc(100vh-300px)] overflow-y-auto p-2 rounded-b-lg space-y-2 transition-all duration-200 ${
        isDraggedOver ? 'bg-primary/5' : ''
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
