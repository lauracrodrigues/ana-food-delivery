import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Clock,
  Printer,
  Eye,
  Bell,
  BellOff,
  Truck,
  Package,
  Filter,
  Loader2,
  Phone,
  AlertTriangle,
  Store,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { qzPrinter } from "@/lib/qz-tray";

interface OrderItem {
  id?: string;
  name?: string;
  quantity?: number;
  price?: number;
  observations?: string;
}

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  items: OrderItem[];
  payment_method: string;
  address?: string;
  observations?: string;
  status: string; // Can be in Portuguese or English
  type: "delivery" | "pickup";
  created_at: string;
  delivery_fee?: number;
  company_id: string;
}

const statusColumns = [
  { id: "pending", title: "Novo", color: "bg-blue-500" },
  { id: "preparing", title: "Em Preparo", color: "bg-yellow-500" },
  { id: "ready", title: "Pronto", color: "bg-green-500" },
  { id: "delivering", title: "Em Entrega", color: "bg-purple-500" },
  { id: "completed", title: "Concluído", color: "bg-muted" },
  { id: "cancelled", title: "Cancelado", color: "bg-red-500" },
];

// Map Portuguese status to English for compatibility
const statusMap: Record<string, string> = {
  'novo': 'pending',
  'pendente': 'pending',
  'pending': 'pending',
  'preparando': 'preparing',
  'preparing': 'preparing',
  'pronto': 'ready',
  'ready': 'ready',
  'em_entrega': 'delivering',
  'delivering': 'delivering',
  'entregando': 'delivering',
  'concluido': 'completed',
  'concluída': 'completed',
  'completed': 'completed',
  'cancelado': 'cancelled',
  'cancelled': 'cancelled',
};

const normalizeStatus = (status: string): string => {
  const normalized = statusMap[status?.toLowerCase()] || status;
  return normalized;
};

export function OrdersKanban() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [draggedOrder, setDraggedOrder] = useState<Order | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [isPrinting, setIsPrinting] = useState(false);
  
  // Settings states
  const [storeOpen, setStoreOpen] = useState(true);
  const [autoAccept, setAutoAccept] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [deliveryTime, setDeliveryTime] = useState(30);
  const [pickupTime, setPickupTime] = useState(45);
  const [visibleColumns, setVisibleColumns] = useState({
    pending: true,
    preparing: true,
    ready: true,
    delivering: true,
    completed: true,
    cancelled: false, // Cancelled disabled by default
  });
  const [bulkStatusSelectOpen, setBulkStatusSelectOpen] = useState(false);

  // Load orders from Supabase with debug logging
  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error("No user found");
        return [];
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile?.company_id) {
        console.log("No company_id found for orders query");
        return [];
      }

      console.log("Fetching orders for company:", profile.company_id);
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching orders:", error);
        throw error;
      }
      
      console.log("Orders fetched:", data);
      // Normalize status from Portuguese to English
      const normalizedOrders = (data as Order[]).map(order => ({
        ...order,
        status: normalizeStatus(order.status) as any
      }));
      console.log("Normalized orders:", normalizedOrders);
      return normalizedOrders;
    },
    refetchInterval: false, // Disable automatic refetch - we'll use realtime
    refetchOnWindowFocus: false, // Disable refetch on window focus
  });

  // Setup real-time subscription for orders
  useEffect(() => {
    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile?.company_id) return;

      const channel = supabase
        .channel('orders-realtime')
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: 'orders',
            filter: `company_id=eq.${profile.company_id}` // Only listen to orders from this company
          },
          (payload) => {
            console.log('Real-time update received:', payload);
            
            // Play sound for new orders if enabled
            if (soundEnabled && payload.eventType === 'INSERT') {
              const audio = new Audio('/notification.mp3');
              audio.play().catch(e => console.log('Could not play sound:', e));
            }
            
            refetch(); // Refetch orders when any change occurs
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupRealtime();
  }, [refetch, soundEnabled]);

  // Load settings from Supabase
  useQuery({
    queryKey: ["store-settings"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return null;

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile?.company_id) return null;

      const { data } = await supabase
        .from("store_settings")
        .select("*")
        .eq("company_id", profile.company_id)
        .single();

      if (data) {
        setStoreOpen(data.store_open ?? true);
        setAutoAccept(data.auto_accept ?? false);
        setSoundEnabled(data.sound_enabled ?? true);
        setDeliveryTime(data.delivery_time ?? 30);
        setPickupTime(data.pickup_time ?? 45);
        // Aplicar valores do banco apenas se forem válidos, senão usar padrões
        if (data.visible_columns && typeof data.visible_columns === 'object') {
          const storedColumns = data.visible_columns as typeof visibleColumns;
          // Garantir que todos os status iniciem habilitados, exceto cancelamento
          setVisibleColumns({
            pending: storedColumns.pending ?? true,
            preparing: storedColumns.preparing ?? true,
            ready: storedColumns.ready ?? true,
            delivering: storedColumns.delivering ?? true,
            completed: storedColumns.completed ?? true,
            cancelled: storedColumns.cancelled ?? false, // Sempre false por padrão
          });
        }
      }

      return data;
    },
    refetchInterval: false, // Disable automatic refetch
    refetchOnWindowFocus: false, // Disable refetch on window focus
  });

  // Update order status mutation
  const updateOrderMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const { error } = await supabase
        .from("orders")
        .update({ status })
        .eq("id", orderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast({
        title: "Status atualizado",
        description: "O status do pedido foi atualizado com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar status do pedido.",
        variant: "destructive",
      });
    },
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: any) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.company_id) throw new Error("Company not found");

      const { error } = await supabase
        .from("store_settings")
        .upsert({
          company_id: profile.company_id,
          ...settings,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-settings"] });
    },
  });

  // Print order function
  const handlePrintOrder = async (order: Order) => {
    setIsPrinting(true);
    try {
      await qzPrinter.printOrder(order);
      toast({
        title: "Impressão enviada",
        description: "O pedido foi enviado para a impressora com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao imprimir",
        description: error.message || "Verifique se o QZ Tray está instalado e em execução.",
        variant: "destructive",
      });
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, order: Order) => {
    setDraggedOrder(order);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggedOrder(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    if (draggedOrder && draggedOrder.status !== newStatus) {
      updateOrderMutation.mutate({ 
        orderId: draggedOrder.id, 
        status: newStatus 
      });
    }
    setDraggedOrder(null);
  };

  const updateOrderStatus = (orderId: string, newStatus: string) => {
    updateOrderMutation.mutate({ orderId, status: newStatus });
  };

  const toggleItemsExpansion = (orderId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedItems(newExpanded);
  };

  const toggleOrderSelection = (orderId: string) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const openWhatsApp = (phone: string, orderNumber: string) => {
    if (!phone) {
      toast({
        title: "Telefone não disponível",
        variant: "destructive",
      });
      return;
    }

    const cleanPhone = phone.replace(/\D/g, "");
    const message = `Olá! Sobre o pedido #${orderNumber}, como posso ajudar?`;
    const whatsappUrl = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  const filteredOrders = orders.filter((order) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    
    return (
      order.order_number?.toLowerCase().includes(searchLower) ||
      order.customer_name?.toLowerCase().includes(searchLower) ||
      order.customer_phone?.includes(searchTerm)
    );
  });

  const getNextStatus = (currentStatus: string, type: string) => {
    switch (currentStatus) {
      case "pending": return "preparing";
      case "preparing": return "ready";
      case "ready": return type === "delivery" ? "delivering" : "completed";
      case "delivering": return "completed";
      default: return currentStatus;
    }
  };

  const getStatusAction = (status: string, type: string) => {
    switch (status) {
      case "pending": return "Aceitar";
      case "preparing": return "Pronto";
      case "ready": return type === "delivery" ? "Enviar" : "Entregar";
      case "delivering": return "Concluir";
      default: return "";
    }
  };

  useEffect(() => {
    if (autoAccept) {
      const pendingOrders = orders.filter(o => o.status === "pending");
      pendingOrders.forEach(order => {
        updateOrderStatus(order.id, "preparing");
      });
    }
  }, [autoAccept, orders]);

  const timeOptions = [15, 30, 45, 60, 90, 120];

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 border-b pb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4" />
            <Switch 
              checked={storeOpen} 
              onCheckedChange={(checked) => {
                setStoreOpen(checked);
                updateSettingsMutation.mutate({ store_open: checked });
              }}
            />
            <span className={`text-sm font-medium ${storeOpen ? "text-success" : "text-destructive"}`}>
              {storeOpen ? "Aberto" : "Fechado"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm">Aceite Automático</label>
            <Switch 
              checked={autoAccept} 
              onCheckedChange={(checked) => {
                setAutoAccept(checked);
                updateSettingsMutation.mutate({ auto_accept: checked });
              }}
            />
          </div>

          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4" />
            <select
              value={deliveryTime}
              onChange={(e) => {
                const time = Number(e.target.value);
                setDeliveryTime(time);
                updateSettingsMutation.mutate({ delivery_time: time });
              }}
              className="text-sm border rounded px-2 py-1"
            >
              {timeOptions.map((time) => (
                <option key={time} value={time}>{time} min</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            <select
              value={pickupTime}
              onChange={(e) => {
                const time = Number(e.target.value);
                setPickupTime(time);
                updateSettingsMutation.mutate({ pickup_time: time });
              }}
              className="text-sm border rounded px-2 py-1"
            >
              {timeOptions.map((time) => (
                <option key={time} value={time}>{time} min</option>
              ))}
            </select>
          </div>

          <input
            type="text"
            placeholder="Buscar pedidos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="text-sm border rounded px-3 py-1 w-48"
          />

          {selectedOrders.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {selectedOrders.size} selecionados
              </span>
              <Select
                open={bulkStatusSelectOpen}
                onOpenChange={setBulkStatusSelectOpen}
                onValueChange={(value) => {
                  selectedOrders.forEach(orderId => {
                    updateOrderMutation.mutate({ orderId, status: value });
                  });
                  setSelectedOrders(new Set());
                  setBulkStatusSelectOpen(false);
                }}
              >
                <SelectTrigger className="w-40 h-8">
                  <SelectValue placeholder="Alterar status" />
                </SelectTrigger>
                <SelectContent>
                  {statusColumns.map((status) => (
                    <SelectItem key={status.id} value={status.id}>
                      {status.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button
            variant={soundEnabled ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              updateSettingsMutation.mutate({ sound_enabled: !soundEnabled });
            }}
          >
            {soundEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4 mr-1" />
            Filtros
          </Button>

        </div>

        {showFilters && (
          <Card className="mt-3 p-3">
            <h3 className="font-semibold mb-2 text-sm">Colunas Visíveis</h3>
            <div className="grid grid-cols-3 gap-2">
              {statusColumns.map((column) => (
                <div key={column.id} className="flex items-center space-x-2">
                  <Checkbox
                    checked={visibleColumns[column.id as keyof typeof visibleColumns]}
                    onCheckedChange={(checked) => {
                      const newColumns = { ...visibleColumns, [column.id]: checked };
                      setVisibleColumns(newColumns);
                      updateSettingsMutation.mutate({ visible_columns: newColumns });
                    }}
                    disabled={column.id === "pending" && autoAccept}
                  />
                  <label className="text-sm">{column.title}</label>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Kanban Board */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="ml-2">Carregando pedidos...</span>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 min-h-[500px]">
          {statusColumns
            .filter((column) => {
              if (column.id === "pending" && autoAccept) return false;
              return visibleColumns[column.id as keyof typeof visibleColumns];
            })
            .map((column) => {
              const columnOrders = filteredOrders.filter(
                (order) => normalizeStatus(order.status) === column.id
              );

              return (
                <div
                  key={column.id}
                  className="flex-shrink-0 w-80"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, column.id)}
                >
                  <div className={`${column.color} text-white p-3 rounded-t-lg`}>
                    <h3 className="font-semibold">
                      {column.title} ({columnOrders.length})
                    </h3>
                  </div>

                  <div className="bg-card border border-border min-h-[400px] p-2 rounded-b-lg space-y-2">
                    {columnOrders.map((order) => {
                      const isExpanded = expandedItems.has(order.id);
                      const items = order.items || [];
                      const itemsToShow = isExpanded ? items : items.slice(0, 2);
                      const elapsedMinutes = Math.floor(
                        (Date.now() - new Date(order.created_at).getTime()) / 60000
                      );

                      return (
                        <Card
                          key={order.id}
                          className="cursor-move hover:shadow-lg transition-shadow"
                          draggable
                          onDragStart={(e) => handleDragStart(e, order)}
                          onDragEnd={handleDragEnd}
                        >
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={selectedOrders.has(order.id)}
                                  onCheckedChange={() => toggleOrderSelection(order.id)}
                                />
                                <CardTitle className="text-sm">
                                  #{order.order_number || order.id.slice(0, 8)}
                                </CardTitle>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                {elapsedMinutes} min
                              </div>
                            </div>
                            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
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
                                  onClick={() => openWhatsApp(order.customer_phone, order.order_number)}
                                  className="flex items-center gap-1 text-xs text-green-600 hover:underline"
                                >
                                  <Phone className="w-3 h-3" />
                                  {order.customer_phone}
                                </button>
                              )}
                            </div>

                            <div className="bg-background rounded p-2">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium">
                                  Itens ({items.length})
                                </span>
                                {items.length > 2 && (
                                  <button
                                    onClick={() => toggleItemsExpansion(order.id)}
                                    className="text-xs text-primary hover:underline flex items-center gap-1"
                                  >
                                    {isExpanded ? (
                                      <>
                                        <ChevronUp className="w-3 h-3" />
                                        Menos
                                      </>
                                    ) : (
                                      <>
                                        <ChevronDown className="w-3 h-3" />
                                        +{items.length - 2}
                                      </>
                                    )}
                                  </button>
                                )}
                              </div>
                              {itemsToShow.map((item, index) => (
                                <div key={index} className="text-xs py-1">
                                  <div className="flex justify-between">
                                    <span>{item.quantity}x {item.name}</span>
                                    <span className="font-medium">
                                      R$ {((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                                    </span>
                                  </div>
                                  {item.observations && (
                                    <p className="text-muted-foreground italic">
                                      Obs: {item.observations}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>

                            <div className="flex gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedOrder(order)}
                                className="flex-1"
                              >
                                <Eye className="w-3 h-3" />
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePrintOrder(order)}
                                disabled={isPrinting}
                                className="flex-1"
                              >
                                <Printer className="w-3 h-3" />
                              </Button>

                              {order.status !== "completed" && order.status !== "cancelled" && (
                                <Button
                                  size="sm"
                                  onClick={() => updateOrderStatus(
                                    order.id,
                                    getNextStatus(order.status, order.type)
                                  )}
                                  className="flex-1"
                                >
                                  {getStatusAction(order.status, order.type)}
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}

                    {columnOrders.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        Nenhum pedido
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Pedido #{selectedOrder?.order_number || selectedOrder?.id.slice(0, 8)}</span>
              {selectedOrder && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePrintOrder(selectedOrder)}
                  disabled={isPrinting}
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimir
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Cliente</h4>
                <p>{selectedOrder.customer_name}</p>
                {selectedOrder.customer_phone && (
                  <p className="text-sm text-muted-foreground">{selectedOrder.customer_phone}</p>
                )}
              </div>

              {selectedOrder.address && (
                <div>
                  <h4 className="font-semibold mb-2">Endereço</h4>
                  <p className="text-sm">{selectedOrder.address}</p>
                </div>
              )}

              <div>
                <h4 className="font-semibold mb-2">Itens</h4>
                {(selectedOrder.items || []).map((item, index) => (
                  <div key={index} className="mb-2">
                    <div className="flex justify-between">
                      <span>{item.quantity}x {item.name}</span>
                      <span className="font-medium">
                        R$ {((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                      </span>
                    </div>
                    {item.observations && (
                      <p className="text-sm text-muted-foreground italic">
                        {item.observations}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div className="border-t pt-3">
                <div className="flex justify-between mb-2">
                  <span className="font-medium">Forma de Pagamento</span>
                  <span className="capitalize">
                    {selectedOrder.payment_method?.replace(/_/g, ' ') || 'Não informado'}
                  </span>
                </div>
                
                {selectedOrder.observations && (
                  <div className="mb-2">
                    <span className="font-medium">Observações</span>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedOrder.observations}
                    </p>
                  </div>
                )}
                
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span>
                    R$ {(
                      (selectedOrder.items || []).reduce(
                        (sum, item) => sum + (item.price || 0) * (item.quantity || 1),
                        0
                      ) + (selectedOrder.delivery_fee || 0)
                    ).toFixed(2)}
                  </span>
                </div>
              </div>

              {selectedOrder.customer_phone && (
                <Button
                  onClick={() => openWhatsApp(
                    selectedOrder.customer_phone,
                    selectedOrder.order_number
                  )}
                  className="w-full"
                  variant="outline"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Abrir WhatsApp
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}