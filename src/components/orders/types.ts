// Types and constants for Orders
export interface OrderItem {
  id?: string;
  name?: string;
  quantity?: number;
  price?: number;
  observations?: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  items: OrderItem[];
  payment_method: string;
  address?: string;
  observations?: string;
  status: string;
  type: "delivery" | "pickup";
  created_at: string;
  delivery_fee?: number;
  company_id: string;
  source?: "whatsapp" | "digital_menu" | "counter";
}

export interface StoreSettings {
  storeOpen: boolean;
  autoAccept: boolean;
  soundEnabled: boolean;
  deliveryTime: number;
  pickupTime: number;
  alertTime: number;
  visibleColumns: {
    pending: boolean;
    preparing: boolean;
    ready: boolean;
    delivering: boolean;
    completed: boolean;
    cancelled: boolean;
  };
}

// Status columns configuration
export const STATUS_COLUMNS = [
  { id: "pending", title: "Novo", color: "bg-blue-500" },
  { id: "preparing", title: "Em Preparo", color: "bg-yellow-500" },
  { id: "ready", title: "Pronto", color: "bg-green-500" },
  { id: "delivering", title: "Em Entrega", color: "bg-purple-500" },
  { id: "completed", title: "Concluído", color: "bg-muted" },
  { id: "cancelled", title: "Cancelado", color: "bg-red-500" },
] as const;

// Map Portuguese status to English
const statusMap: Record<string, string> = {
  'novo': 'pending', 'pendente': 'pending', 'pending': 'pending',
  'preparando': 'preparing', 'preparing': 'preparing',
  'pronto': 'ready', 'ready': 'ready',
  'em_entrega': 'delivering', 'delivering': 'delivering', 'entregando': 'delivering',
  'concluido': 'completed', 'concluída': 'completed', 'completed': 'completed',
  'cancelado': 'cancelled', 'cancelled': 'cancelled',
};

export const normalizeStatus = (status: string): string => {
  return statusMap[status?.toLowerCase()] || 'pending';
};

export const getNextStatus = (currentStatus: string, type: string): string => {
  switch (currentStatus) {
    case "pending": return "preparing";
    case "preparing": return type === "pickup" ? "ready" : "delivering";
    case "ready": return "completed";
    case "delivering": return "completed";
    default: return currentStatus;
  }
};

export const CANCELLATION_REASONS = [
  "Cliente desistiu",
  "Erro no pedido",
  "Falta de insumos",
  "Endereço incorreto",
  "Cliente não atendeu",
  "Outros"
] as const;

export const TIME_OPTIONS = [15, 30, 45, 60, 90, 120] as const;
