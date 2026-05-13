import { Checkbox } from "@/components/ui/checkbox";
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
  onDragOver: (e: React.DragEvent, columnId: string) => void;
  onCardClick: (order: Order) => void;
  onCardSelect: (orderId: string) => void;
  onSelectAll: (columnId: string, orderIds: string[]) => void;
  selectedOrders: Set<string>;
  onPrintOrder: (order: Order, isReprint: boolean) => void;
  onUpdateStatus: (orderId: string, newStatus: string, previousStatus: string, order: Order) => void;
  onDragStart: (e: React.DragEvent, order: Order) => void;
  onDragEnd: (e: React.DragEvent) => void;
  alertTime: number;
  isPrinting: boolean;
  isDraggedOver: boolean;
  draggedOrder: Order | null;
  onOpenWhatsApp: (phone: string, orderNumber: string) => void;
  pausedPhones: Set<string>;
  globalAgentPaused: boolean;
  onToggleAgentPause: (order: Order, pause: boolean) => void;
  onAssignDeliverer: (order: Order) => void;
  onChangeDeliverer: (order: Order) => void;
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
  onSelectAll,
  selectedOrders,
  onPrintOrder,
  onUpdateStatus,
  onDragStart,
  onDragEnd,
  alertTime,
  isPrinting,
  isDraggedOver,
  draggedOrder,
  onOpenWhatsApp,
  pausedPhones,
  globalAgentPaused,
  onToggleAgentPause,
  onAssignDeliverer,
  onChangeDeliverer,
}: KanbanColumnProps) {
  const bgClass = COLUMN_BG[column.id] || "bg-gray-50/80 dark:bg-gray-900/30";

  // Pickup não pode ir para delivering — sinaliza visualmente com estado inválido
  const isInvalidDrop = isDraggedOver && column.id === "delivering" && draggedOrder?.type === "pickup";

  const columnOrderIds = orders.map(o => o.id);
  const allSelected = columnOrderIds.length > 0 && columnOrderIds.every(id => selectedOrders.has(id));
  const someSelected = columnOrderIds.some(id => selectedOrders.has(id));

  const handleSelectAllToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectAll(column.id, allSelected ? [] : columnOrderIds);
  };

  return (
    <div
      className="flex-shrink-0 w-[340px] flex flex-col h-full"
      onDragOver={(e) => onDragOver(e, column.id)}
      onDrop={(e) => onDrop(e, column.id)}
    >
      <div className={`${column.color} text-white px-3 py-2 rounded-t-lg flex-shrink-0`}>
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-sm">
            {column.title} ({orders.length})
          </h3>
          {/* Selecionar todos da coluna */}
          {orders.length > 0 && (
            <button
              onClick={handleSelectAllToggle}
              className="flex items-center gap-1.5 text-[11px] text-white/80 hover:text-white transition-colors"
              title={allSelected ? "Desmarcar todos" : "Selecionar todos"}
            >
              <Checkbox
                checked={allSelected}
                className="w-3.5 h-3.5 border-white/60 data-[state=checked]:bg-white data-[state=checked]:border-white data-[state=checked]:text-gray-700"
                aria-label="Selecionar todos da coluna"
                // indeterminate visual via opacity quando parcial
                style={{ opacity: someSelected && !allSelected ? 0.6 : 1 }}
              />
              <span>{allSelected ? "Desmarcar" : someSelected ? "Mais" : "Todos"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Fundo colorido + scroll independente + placeholder visual no drag */}
      <div className={`flex-1 min-h-0 ${bgClass} border border-border overflow-y-auto p-2 rounded-b-lg space-y-2 transition-all duration-300 ${
        isInvalidDrop
          ? 'ring-2 ring-red-400 bg-red-50/60 dark:bg-red-950/30 cursor-not-allowed'
          : isDraggedOver ? 'ring-2 ring-primary/50 bg-primary/5 scale-[1.01]' : ''
      }`}>
        {/* Banner de drop inválido — pickup não vai para entrega */}
        {isInvalidDrop && (
          <div className="flex items-center justify-center gap-2 py-3 text-red-600 text-xs font-semibold bg-red-100 dark:bg-red-950/60 rounded-lg border border-red-300 dark:border-red-800">
            🚫 Retirada não vai para entrega
          </div>
        )}
        {orders.length > 0 ? (
          orders.map((order) => {
            const cleanPhone = (order.customer_phone || '').replace(/\D/g, '');
            const isAgentPaused = globalAgentPaused || pausedPhones.has(cleanPhone);
            return (
              <OrderCard
                key={order.id}
                order={order}
                isSelected={selectedOrders.has(order.id)}
                isAgentPaused={isAgentPaused}
                onSelect={() => onCardSelect(order.id)}
                onClick={() => onCardClick(order)}
                onPrint={onPrintOrder}
                onStatusChange={onUpdateStatus}
                onToggleAgentPause={onToggleAgentPause}
                onAssignDeliverer={onAssignDeliverer}
                onChangeDeliverer={onChangeDeliverer}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                alertTime={alertTime}
                isPrinting={isPrinting}
                onOpenWhatsApp={onOpenWhatsApp}
              />
            );
          })
        ) : (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Nenhum pedido
          </div>
        )}
      </div>
    </div>
  );
}
