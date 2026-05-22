// v2.6.0 — botão trocar entregador em qualquer status + notificação WA via API
import { useState, useEffect, useCallback, useRef } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Loader2 } from "lucide-react";
import { SkeletonKanban } from "@/components/loading";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// v1.2.0 — QZ Tray removido. Impressão via Ana Food Print gateway (queuePrintJob).
import { queuePrintJob } from "@/lib/ana-food-print";
import { apiClient } from "@/lib/api-client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { KanbanHeader } from "./KanbanHeader";
import { KanbanColumn } from "./KanbanColumn";
import { OrderDetailsDialog } from "./OrderDetailsDialog";
import { CancelOrderDialog } from "./CancelOrderDialog";
import { AssignDelivererDialog } from "./AssignDelivererDialog";
import { AssignOrderToDelivererDialog } from "./AssignOrderToDelivererDialog";
import { DeliveryMapDialog } from "./DeliveryMapDialog";
import { OrdersReportDialog } from "./OrdersReportDialog";
import {
  Order,
  StoreSettings,
  STATUS_COLUMNS,
} from "./types";
import {
  normalizeStatus,
  isInvalidStatusMove,
  requiresDelivererAssignment,
} from "@/utils/orderStatusRules";

export function OrdersKanban() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { companyId } = useCompanyId();
  // Preferências pessoais do usuário (som, colunas visíveis, impressora)
  const { preferences: userPrefs, savePreference } = useUserPreferences();

  // UI States
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [savedIndicator, setSavedIndicator] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [draggedOrder, setDraggedOrder] = useState<Order | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  // Filtro por período — sticky no kanban (não persiste entre logins, é da sessão)
  const [periodFilter, setPeriodFilter] = useState<"today" | "yesterday" | "week" | "month" | "all">("today");
  const [showReport, setShowReport] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  // localStorage: persiste entre recargas e navegação — usuário não precisa reativar toda vez
  const [audioPreloaded, setAudioPreloaded] = useLocalStorage<boolean>("orders:audioUnlocked", false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  // Pedido aguardando seleção de entregador antes de avançar para Em Entrega
  const [orderPendingDeliverer, setOrderPendingDeliverer] = useState<Order | null>(null);
  const [showDeliveryMap, setShowDeliveryMap] = useState(false);
  // Fluxo inverso: clica entregador no mapa → escolhe pedido pra atribuir
  const [delivererForAssign, setDelivererForAssign] = useState<{ id: string; name: string } | null>(null);
  
  // Settings state (grouped)
  const [settings, setSettings] = useState<StoreSettings>({
    storeOpen: true,
    autoAccept: false,
    soundEnabled: true,
    deliveryTime: 30,
    pickupTime: 45,
    alertTime: 10,
    autoPrint: true,
    notificationSound: '/sounds/default-notification.mp3',
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

  // v1.1.0 — perf: staleTime + placeholderData (sem re-render 2x em invalidate)
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders", companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const response: any = await apiClient.getOrders(companyId);

      return (response.data as Order[])
        .filter(order => order.status !== 'archived')
        .map(order => ({
          ...order,
          status: normalizeStatus(order.status) as any
        }));
    },
    enabled: !!companyId,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    staleTime: 3_000,                              // 3s — evita refetch em invalidate rajada
    placeholderData: (prev) => prev,               // mantém UI durante refetch (sem flash)
    gcTime: 5 * 60 * 1000,                          // 5min cache
  });

  // v1.1.0 — staleTime alto pra settings (mudam raro)
  const { data: storeSettings } = useQuery({
    queryKey: ["store-settings", companyId],
    queryFn: async () => {
      if (!companyId) return null;

      const { data, error } = await supabase
        .from("store_settings")
        .select("*")
        .eq("company_id", companyId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,        // 5min — settings muda raro
    refetchOnWindowFocus: false,
  });

  // Sessão WhatsApp ativa — usada para envio via API ao entregador
  const { data: waSession } = useQuery({
    queryKey: ["whatsapp-session", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data } = await supabase
        .from("whatsapp_config")
        .select("session_name")
        .eq("company_id", companyId)
        .eq("config_type", "session")  // filtra apenas sessões (não configs do bot)
        .eq("is_active", true)
        .not("session_name", "is", null)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data?.session_name ?? null;
    },
    enabled: !!companyId,
  });

  // Contadores entregadores (total cadastrados + em rota via work_status)
  // delivering = bateu ponto + tem pedido = GPS realmente ativo
  // Cron deliverer-cleanup marca offline após 30min stale (PM2)
  const { data: delivererCounts = { total: 0, gps: 0 } } = useQuery({
    queryKey: ["deliverer-counts", companyId],
    queryFn: async () => {
      if (!companyId) return { total: 0, gps: 0 };
      // @ts-expect-error -- tabela ainda fora dos types gerados
      const { data } = await supabase.from("deliverers")
        .select("id, work_status, active")
        .eq("company_id", companyId)
        .eq("active", true);
      const list = (data || []) as Array<{ work_status: string }>;
      return {
        total: list.length,
        gps: list.filter(d => d.work_status === "delivering").length,
      };
    },
    enabled: !!companyId,
    staleTime: 30_000,
  });

  // v1.1.0 — companyData não muda em runtime; cache longo
  const { data: companyData } = useQuery({
    queryKey: ["company-data", companyId],
    queryFn: async () => {
      if (!companyId) return null;

      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", companyId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Extract layout configs from store settings
  const printerSettings = storeSettings?.printer_settings as any;
  const layoutConfigs = printerSettings?.layout_configs;

  // Pré-carregar áudio na primeira interação do usuário
  useEffect(() => {
    const preloadAudio = () => {
      if (!audioPreloaded) {
        const soundUrl = settings.notificationSound || '/sounds/default-notification.mp3';
        const audio = new Audio(soundUrl);
        audio.volume = 0.01;
        audio.play().then(() => {
          audio.pause();
          audio.currentTime = 0;
          setAudioPreloaded(true);
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

  // Refs para acessar valores atuais dentro do callback sem re-criar subscription
  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  const stopSoundRef = useRef(stopNotificationSound);
  useEffect(() => { stopSoundRef.current = stopNotificationSound; }, [stopNotificationSound]);

  // v1.1.0 — Realtime + debounce invalidate (300ms) — múltiplos eventos em rajada = 1 fetch
  useEffect(() => {
    if (!companyId) return;

    // Debounce: agrupa eventos próximos em janela 300ms
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleInvalidate = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["orders", companyId] });
        debounceTimer = null;
      }, 300);
    };

    const channel = supabase
      .channel(`orders-realtime-${companyId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `company_id=eq.${companyId}` },
        (payload) => {
          scheduleInvalidate();

          if (payload.eventType !== 'INSERT') return;

          const newOrder = payload.new as Order;
          const s = settingsRef.current;

          stopSoundRef.current();

          if (s.soundEnabled) {
            const soundUrl = s.notificationSound || '/sounds/default-notification.mp3';
            const audio = new Audio(soundUrl);
            audio.loop = true;
            audio.volume = 0.7;
            audio.play()
              .then(() => { setCurrentAudio(audio); setAudioPreloaded(true); })
              .catch(() => {
                document.addEventListener('click', () => {
                  audio.play().then(() => { setCurrentAudio(audio); setAudioPreloaded(true); }).catch(() => {});
                }, { once: true });
                toast({
                  title: "🔔 NOVO PEDIDO — clique para ativar som",
                  description: `Pedido #${newOrder.order_number} aguardando.`,
                  duration: 30000,
                });
              });
            setTimeout(() => { audio.pause(); audio.currentTime = 0; setCurrentAudio(null); }, 20000);
          }

          toast({
            title: "🎉 Novo Pedido!",
            description: `Pedido #${newOrder.order_number} de ${newOrder.customer_name}`,
          });
        }
      )
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('[Kanban] ❌ Realtime subscription falhou:', status, err);
          toast({
            title: "Conexão em tempo real perdida",
            description: "Atualização automática de pedidos pode estar lenta. Atualizações via polling a cada 15s.",
            variant: "destructive",
            duration: 8000,
          });
          // Aumenta frequência do polling como fallback quando realtime cai
          clearInterval(poll);
          poll = setInterval(scheduleInvalidate, 15000);
        }
      });

    // v1.1.0 — polling fallback 60s (era 30s; realtime cobre). Usa debounce também.
    let poll = setInterval(scheduleInvalidate, 60_000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [companyId, queryClient, toast]);

  // Auto-corrige pickup orders que estão incorretamente em "delivering"
  // Cobre pedidos criados antes da regra existir (como #011)
  useEffect(() => {
    const wrongOrders = orders.filter(
      o => o.type === "pickup" && normalizeStatus(o.status) === "delivering"
    );
    wrongOrders.forEach(o => {
      updateOrderMutation.mutate({ orderId: o.id, status: "ready", previousStatus: o.status, order: o });
    });
    if (wrongOrders.length > 0) {
      toast({
        title: `${wrongOrders.length} pedido(s) corrigido(s)`,
        description: "Pedidos de retirada foram movidos de volta para Pronto.",
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);

  // NOTA: Lógica de auto-completar pedidos foi removida do frontend
  // Recomenda-se implementar no backend com Cron Job para melhor performance e confiabilidade

  // Merge storeSettings + userPrefs → settings
  // useEffect garante re-aplicação quando qualquer dos dois chegar (fix race condition)
  useEffect(() => {
    if (!storeSettings) return;

    const userCols = userPrefs.visibleColumns as any;
    const storeCols = storeSettings.visible_columns as any;
    const printerSettings = storeSettings.printer_settings as any;

    setSettings({
      storeOpen:    storeSettings.store_open ?? true,
      autoAccept:   storeSettings.auto_accept ?? false,
      deliveryTime: storeSettings.delivery_time ?? 30,
      pickupTime:   storeSettings.pickup_time ?? 45,
      alertTime:    storeSettings.alert_time ?? 10,
      // Prefs pessoais têm prioridade sobre config da empresa
      soundEnabled:      userPrefs.soundEnabled      ?? storeSettings.sound_enabled      ?? true,
      notificationSound: userPrefs.notificationSound ?? storeSettings.notification_sound ?? '/sounds/default-notification.mp3',
      autoPrint:         userPrefs.autoPrint         ?? printerSettings?.auto_print      ?? true,
      visibleColumns: userCols ? {
        pending:    userCols.pending    ?? true,
        preparing:  userCols.preparing  ?? true,
        ready:      userCols.ready      ?? true,
        delivering: userCols.delivering ?? true,
        completed:  userCols.completed  ?? true,
        cancelled:  userCols.cancelled  ?? false,
      } : {
        pending:    storeCols?.pending    ?? true,
        preparing:  storeCols?.preparing  ?? true,
        ready:      storeCols?.ready      ?? true,
        delivering: storeCols?.delivering ?? true,
        completed:  storeCols?.completed  ?? true,
        cancelled:  storeCols?.cancelled  ?? false,
      },
    });
  }, [storeSettings, userPrefs]);

  // Update order status mutation with optimistic updates
  const updateOrderMutation = useMutation({
    mutationFn: async ({ orderId, status, previousStatus, order, cancellationReason, delivererId, delivererName }: {
      orderId: string;
      status: string;
      previousStatus?: string;
      order?: Order;
      cancellationReason?: string;
      delivererId?: string;
      delivererName?: string;
    }) => {
      if (!companyId) throw new Error("Company not found");

      await apiClient.updateOrderStatus(orderId, status, companyId);

      // Salva entregador vinculado — precisa salvar nome também para exibir no card
      if (delivererId) {
        await supabase
          .from("orders")
          .update({ deliverer_id: delivererId, deliverer_name: delivererName ?? null })
          .eq("id", orderId);
      }
      
          // v1.2.0 — Auto-print configurável: store_settings.auto_print_on
          //   'off'                = nunca imprime auto
          //   'confirmed'          = imprime ao aceitar (pending → preparing) — DEFAULT
          //   'out_for_delivery'   = imprime só quando sair pra entrega
          // Detecta transição relevante:
          const isConfirmTransition = previousStatus === 'pending' && status === 'preparing';
          const isOutForDeliveryTransition = (previousStatus === 'preparing' || previousStatus === 'ready')
                                          && status === 'out_for_delivery';

        if ((isConfirmTransition || isOutForDeliveryTransition) && order) {
          if (isConfirmTransition) stopNotificationSound();

          const { data: currentSettings } = await supabase
            .from("store_settings")
            .select("printer_settings, auto_print_on")
            .eq("company_id", companyId)
            .single();

          const printerSettings = currentSettings?.printer_settings as any;
          const autoPrintOn = (currentSettings as any)?.auto_print_on
            ?? (printerSettings?.auto_print === false ? 'off' : 'confirmed'); // back-compat

          const shouldPrintNow =
            (autoPrintOn === 'confirmed' && isConfirmTransition) ||
            (autoPrintOn === 'out_for_delivery' && isOutForDeliveryTransition);

          if (shouldPrintNow) {
            // Buscar dados da empresa para enriquecer o pedido
            const { data: companyDataForPrint } = await supabase
              .from("companies")
              .select("*")
              .eq("id", companyId)
              .single();
            
            // Helper para formatar endereço
            const formatAddress = (addr: any): string => {
              if (!addr) return '';
              if (typeof addr === 'string') return addr;
              const parts = [
                addr.street && addr.number ? `${addr.street}, ${addr.number}` : addr.street,
                addr.complement,
                addr.neighborhood,
                addr.city && addr.state ? `${addr.city} - ${addr.state}` : addr.city,
                addr.zip_code ? `CEP: ${addr.zip_code}` : null
              ].filter(Boolean);
              return parts.join('\n');
            };
            
            // Enriquecer order com dados da empresa
            const enrichedOrderForAutoPrint = {
              ...order,
              company_name: companyDataForPrint?.name || 'EMPRESA',
              company_fantasy_name: companyDataForPrint?.fantasy_name || companyDataForPrint?.name,
              company_phone: companyDataForPrint?.phone || '',
              company_address: formatAddress(companyDataForPrint?.address),
              company_email: companyDataForPrint?.email || '',
            };
            
            // Buscar config do setor caixa
            const caixaConfig = printerSettings?.sectors?.caixa;

            // v1.3.0 — Auto-print usa MESMO formatador do preview (formatReceipt + marcadores)
            // Antes: payload cru → agente caía no formatOrderPayload básico → "undefined x ..."
            // Agora: lines do preview → texto com {{C}} {{B}} → impressão IDÊNTICA ao preview
            const { formatReceipt } = await import("@/lib/thermal-formatter");
            const { linesToEscPosMarkers } = await import("@/lib/lines-to-escpos-markers");
            try {
              const linesCaixa = formatReceipt(enrichedOrderForAutoPrint, caixaConfig?.layout || {}, companyDataForPrint);
              const textCaixa = linesToEscPosMarkers(linesCaixa);
              queuePrintJob({
                sector: "caixa",
                payload: { text: textCaixa },
                copies: caixaConfig?.copies || 1,
              }).then(r => {
                if (r.ok) console.log("✅ AnaFoodPrint caixa enfileirado");
                else console.warn("⚠️ Impressão caixa falhou:", r.error);
              });
            } catch (e: any) {
              console.error("❌ formatReceipt fail:", e.message);
              // Fallback: manda payload bruto pro agente tentar
              queuePrintJob({ sector: "caixa", payload: enrichedOrderForAutoPrint, copies: caixaConfig?.copies || 1 });
            }

            // Impressão por SETOR (cozinha/copa/bar/etc) baseado em products.print_sector
            // Agrupa items do pedido pelo setor, gera 1 ticket por setor ativo
            try {
              const orderItems = Array.isArray((order as any).items) ? (order as any).items : [];
              const productIds = orderItems
                .map((it: any) => it.id || it.product_id)
                .filter(Boolean);

              if (productIds.length > 0) {
                // v1.0.1 — fallback: produto.print_sector NULL → herda categories.print_sector
                const { data: products } = await supabase
                  .from("products")
                  .select("id, name, print_sector, categories(print_sector)")
                  .in("id", productIds);

                // Map: setor → array de items
                const bySector: Record<string, any[]> = {};
                for (const item of orderItems) {
                  const prodId = item.id || item.product_id;
                  const prod = (products || []).find((p: any) => p.id === prodId);
                  // Herança: produto override, senão categoria. "none" = não imprime.
                  const sector = prod?.print_sector ?? (prod?.categories as any)?.print_sector;
                  if (!sector || sector === 'none' || sector === 'caixa') continue; // caixa já impresso acima
                  if (!bySector[sector]) bySector[sector] = [];
                  bySector[sector].push(item);
                }

                // v1.3.0 — Ticket por setor: usa formatReceipt + layout do sector
                for (const [sector, items] of Object.entries(bySector)) {
                  const sectorCfg = printerSettings?.sectors?.[sector];
                  const orderForSector = { ...enrichedOrderForAutoPrint, items };
                  try {
                    const linesSec = formatReceipt(orderForSector, sectorCfg?.layout || {}, companyDataForPrint);
                    const textSec = linesToEscPosMarkers(linesSec);
                    queuePrintJob({
                      sector: sector as any,
                      payload: { text: textSec },
                      copies: sectorCfg?.copies || 1,
                    }).then(r => {
                      if (r.ok) console.log(`✅ AnaFoodPrint ${sector} enfileirado (${items.length} itens)`);
                    });
                  } catch (e: any) {
                    console.error(`❌ formatReceipt ${sector}:`, e.message);
                    queuePrintJob({ sector: sector as any, payload: orderForSector, copies: sectorCfg?.copies || 1 });
                  }
                }
              }
            } catch (sectorErr) {
              console.error('❌ Erro setor print:', sectorErr);
            }
          }
        }

        // Cancelamento auto-print + remove do kanban imediato (status=cancelled)
        if (status === 'cancelled' && order) {
          stopNotificationSound();
          try {
            const { data: currentSettings } = await supabase
              .from("store_settings")
              .select("printer_settings")
              .eq("company_id", companyId)
              .single();
            const printerSettings = currentSettings?.printer_settings as any;

            // Buscar dados empresa
            const { data: companyDataForPrint } = await supabase
              .from("companies")
              .select("*")
              .eq("id", companyId)
              .single();

            const enrichedCancel = {
              ...order,
              status: 'cancelled',
              cancellation_reason: cancellationReason || (order as any).cancellation_reason || 'Cancelado pelo cliente',
              company_name: companyDataForPrint?.name || 'EMPRESA',
              company_fantasy_name: companyDataForPrint?.fantasy_name || companyDataForPrint?.name,
              company_phone: companyDataForPrint?.phone || '',
              company_email: companyDataForPrint?.email || '',
            };

            // v1.2.0 — Ticket CANCELADO em todos setores via gateway (avisa cozinha pra parar)
            const sectors = printerSettings?.sectors || {};
            for (const sectorName of Object.keys(sectors)) {
              queuePrintJob({
                sector: sectorName as any,
                payload: enrichedCancel,
                copies: 1,
              }).then(r => {
                if (r.ok) console.log(`✅ Cancelamento enfileirado em ${sectorName}`);
              });
            }
          } catch (cancelPrintErr) {
            console.error('❌ Erro auto-print cancelamento:', cancelPrintErr);
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

  // Query pause states para todos os pedidos visíveis
  const { data: agentPauseData } = useQuery({
    queryKey: ["agent-pause", companyId],
    queryFn: async () => {
      if (!companyId) return { pausedPhones: new Set<string>(), globalPause: false };
      const { data } = await supabase
        .from("whatsapp_agent_control")
        .select("phone, is_paused")
        .eq("company_id", companyId)
        .eq("is_paused", true);
      const globalPause = (data || []).some((r: any) => r.phone === null);
      const pausedPhones = new Set<string>(
        (data || []).filter((r: any) => r.phone !== null).map((r: any) => String(r.phone))
      );
      return { pausedPhones, globalPause };
    },
    enabled: !!companyId,
    refetchInterval: 30000,
  });

  const pausedPhones = agentPauseData?.pausedPhones || new Set<string>();
  const globalAgentPaused = agentPauseData?.globalPause || false;

  // Toggle pausa do agente para um contato específico
  const toggleAgentPauseMutation = useMutation({
    mutationFn: async ({ order, pause }: { order: Order; pause: boolean }) => {
      if (!companyId) throw new Error("Company not found");
      const phone = (order.customer_phone || '').replace(/\D/g, '');
      const { error } = await supabase
        .from("whatsapp_agent_control")
        .upsert(
          { company_id: companyId, phone, is_paused: pause, updated_at: new Date().toISOString() },
          { onConflict: 'company_id,phone' }
        );
      if (error) throw error;
      return { phone, pause };
    },
    onSuccess: ({ phone, pause }) => {
      queryClient.invalidateQueries({ queryKey: ["agent-pause", companyId] });
      toast({
        title: pause ? "⏸️ Agente pausado" : "▶️ Agente retomado",
        description: pause
          ? `Bot pausado para ${phone}. Cliente não receberá respostas.`
          : `Bot retomado para ${phone}.`,
      });
    },
    onError: () => {
      toast({ title: "Erro ao alterar pausa", variant: "destructive" });
    },
  });

  const handleToggleAgentPause = (order: Order, pause: boolean) => {
    toggleAgentPauseMutation.mutate({ order, pause });
  };

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
    console.log('Order completo recebido:', {
      id: order.id,
      order_number: order.order_number,
      customer_name: order.customer_name,
      items_count: order.items?.length
    });
    
    setIsPrinting(true);
    
    try {
      console.log('Enfileirando print via Ana Food Print gateway...');

      // Helper para formatar endereço completo
      const formatAddress = (addr: any): string => {
        if (!addr) return '';
        if (typeof addr === 'string') return addr;
        
        const parts = [
          addr.street && addr.number ? `${addr.street}, ${addr.number}` : addr.street,
          addr.complement,
          addr.neighborhood,
          addr.city && addr.state ? `${addr.city} - ${addr.state}` : addr.city,
          addr.zip_code ? `CEP: ${addr.zip_code}` : null
        ].filter(Boolean);
        return parts.join('\n');
      };
      
      // CRÍTICO: Enriquecer order com TODOS os dados da empresa necessários
      const enrichedOrder = {
        ...order,
        company_name: companyData?.name || 'EMPRESA',
        company_fantasy_name: companyData?.fantasy_name || companyData?.name || 'EMPRESA',
        company_phone: companyData?.phone || '',
        company_address: formatAddress(companyData?.address),
        company_email: companyData?.email || '',
      };
      
      console.log('✅ Order enriquecido com dados da empresa:', {
        hasCompanyName: !!enrichedOrder.company_name,
        hasCompanyPhone: !!enrichedOrder.company_phone,
        hasCompanyAddress: !!enrichedOrder.company_address,
        hasCompanyEmail: !!enrichedOrder.company_email,
        orderNumber: enrichedOrder.order_number
      });
      
      // SEMPRE usar setor CAIXA para impressões manuais do kanban
      const sector = 'caixa';
      
      // Buscar config do setor CAIXA
      const printerSettings = storeSettings?.printer_settings as any;
      const sectorConfig = printerSettings?.sectors?.[sector];
      
      console.log('🖨️ Configuração de impressão:', {
        sector,
        enabled: sectorConfig?.enabled,
        printer: sectorConfig?.printer_name,
        copies: sectorConfig?.copies,
        hasLayout: !!sectorConfig?.layout
      });
      
      // v1.3.1 — Impressão MANUAL usa MESMO pipeline do auto-print (formatReceipt + markers)
      // Antes: payload cru → agente fallback formatOrderPayload básico → "undefinedx Produto Total"
      // Agora: lines do preview → texto com {{C}} {{B}} → impressão IDÊNTICA ao preview
      const { formatReceipt } = await import("@/lib/thermal-formatter");
      const { linesToEscPosMarkers } = await import("@/lib/lines-to-escpos-markers");

      let printPayload: any;
      try {
        const lines = formatReceipt(enrichedOrder, sectorConfig?.layout || {}, companyData);
        const text = linesToEscPosMarkers(lines);
        printPayload = { text, _reprint: isReprint };
        console.log('✅ Recibo formatado com formatReceipt — lines:', lines.length);
      } catch (e: any) {
        console.error("❌ formatReceipt fail no manual print:", e.message);
        // Fallback raw (agente vai tentar formatOrderPayload)
        printPayload = { ...enrichedOrder, _reprint: isReprint };
      }

      const r = await queuePrintJob({
        sector: 'caixa',
        payload: printPayload,
        copies: sectorConfig?.copies || 1,
      });
      if (!r.ok) throw new Error(r.error || 'Falha enfileirar');
      
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

  const isInvalidMove = (order: Order, targetStatus: string) =>
    isInvalidStatusMove(order.type, targetStatus);

  const handleDragOver = (e: React.DragEvent, targetColumnId: string) => {
    e.stopPropagation();
    // Bloqueia cursor se pickup tentando entrar em delivering
    if (draggedOrder && isInvalidMove(draggedOrder, targetColumnId)) {
      e.dataTransfer.dropEffect = "none";
      // Não chama preventDefault → browser mostra cursor "proibido" e não dispara onDrop
      return;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    if (draggedOrder && draggedOrder.status !== newStatus) {
      // Drop bloqueado — pickup não entra em delivering
      if (isInvalidMove(draggedOrder, newStatus)) {
        toast({
          title: "Bloqueado",
          description: "Pedidos de retirada não podem ir para Em Entrega.",
          variant: "destructive",
        });
        setDraggedOrder(null);
        return;
      }
      updateOrderMutation.mutate({
        orderId: draggedOrder.id,
        status: newStatus,
        previousStatus: draggedOrder.status,
        order: draggedOrder
      });
    }
    setDraggedOrder(null);
  };

  const updateOrderStatus = (orderId: string, newStatus: string, previousStatus?: string, order?: Order, cancellationReason?: string, delivererId?: string) => {
    // Botão "Avançar" também bloqueado para retirada→entrega
    if (order && isInvalidMove(order, newStatus)) return;
    updateOrderMutation.mutate({ orderId, status: newStatus, previousStatus, order, cancellationReason, delivererId });
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

  // Selecionar/desmarcar todos de uma coluna
  const handleSelectAllInColumn = (_columnId: string, orderIds: string[]) => {
    const newSelected = new Set(selectedOrders);
    if (orderIds.length === 0) {
      // Desmarcar todos da coluna — remove apenas os ids que pertencem à coluna
      const columnOrders = filteredOrders.filter(o => normalizeStatus(o.status) === _columnId);
      columnOrders.forEach(o => newSelected.delete(o.id));
    } else {
      orderIds.forEach(id => newSelected.add(id));
    }
    setSelectedOrders(newSelected);
  };
  
  const handleBulkStatusChange = (status: string) => {
    selectedOrders.forEach(orderId => {
      updateOrderMutation.mutate({ orderId, status });
    });
    setSelectedOrders(new Set());
  };

  const openWhatsApp = async (phone: string, orderNumber: string) => {
    if (!phone) {
      toast({ title: "Telefone não disponível", variant: "destructive" });
      return;
    }
    const cleanPhone = phone.replace(/\D/g, "");
    const message = `Olá! Sobre o pedido #${orderNumber}, como posso ajudar?`;

    if (waSession) {
      try {
        await supabase.functions.invoke('whatsapp-evolution', {
          body: { action: "sendText", instanceName: waSession, number: cleanPhone, message },
        });
        toast({ title: "Mensagem enviada via WhatsApp ✓" });
      } catch {
        toast({ title: "Erro ao enviar WA", variant: "destructive" });
      }
    } else {
      window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`, "_blank");
    }
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
  
  // Dispara indicador visual "Salvo ✓" por 2s
  const triggerSaved = () => {
    setSavedIndicator(true);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSavedIndicator(false), 2000);
  };

  const handleSettingsChange = (newSettings: Partial<StoreSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
    triggerSaved();

    // Campos pessoais → salva em profiles.preferences (por usuário)
    const personalFields: Array<keyof StoreSettings> = ['soundEnabled', 'notificationSound', 'visibleColumns', 'autoPrint'];
    const personalPatch: Record<string, unknown> = {};
    const companyPatch: Partial<StoreSettings> = {};

    for (const [key, val] of Object.entries(newSettings)) {
      if (personalFields.includes(key as keyof StoreSettings)) {
        personalPatch[key] = val;
      } else {
        companyPatch[key as keyof StoreSettings] = val as any;
      }
    }

    if (Object.keys(personalPatch).length > 0) savePreference(personalPatch);
    if (Object.keys(companyPatch).length > 0) updateSettingsMutation.mutate(companyPatch);
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

  const handleChangeType = async (orderId: string, newType: "delivery" | "pickup") => {
    const { error } = await supabase
      .from("orders")
      .update({ type: newType, updated_at: new Date().toISOString() })
      .eq("id", orderId);
    if (error) {
      toast({ title: "Erro ao alterar tipo", description: error.message, variant: "destructive" });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["orders", companyId] });
    // Atualiza selectedOrder localmente para o badge mudar imediatamente
    setSelectedOrder(prev => prev ? { ...prev, type: newType } : prev);
    toast({ title: `Pedido alterado para ${newType === "delivery" ? "Entrega" : "Retirada"}` });
  };

  // Monta mensagem WhatsApp para o entregador com todos os dados do pedido
  const buildDelivererMessage = (order: Order): string => {
    const items = (order.items || [])
      .map(i => `• ${i.quantity}x ${i.name}${i.price ? ` — R$ ${(i.price * (i.quantity || 1)).toFixed(2).replace('.', ',')}` : ''}`)
      .join('\n');

    const address = [
      order.address && order.address_number ? `${order.address}, ${order.address_number}` : order.address,
      order.address_complement,
      order.neighborhood,
      order.city && order.state ? `${order.city}/${order.state}` : order.city,
      order.zip_code ? `CEP ${order.zip_code}` : null,
    ].filter(Boolean).join('\n');

    const total = order.total
      ? `R$ ${order.total.toFixed(2).replace('.', ',')}`
      : '';

    // v1.0.1 — Fallback pra order_number null (orders antigos antes do trigger)
    const numero = order.order_number || (order.id ? String(order.id).slice(0, 8).toUpperCase() : 'S/N');
    // v1.0.1 — Deep link pro app do entregador (já assinado, só abre)
    const linkApp = `https://anafood.vip/entregador`;

    return [
      `🛵 *Novo pedido para entrega!*`,
      ``,
      `📋 *Pedido #${numero}*`,
      `👤 Cliente: ${order.customer_name}`,
      order.customer_phone ? `📱 ${order.customer_phone}` : null,
      address ? `📍 *Endereço:*\n${address}` : null,
      ``,
      `📦 *Itens:*`,
      items,
      ``,
      total ? `💰 *Total: ${total}*` : null,
      order.payment_method ? `💳 Pagamento: ${order.payment_method}` : null,
      order.observations ? `⚠️ Obs: ${order.observations}` : null,
      ``,
      `━━━━━━━━━━━━━━━━━━━━`,
      `👆 *Abra no app:*`,
      linkApp,
    ].filter(line => line !== null).join('\n');
  };

  // Chamado pelo OrderCard quando pedido de delivery em "Pronto" clica "Avançar"
  const handleAssignDeliverer = (order: Order) => {
    setOrderPendingDeliverer(order);
  };

  // Trocar entregador — abre modal para qualquer pedido delivery
  const handleChangeDeliverer = (order: Order) => {
    setOrderPendingDeliverer(order);
  };

  // Confirma seleção do entregador: vincula ao pedido + avança status se necessário + notifica via API ou link
  const handleConfirmDeliverer = async (order: Order, deliverer: { id: string; name: string; phone: string }) => {
    const nextStatus = order.status === "ready" ? "delivering" : order.status;
    updateOrderMutation.mutate({
      orderId: order.id,
      status: nextStatus,
      previousStatus: order.status,
      order,
      delivererId: deliverer.id,
      delivererName: deliverer.name,
    });

    const msg = buildDelivererMessage(order);
    const phone = deliverer.phone.replace(/\D/g, '');

    if (waSession) {
      // Envia via Evolution API — sem abrir link
      try {
        await supabase.functions.invoke('whatsapp-evolution', {
          body: { action: "sendText", instanceName: waSession, number: phone, message: msg },
        });
        toast({ title: "Entregador notificado via WhatsApp ✓" });
      } catch {
        toast({ title: "Erro ao enviar WA", description: "Verifique a conexão WhatsApp", variant: "destructive" });
      }
    } else {
      // Fallback: abre link wa.me
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    }
  };

  // Helper: limites do período pra filtrar created_at
  const periodBounds = (() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday.getTime() - 86400000);
    const startOfWeek = new Date(startOfToday.getTime() - 7 * 86400000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    switch (periodFilter) {
      case "today":     return { from: startOfToday, to: null };
      case "yesterday": return { from: startOfYesterday, to: startOfToday };
      case "week":      return { from: startOfWeek, to: null };
      case "month":     return { from: startOfMonth, to: null };
      default:          return { from: null, to: null };
    }
  })();

  const filteredOrders = orders.filter((order) => {
    // Filtro período (created_at)
    if (periodBounds.from || periodBounds.to) {
      const t = new Date(order.created_at).getTime();
      if (periodBounds.from && t < periodBounds.from.getTime()) return false;
      if (periodBounds.to   && t >= periodBounds.to.getTime()) return false;
    }
    // Filtro busca
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      order.order_number?.toLowerCase().includes(searchLower) ||
      order.customer_name?.toLowerCase().includes(searchLower) ||
      order.customer_phone?.includes(searchTerm)
    );
  });

  // Export CSV — flat orders do período/busca atual
  const handleExportCSV = () => {
    if (filteredOrders.length === 0) return;
    const rows = filteredOrders.map(o => ({
      numero: o.order_number || "",
      cliente: o.customer_name || "",
      telefone: o.customer_phone || "",
      status: o.status || "",
      total: o.total ?? 0,
      pagamento: o.payment_method || "",
      endereco: [o.address, o.address_number, o.neighborhood, o.city].filter(Boolean).join(", "),
      criado_em: o.created_at ? new Date(o.created_at).toLocaleString("pt-BR") : "",
    }));
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(","),
      ...rows.map(r => headers.map(h => {
        const v = String((r as any)[h] ?? "").replace(/"/g, '""');
        return v.includes(",") || v.includes("\n") ? `"${v}"` : v;
      }).join(",")),
    ].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pedidos_${periodFilter}_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) return <SkeletonKanban />;

  return (
    <div className="flex flex-col h-full overflow-hidden px-4 pt-2">
      {/* Banner campainha — some após ativação */}
      {settings.soundEnabled && !audioPreloaded && (
        <button
          onClick={() => {
            const a = new Audio(settings.notificationSound || '/sounds/default-notification.mp3');
            a.volume = 0.01;
            a.play().then(() => { a.pause(); setAudioPreloaded(true); }).catch(() => setAudioPreloaded(true));
          }}
          className="flex-shrink-0 w-full flex items-center justify-center gap-2 bg-amber-50 border border-amber-300 text-amber-800 rounded-md py-2 px-4 text-sm font-medium hover:bg-amber-100 transition-colors animate-pulse mb-2"
        >
          🔔 Clique aqui para ativar a campainha de novos pedidos
        </button>
      )}

      {/* Header sticky — controles do kanban */}
      <div className="flex-shrink-0">
        <KanbanHeader
          settings={settings}
          onSettingsChange={handleSettingsChange}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
          selectedOrdersCount={selectedOrders.size}
          onBulkStatusChange={handleBulkStatusChange}
          showSaved={savedIndicator}
          showMap={showDeliveryMap}
          onToggleMap={() => setShowDeliveryMap(v => !v)}
          delivererGpsCount={delivererCounts.gps}
          delivererTotalCount={delivererCounts.total}
          periodFilter={periodFilter}
          onPeriodChange={setPeriodFilter}
          onOpenReport={() => setShowReport(true)}
          totalFiltered={filteredOrders.length}
        />
      </div>

      {/* Mapa entregadores virou modal — visualização rápida sem tirar foco do kanban */}
      <DeliveryMapDialog
        open={showDeliveryMap}
        onOpenChange={setShowDeliveryMap}
        onAssign={(d) => {
          setShowDeliveryMap(false);              // fecha mapa
          setDelivererForAssign(d);               // abre seletor de pedido
        }}
      />

      {/* Atribuir pedido pronto a entregador escolhido no mapa */}
      <AssignOrderToDelivererDialog
        deliverer={delivererForAssign}
        open={!!delivererForAssign}
        onClose={() => setDelivererForAssign(null)}
        onConfirm={handleConfirmDeliverer}
      />

      {/* Relatórios — modal com histórico + CSV/PDF + envio WhatsApp */}
      <OrdersReportDialog
        open={showReport}
        onOpenChange={setShowReport}
        orders={filteredOrders}
        periodLabel={
          periodFilter === "today" ? "Hoje" :
          periodFilter === "yesterday" ? "Ontem" :
          periodFilter === "week" ? "Últimos 7 dias" :
          periodFilter === "month" ? "Este mês" : "Todos"
        }
        companyId={companyId ?? null}
        companyName={(companyData as any)?.fantasy_name || (companyData as any)?.name}
        onExportCSV={handleExportCSV}
      />

      {/* Colunas: scroll horizontal, cada coluna scroll vertical independente */}
      <div className="flex-1 min-h-0 flex gap-4 overflow-x-auto pt-3 pb-2">
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
                onDragOver={(e, colId) => handleDragOver(e, colId)}
                onCardClick={(order) => {
                  stopNotificationSound();
                  setSelectedOrder(order);
                }}
                onCardSelect={toggleOrderSelection}
                onSelectAll={handleSelectAllInColumn}
                selectedOrders={selectedOrders}
                onPrintOrder={handlePrintOrder}
                onUpdateStatus={updateOrderStatus}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                alertTime={settings.alertTime}
                isPrinting={isPrinting}
                isDraggedOver={!!isDraggedOver}
                draggedOrder={draggedOrder}
                onOpenWhatsApp={openWhatsApp}
                pausedPhones={pausedPhones}
                globalAgentPaused={globalAgentPaused}
                onToggleAgentPause={handleToggleAgentPause}
                onAssignDeliverer={handleAssignDeliverer}
                onChangeDeliverer={handleChangeDeliverer}
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
        onChangeType={handleChangeType}
        isPrinting={isPrinting}
      />

      <CancelOrderDialog
        open={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        onConfirm={handleCancelOrder}
        orderNumber={selectedOrder?.order_number || ""}
      />

      <AssignDelivererDialog
        order={orderPendingDeliverer}
        open={!!orderPendingDeliverer}
        onClose={() => setOrderPendingDeliverer(null)}
        onConfirm={handleConfirmDeliverer}
      />
    </div>
  );
}