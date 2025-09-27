import { OrdersKanban } from "@/components/orders/OrdersKanban";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Button } from "@/components/ui/button";
import { Store, Menu } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";

export default function Orders() {
  const { toast } = useToast();
  const [storeOpen, setStoreOpen] = useState(true);
  const [companyName, setCompanyName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [companyId, setCompanyId] = useState<string | null>(null);

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
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-gradient-dark">
        <AppSidebar />
        
        <main className="flex-1 flex flex-col">
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
          <div className="flex-1 p-6">
            <OrdersKanban />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}