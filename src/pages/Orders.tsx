// v2.5.0 — remove estado companyName nunca lido
import { OrdersKanban } from "@/components/orders/OrdersKanban";
import { WaiterCallsAlert } from "@/components/orders/WaiterCallsAlert";
import { ManualOrderSidebar } from "@/components/orders/ManualOrderSidebar";
import { Button } from "@/components/ui/button";
import { Store, Bot, Flame, PlusCircle } from "lucide-react";
import { HeatmapDialog } from "@/components/heatmap/HeatmapDialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useStoreSettings } from "@/hooks/useStoreSettings";

export default function Orders() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showHeatmap, setShowHeatmap] = useState(false); // controla modal Mapa de Calor
  const [storeOpen, setStoreOpen] = useState(true);
  const [robotEnabled, setRobotEnabled] = useState(true);
  const [subdomain, setSubdomain] = useState("");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [showManualOrder, setShowManualOrder] = useState(false);

  const { data: companyData } = useQuery({
    queryKey: ["company-info"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, company_id')
        .eq('id', user.id)
        .single();

      const { data: company } = await supabase
        .from('companies')
        .select('*')
        .eq('id', profile?.company_id)
        .single();

      if (company) {
        setSubdomain(company.subdomain);
        setCompanyId(company.id);
      }
      return company;
    },
  });

  const { settings: storeSettings } = useStoreSettings();
  useEffect(() => {
    if (storeSettings?.store_open !== undefined) setStoreOpen(storeSettings.store_open);
  }, [storeSettings]);

  // Query settings WhatsApp (só robô — msgs status movido para /whatsapp settings)
  const { data: whatsappSettings } = useQuery({
    queryKey: ["whatsapp-settings", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const res = await fetch(`/v1/settings/${companyId}/whatsapp`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!companyId,
    onSuccess: (data: any) => {
      if (data) setRobotEnabled(data.robot_enabled !== false);
    },
  });

  // Mutation toggle robô
  const toggleWhatsappMutation = useMutation({
    mutationFn: async (updates: { robot_enabled?: boolean }) => {
      if (!companyId) throw new Error('Company ID not found');
      const res = await fetch(`/v1/settings/${companyId}/whatsapp`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to update settings');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-settings", companyId] });
      toast({ title: "Configuração atualizada" });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível atualizar.", variant: "destructive" });
    },
  });

  const handleToggleStore = async () => {
    if (!companyId) return;
    try {
      const newStatus = !storeOpen;
      const { error } = await supabase
        .from('store_settings')
        .update({ store_open: newStatus })
        .eq('company_id', companyId);
      if (error) throw error;
      setStoreOpen(newStatus);
      toast({
        title: newStatus ? "Loja Aberta" : "Loja Fechada",
        description: newStatus
          ? "Sua loja está agora aberta e recebendo pedidos."
          : "Sua loja está fechada e não receberá novos pedidos.",
      });
    } catch {
      toast({ title: "Erro", description: "Não foi possível alterar o status da loja.", variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header compacto fixo no topo — padding right pra liberar espaço do sino global */}
      <div className="flex items-center justify-between px-4 py-2 pr-16 border-b bg-background/95 backdrop-blur-sm flex-shrink-0 overflow-x-auto">
        <div className="shrink-0 mr-4">
          <h1 className="text-base font-semibold leading-tight">Gestão de Pedidos</h1>
          {subdomain && (
            <p className="text-xs text-muted-foreground">{subdomain}.anafood.vip</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant={storeOpen ? "default" : "destructive"}
            size="sm"
            onClick={handleToggleStore}
          >
            <Store className="w-4 h-4 mr-2" />
            {storeOpen ? "Loja Aberta" : "Loja Fechada"}
          </Button>

          <Button
            variant={robotEnabled ? "default" : "outline"}
            size="sm"
            onClick={() => {
              const newValue = !robotEnabled;
              setRobotEnabled(newValue);
              toggleWhatsappMutation.mutate({robot_enabled: newValue});
            }}
          >
            <Bot className="w-4 h-4 mr-2" />
            Robô {robotEnabled ? "Ativo" : "Inativo"}
          </Button>

          {/* Heatmap: abre modal pra visualização rápida (sem navegar) */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHeatmap(true)}
          >
            <Flame className="w-4 h-4 mr-2" />
            Mapa de Calor
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowManualOrder(true)}
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            Pedido Manual
          </Button>
        </div>
      </div>

      {/* Chamadas garçom pendentes — alerta no topo, realtime */}
      {companyId && (
        <div className="px-4 pt-2">
          <WaiterCallsAlert companyId={companyId} />
        </div>
      )}

      {/* Kanban ocupa tudo que sobra */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <OrdersKanban />
      </div>

      {/* Sidebar pedido manual — sempre montado, espera companyId */}
      <ManualOrderSidebar
        open={showManualOrder}
        onClose={() => setShowManualOrder(false)}
        companyId={companyId ?? ""}
      />

      {/* Modal mapa de calor — acesso rápido sem sair da página de pedidos */}
      <HeatmapDialog open={showHeatmap} onOpenChange={setShowHeatmap} />
    </div>
  );
}
