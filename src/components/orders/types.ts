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
  payment_status?: string; // approved | pending | rejected | cancelled | refunded | charged_back
  // Endereço estruturado
  address?: string;
  address_number?: string;
  address_complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  observations?: string;
  status: string;
  type: "delivery" | "pickup";
  created_at: string;
  delivery_fee?: number;
  total?: number;
  company_id: string;
  source: "whatsapp" | "digital_menu" | "counter";
  // Entregador designado (preenchido ao avançar para "Em Entrega")
  deliverer_id?: string;
  deliverer_name?: string;
  deliverer_phone?: string;
  // Agendamento — pedido pra hora futura (status='scheduled' enquanto não chega a hora)
  scheduled_for?: string | null;
}

export interface StoreSettings {
  storeOpen: boolean;
  autoAccept: boolean;
  soundEnabled: boolean;
  deliveryTime: number;
  pickupTime: number;
  alertTime: number;
  autoPrint: boolean;
  notificationSound: string;
  visibleColumns: {
    pending: boolean;
    preparing: boolean;
    ready: boolean;
    delivering: boolean;
    completed: boolean;
    cancelled: boolean;
  };
}

// Status columns configuration — "scheduled" novo: pedidos pré-agendados pra hora futura
export const STATUS_COLUMNS = [
  { id: "scheduled", title: "Agendados", color: "bg-indigo-500" },
  { id: "pending", title: "Novo", color: "bg-red-500" },
  { id: "preparing", title: "Em Preparo", color: "bg-yellow-500" },
  { id: "ready", title: "Pronto", color: "bg-green-500" },
  { id: "delivering", title: "Em Entrega", color: "bg-purple-500" },
  { id: "completed", title: "Concluído", color: "bg-blue-500" },
  { id: "cancelled", title: "Cancelado", color: "bg-gray-500" },
] as const;

// Map Portuguese status to English
const statusMap: Record<string, string> = {
  'novo': 'pending', 'pendente': 'pending', 'pending': 'pending',
  'preparando': 'preparing', 'preparing': 'preparing',
  'pronto': 'ready', 'ready': 'ready',
  'em_entrega': 'delivering', 'delivering': 'delivering', 'entregando': 'delivering',
  'concluido': 'completed', 'concluída': 'completed', 'completed': 'completed',
  'cancelado': 'cancelled', 'cancelled': 'cancelled',
  'agendado': 'scheduled', 'scheduled': 'scheduled',
};

export const normalizeStatus = (status: string): string => {
  return statusMap[status?.toLowerCase()] || 'pending';
};

export const getNextStatus = (currentStatus: string, type: string): string => {
  switch (currentStatus) {
    case "scheduled": return "pending"; // ativar agendado manualmente
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
