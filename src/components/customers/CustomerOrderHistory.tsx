// src/components/customers/CustomerOrderHistory.tsx — v1.0.0
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ShoppingBag, TrendingUp, DollarSign, Clock, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── TIPOS ───────────────────────────────────────────────────────

interface Order {
  id: string;
  order_number?: string;
  status: string;
  total: number;
  type?: string;
  payment_method?: string;
  created_at: string;
  items?: Array<{ name: string; quantity: number }>;
}

interface CustomerOrderHistoryProps {
  open: boolean;
  onClose: () => void;
  customerName: string;
  customerPhone: string;
  companyId: string;
}

// ─── HELPERS ─────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  pending:    "Pendente",
  preparing:  "Preparando",
  delivering: "Entregando",
  completed:  "Concluído",
  cancelled:  "Cancelado",
  archived:   "Arquivado",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending:    "outline",
  preparing:  "secondary",
  delivering: "secondary",
  completed:  "default",
  cancelled:  "destructive",
  archived:   "outline",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatDate = (dateStr: string) => {
  try {
    return format(new Date(dateStr), "dd/MM/yy HH:mm", { locale: ptBR });
  } catch {
    return "-";
  }
};

// ─── COMPONENTE ──────────────────────────────────────────────────

export function CustomerOrderHistory({
  open,
  onClose,
  customerName,
  customerPhone,
  companyId,
}: CustomerOrderHistoryProps) {

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["customer-orders", customerPhone, companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, status, total, type, payment_method, created_at, items")
        .eq("company_id", companyId)
        .eq("customer_phone", customerPhone)
        .neq("status", "archived")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as Order[];
    },
    enabled: open && !!customerPhone && !!companyId,
  });

  // Métricas calculadas no frontend
  const validOrders = orders.filter(o => o.status !== "cancelled");
  const totalOrders = validOrders.length;
  const totalSpent = validOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
  const avgTicket = totalOrders > 0 ? totalSpent / totalOrders : 0;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            {customerName}
          </SheetTitle>
          <p className="text-sm text-muted-foreground">{customerPhone}</p>
        </SheetHeader>

        {/* Métricas resumo */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center mb-1">
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{totalOrders}</div>
            <div className="text-xs text-muted-foreground">Pedidos</div>
          </div>

          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center mb-1">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-lg font-bold">{formatCurrency(totalSpent)}</div>
            <div className="text-xs text-muted-foreground">Total gasto</div>
          </div>

          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center mb-1">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-lg font-bold">{formatCurrency(avgTicket)}</div>
            <div className="text-xs text-muted-foreground">Ticket médio</div>
          </div>
        </div>

        <Separator className="mb-4" />

        {/* Lista de pedidos */}
        <div className="space-y-1">
          <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Histórico de pedidos
          </h4>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Nenhum pedido encontrado
            </div>
          ) : (
            <div className="space-y-2">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="border rounded-lg p-3 space-y-2 hover:bg-muted/30 transition-colors"
                >
                  {/* Header do pedido */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {order.order_number && (
                        <span className="font-semibold text-sm">#{order.order_number}</span>
                      )}
                      <Badge variant={STATUS_VARIANTS[order.status] || "outline"} className="text-xs">
                        {STATUS_LABELS[order.status] || order.status}
                      </Badge>
                    </div>
                    <span className="font-medium text-sm">{formatCurrency(Number(order.total || 0))}</span>
                  </div>

                  {/* Data e tipo */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatDate(order.created_at)}</span>
                    <span className="capitalize">
                      {order.type === "delivery" ? "Entrega" : order.type === "pickup" ? "Retirada" : order.type || "—"}
                      {order.payment_method && ` · ${order.payment_method}`}
                    </span>
                  </div>

                  {/* Itens do pedido */}
                  {Array.isArray(order.items) && order.items.length > 0 && (
                    <ul className="text-xs text-muted-foreground space-y-0.5 pt-1 border-t">
                      {(order.items as Array<{ name: string; quantity: number }>).map((item, idx) => (
                        <li key={idx} className="flex gap-1">
                          <span className="font-medium">{item.quantity}x</span>
                          <span>{item.name}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
