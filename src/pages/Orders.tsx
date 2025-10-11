import { OrdersKanban } from "@/components/orders/OrdersKanban";
import { Button } from "@/components/ui/button";
import { Store, Menu } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";

export default function Orders() {
  const { toast } = useToast();
  const [storeOpen, setStoreOpen] = useState(true);
  const [companyName, setCompanyName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [notificationSoundUrl, setNotificationSoundUrl] = useState('/sounds/bell.mp3');
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  
  // Realtime para novos pedidos
  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          console.log('🔔 Novo pedido recebido:', payload);
          
          // Parar áudio anterior se estiver tocando
          if (currentAudio) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
          }
          
          // Tocar som de notificação por 30 segundos
          const audio = new Audio(notificationSoundUrl);
          audio.loop = true;
          audio.play().catch(err => console.error('Erro ao tocar som:', err));
          setCurrentAudio(audio);
          
          // Parar após 30 segundos
          setTimeout(() => {
            audio.pause();
            audio.currentTime = 0;
            setCurrentAudio(null);
          }, 30000);
          
          // Mostrar toast
          toast({
            title: "🎉 Novo Pedido!",
            description: `Pedido #${payload.new.order_number} recebido`,
          });
        }
      )
      .subscribe();

    return () => {
      // Parar áudio ao desmontar
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
      supabase.removeChannel(channel);
    };
  }, [companyId, toast, notificationSoundUrl, currentAudio]);

  // Load company info
  const { data: companyData } = useQuery({
    queryKey: ["company-info"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return null;
      }

      // Get profile info
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, company_id')
        .eq('id', user.id)
        .single();

      // Get company info
      const { data: company } = await supabase
        .from('companies')
        .select('*')
        .eq('id', profile?.company_id)
        .single();

      if (company) {
        setCompanyName(company.fantasy_name || company.name);
        setSubdomain(company.subdomain);
        setCompanyId(company.id);
      }

      return company;
    },
  });

  // Load store settings
  const { data: storeSettings } = useQuery({
    queryKey: ["store-settings", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      
      const { data } = await supabase
        .from('store_settings')
        .select('*')
        .eq('company_id', companyId)
        .single();
      
      if (data) {
        setStoreOpen(data.store_open || false);
        setNotificationSoundUrl(data.notification_sound || '/sounds/bell.mp3');
      }
      
      return data;
    },
    enabled: !!companyId,
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
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status da loja.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="bg-card/50 backdrop-blur border-b border-border sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <SidebarTrigger>
                <Menu className="h-5 w-5" />
              </SidebarTrigger>
              <div>
                <h1 className="text-xl font-bold">Gestão de Pedidos</h1>
                <p className="text-xs text-muted-foreground">
                  {subdomain ? `${subdomain}.anafood.vip` : "Configure seu domínio"}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button
                variant={storeOpen ? "default" : "destructive"}
                size="sm"
                onClick={handleToggleStore}
              >
                <Store className="w-4 h-4 mr-2" />
                {storeOpen ? "Loja Aberta" : "Loja Fechada"}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Orders Kanban */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full p-6">
          <OrdersKanban />
        </div>
      </div>
    </div>
  );
}