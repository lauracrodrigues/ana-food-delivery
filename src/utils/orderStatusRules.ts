// Source of truth para regras de negócio de status de pedidos.
// Qualquer mudança de regra deve acontecer aqui — não em componentes individuais.
// NOTA: normalizeStatus e getNextStatus definidos aqui diretamente para evitar
// dependência circular com types.ts que causava TDZ no bundle Rollup.

export type OrderType = "delivery" | "pickup";

const statusMap: Record<string, string> = {
  'novo': 'pending', 'pendente': 'pending', 'pending': 'pending',
  'preparando': 'preparing', 'preparing': 'preparing',
  'pronto': 'ready', 'ready': 'ready',
  'em_entrega': 'delivering', 'delivering': 'delivering', 'entregando': 'delivering',
  'concluido': 'completed', 'concluída': 'completed', 'completed': 'completed',
  'cancelado': 'cancelled', 'cancelled': 'cancelled',
};

export const normalizeStatus = (status: string): string =>
  statusMap[status?.toLowerCase()] || 'pending';

// v3.0.0 — Mapa: status real → coluna do kanban (5 colunas).
// Pronto/Saiu unifica ready+delivering+out_for_delivery.
// Pendente engloba pending+scheduled+confirmed.
export const mapStatusToColumn = (status: string): string => {
  if (status === "scheduled" || status === "pending" || status === "confirmed") return "pending";
  if (status === "preparing") return "preparing";
  if (status === "ready" || status === "delivering" || status === "out_for_delivery") return "ready";
  if (status === "completed" || status === "delivered" || status === "archived") return "completed";
  if (status === "cancelled") return "cancelled";
  return "pending";
};

export const getNextStatus = (currentStatus: string, type: string): string => {
  switch (currentStatus) {
    case "pending":    return "preparing";
    case "preparing":  return type === "pickup" ? "ready" : "delivering";
    case "ready":      return "completed";
    case "delivering": return "completed";
    default:           return currentStatus;
  }
};

// Pedido de retirada nunca entra em "Em Entrega"
export const isInvalidStatusMove = (
  orderType: OrderType,
  targetStatus: string
): boolean => orderType === "pickup" && targetStatus === "delivering";

// Antes de avançar para "Em Entrega" em delivery, entregador deve ser designado
export const requiresDelivererAssignment = (
  orderType: OrderType,
  currentStatus: string
): boolean => orderType === "delivery" && currentStatus === "ready";

export const canTransitionTo = (
  orderType: OrderType,
  currentStatus: string,
  targetStatus: string
): boolean => {
  if (isInvalidStatusMove(orderType, targetStatus)) return false;
  return true;
};

// Tempo máximo de alerta por status (minutos)
export const STATUS_ALERT_TIMES: Record<string, number> = {
  pending:    15,
  preparing:  30, // sobrescrito por alertTime das settings
  ready:      10,
  delivering: 45,
  default:    60,
};

export const getStatusMaxTime = (status: string, alertTime?: number): number => {
  if (status === "preparing" && alertTime) return alertTime;
  return STATUS_ALERT_TIMES[status] ?? STATUS_ALERT_TIMES.default;
};
