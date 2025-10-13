import { useState, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { qzPrinter } from "@/lib/qz-tray";
import { apiClient } from "@/lib/api-client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { KanbanHeader } from "./KanbanHeader";
import { KanbanColumn } from "./KanbanColumn";
import { OrderDetailsDialog } from "./OrderDetailsDialog";
import { CancelOrderDialog } from "./CancelOrderDialog";
import { 
  Order, 
  StoreSettings, 
  STATUS_COLUMNS, 
  normalizeStatus 
} from "./types";

export function OrdersKanban() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { companyId } = useCompanyId();
  
  // UI States
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [draggedOrder, setDraggedOrder] = useState<Order | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [isPrinting, setIsPrinting] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [audioPreloaded, setAudioPreloaded] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  
  // Settings state (grouped)
  const [settings, setSettings] = useState<StoreSettings>({
    storeOpen: true,
    autoAccept: false,
    soundEnabled: true,
    deliveryTime: 30,
    pickupTime: 45,
    alertTime: 10,
    autoPrint: true,
    notificationSound: '/sounds/bell.mp3',
    visibleColumns: {
      pending: true,
      preparing: true,
      ready: true,
      delivering: true,
      completed: true,
      cancelled: false,
    },
  });

  // Função para parar o áudio
  const stopNotificationSound = useCallback(() => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
    }
  }, [currentAudio]);

  // Load orders using API client
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      console.log("Fetching orders via API for company:", companyId);
      const response: any = await apiClient.getOrders(companyId);
      
      return (response.data as Order[]).map(order => ({
        ...order,
        status: normalizeStatus(order.status) as any
      }));
    },
    enabled: !!companyId,
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });

  // Pré-carregar áudio na primeira interação do usuário
  useEffect(() => {
    const preloadAudio = () => {
      if (!audioPreloaded) {
        const soundUrl = settings.notificationSound || '/sounds/bell.mp3';
        const audio = new Audio(soundUrl);
        audio.volume = 0.01;
        audio.play().then(() => {
          audio.pause();
          audio.currentTime = 0;
          setAudioPreloaded(true);
          console.log('✅ Áudio pré-carregado com sucesso:', soundUrl);
        }).catch(() => {
          console.log('⏳ Aguardando interação do usuário para áudio');
        });
      }
    };

    // Tentar pré-carregar em várias interações
    document.addEventListener('click', preloadAudio, { once: true });
    document.addEventListener('keydown', preloadAudio, { once: true });
    document.addEventListener('touchstart', preloadAudio, { once: true });

    return () => {
      document.removeEventListener('click', preloadAudio);
      document.removeEventListener('keydown', preloadAudio);
      document.removeEventListener('touchstart', preloadAudio);
    };
  }, [audioPreloaded, settings.notificationSound]);

  // Setup real-time subscription for orders
  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `company_id=eq.${companyId}`
        },
        (payload) => {
          console.log('🔔 Real-time update received:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newOrder = payload.new as Order;
            console.log('🆕 Novo pedido recebido:', newOrder.order_number);
            
            stopNotificationSound();
            
            if (settings.soundEnabled && audioPreloaded) {
              const soundUrl = settings.notificationSound || '/sounds/bell.mp3';
              const audio = new Audio(soundUrl);
              audio.loop = true;
              audio.volume = 0.7;
              
              const playPromise = audio.play();
              if (playPromise !== undefined) {
                playPromise
                  .then(() => {
                    console.log('✅ Som tocando:', soundUrl);
                    setCurrentAudio(audio);
                  })
                  .catch(e => {
                    console.error('❌ Erro ao tocar som:', e);
                    toast({
                      title: "🔇 Som desabilitado",
                      description: "Clique em qualquer lugar para habilitar notificações sonoras",
                    });
                  });
              }
              
              setTimeout(() => {
                audio.pause();
                audio.currentTime = 0;
                setCurrentAudio(null);
              }, 20000);
            }
            
            toast({
              title: "🎉 Novo Pedido!",
              description: `Pedido #${newOrder.order_number} de ${newOrder.customer_name}`,
            });
          }
          
          // Use invalidateQueries instead of refetch for better performance
          queryClient.invalidateQueries({ queryKey: ["orders", companyId] });
        }
      )
      .subscribe((status) => {
        console.log('🔔 Realtime subscription status:', status);
      });

    return () => {
      stopNotificationSound();
      supabase.removeChannel(channel);
    };
  }, [companyId, settings.soundEnabled, audioPreloaded, queryClient, toast, stopNotificationSound]);

  // NOTA: Lógica de auto-completar pedidos foi removida do frontend
  // Recomenda-se implementar no backend com Cron Job para melhor performance e confiabilidade

  // Load settings from Supabase
  useQuery({
    queryKey: ["store-settings", companyId],
    queryFn: async () => {
      if (!companyId) return null;

      const { data } = await supabase
        .from("store_settings")
        .select("*")
        .eq("company_id", companyId)
        .single();

      if (data) {
        const columns = data.visible_columns as any;
        const printerSettings = data.printer_settings as any;
        setSettings({
          storeOpen: data.store_open ?? true,
          autoAccept: data.auto_accept ?? false,
          soundEnabled: data.sound_enabled ?? true,
          deliveryTime: data.delivery_time ?? 30,
          pickupTime: data.pickup_time ?? 45,
          alertTime: data.alert_time ?? 10,
          autoPrint: printerSettings?.auto_print ?? true,
          notificationSound: data.notification_sound ?? '/sounds/bell.mp3',
          visibleColumns: {
            pending: columns?.pending ?? true,
            preparing: columns?.preparing ?? true,
            ready: columns?.ready ?? true,
            delivering: columns?.delivering ?? true,
            completed: columns?.completed ?? true,
            cancelled: columns?.cancelled ?? false,
          },
        });
      }

      return data;
    },
    enabled: !!companyId,
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });

  // Update order status mutation with optimistic updates
  const updateOrderMutation = useMutation({
    mutationFn: async ({ orderId, status, previousStatus, order, cancellationReason }: { 
      orderId: string; 
      status: string; 
      previousStatus?: string; 
      order?: Order;
      cancellationReason?: string;
    }) => {
      if (!companyId) throw new Error("Company not found");

      await apiClient.updateOrderStatus(orderId, status, companyId);
      
      // Auto-print when accepting order (non-blocking) if enabled
      if (previousStatus === 'pending' && status === 'preparing' && order) {
        stopNotificationSound();
        
        // Get current settings
        const { data: currentSettings } = await supabase
          .from("store_settings")
          .select("printer_settings")
          .eq("company_id", companyId)
          .single();
        
        const printerSettings = currentSettings?.printer_settings as any;
        const autoPrintEnabled = printerSettings?.auto_print ?? true;
        
        if (autoPrintEnabled) {
          qzPrinter.printOrder(order, undefined, false)
            .then(() => console.log('✅ Impressão automática realizada'))
            .catch(error => console.error('❌ Erro na impressão automática:', error));
        }
      }
      
      return { orderId, status };
    },
    onMutate: async ({ orderId, status }) => {
      await queryClient.cancelQueries({ queryKey: ["orders", companyId] });
      const previousOrders = queryClient.getQueryData<Order[]>(["orders", companyId]);

      queryClient.setQueryData<Order[]>(["orders", companyId], (old) => {
        if (!old) return old;
        return old.map((order) =>
          order.id === orderId ? { ...order, status, updated_at: new Date().toISOString() } : order
        );
      });

      return { previousOrders };
    },
    onSuccess: () => {
      toast({
        title: "Status atualizado",
        description: "O status do pedido foi atualizado com sucesso.",
      });
    },
    onError: (err, variables, context) => {
      if (context?.previousOrders) {
        queryClient.setQueryData(["orders", companyId], context.previousOrders);
      }
      toast({
        title: "Erro",
        description: "Erro ao atualizar status do pedido.",
        variant: "destructive",
      });
    },
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: Partial<StoreSettings>) => {
      if (!companyId) throw new Error("Company not found");
      await apiClient.updateStoreSettings(companyId, newSettings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-settings", companyId] });
    },
  });

  // Print order function
  const handlePrintOrder = async (order: Order, isReprint: boolean = false) => {
    console.log('='.repeat(50));
    console.log('🖨️ INÍCIO DO PROCESSO DE IMPRESSÃO');
    console.log('Pedido:', order.order_number);
    console.log('Status atual:', order.status);
    console.log('Reimpressão:', isReprint);
    console.log('QZ Tray disponível?', typeof window !== 'undefined' && typeof (window as any).qz !== 'undefined');
    
    setIsPrinting(true);
    
    try {
      console.log('Chamando qzPrinter.printOrder...');
      await qzPrinter.printOrder(order, undefined, isReprint);
      
      console.log('✅ Impressão concluída com sucesso!');
      toast({
        title: "✅ Impressão enviada",
        description: isReprint ? "Reimpressão enviada para a impressora com sucesso." : "O pedido foi enviado para a impressora com sucesso.",
      });
    } catch (error: any) {
      console.error('='.repeat(50));
      console.error("❌ ERRO AO IMPRIMIR");
      console.error("Tipo do erro:", typeof error);
      console.error("Erro completo:", error);
      console.error("Stack:", error?.stack);
      console.error('='.repeat(50));
      
      const errorMessage = error?.message || String(error) || "Erro desconhecido ao imprimir";
      
      toast({
        title: "❌ Erro ao imprimir",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsPrinting(false);
      console.log('✓ Processo de impressão finalizado');
      console.log('='.repeat(50));
    }
  };

  const handleDragStart = (e: React.DragEvent, order: Order) => {
    setDraggedOrder(order);
    e.dataTransfer.effectAllowed = "move";
    
    // Adicionar classe ao elemento sendo arrastado
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedOrder(null);
    // Remover estilos temporários
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    if (draggedOrder && draggedOrder.status !== newStatus) {
      updateOrderMutation.mutate({ 
        orderId: draggedOrder.id, 
        status: newStatus,
        previousStatus: draggedOrder.status,
        order: draggedOrder
      });
    }
    setDraggedOrder(null);
  };

  const updateOrderStatus = (orderId: string, newStatus: string, previousStatus?: string, order?: Order, cancellationReason?: string) => {
    updateOrderMutation.mutate({ orderId, status: newStatus, previousStatus, order, cancellationReason });
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
  
  const handleBulkStatusChange = (status: string) => {
    selectedOrders.forEach(orderId => {
      updateOrderMutation.mutate({ orderId, status });
    });
    setSelectedOrders(new Set());
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

  // Auto-accept effect
  useEffect(() => {
    if (settings.autoAccept) {
      const pendingOrders = orders.filter(o => o.status === "pending");
      pendingOrders.forEach(order => {
        updateOrderStatus(order.id, "preparing", order.status, order);
      });
    }
  }, [settings.autoAccept, orders]);
  
  const handleSettingsChange = (newSettings: Partial<StoreSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
    updateSettingsMutation.mutate(newSettings);
  };
  
  const handleCancelOrder = (reason: string) => {
    if (!selectedOrder) return;
    updateOrderMutation.mutate({
      orderId: selectedOrder.id,
      status: 'cancelled',
      cancellationReason: reason,
    });
    setShowCancelDialog(false);
    setSelectedOrder(null);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-3 text-lg">Carregando pedidos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <KanbanHeader
        settings={settings}
        onSettingsChange={handleSettingsChange}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
        selectedOrdersCount={selectedOrders.size}
        onBulkStatusChange={handleBulkStatusChange}
      />

      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[500px]">
        {STATUS_COLUMNS
          .filter((column) => {
            if (column.id === "pending" && settings.autoAccept) return false;
            return settings.visibleColumns[column.id as keyof typeof settings.visibleColumns];
          })
          .map((column) => {
            const columnOrders = filteredOrders.filter(
              (order) => normalizeStatus(order.status) === column.id
            );
            const isDraggedOver = draggedOrder && normalizeStatus(draggedOrder.status) !== column.id;

            return (
              <KanbanColumn
                key={column.id}
                column={column}
                orders={columnOrders}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onCardClick={(order) => {
                  stopNotificationSound();
                  setSelectedOrder(order);
                }}
                onCardSelect={toggleOrderSelection}
                selectedOrders={selectedOrders}
                onPrintOrder={handlePrintOrder}
                onUpdateStatus={updateOrderStatus}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                alertTime={settings.alertTime}
                isPrinting={isPrinting}
                isDraggedOver={!!isDraggedOver}
                onOpenWhatsApp={openWhatsApp}
              />
            );
          })}
      </div>

      <OrderDetailsDialog
        order={selectedOrder}
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onPrint={handlePrintOrder}
        onCancel={() => setShowCancelDialog(true)}
        onOpenWhatsApp={openWhatsApp}
        isPrinting={isPrinting}
      />

      <CancelOrderDialog
        open={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        onConfirm={handleCancelOrder}
        orderNumber={selectedOrder?.order_number || ""}
      />
    </div>
  );
}