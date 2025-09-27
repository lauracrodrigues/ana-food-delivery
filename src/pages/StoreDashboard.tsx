import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { 
  ShoppingBag, 
  BarChart3, 
  TrendingUp,
  DollarSign,
  Clock,
  Store,
  Menu
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { MetricsCard } from "@/components/dashboard/MetricsCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { TopProductsList } from "@/components/dashboard/TopProductsList";
import { PaymentMethodsChart } from "@/components/dashboard/PaymentMethodsChart";
import { AlertsWidget } from "@/components/dashboard/AlertsWidget";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";

export default function StoreDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [companyName, setCompanyName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [storeOpen, setStoreOpen] = useState(true);
  const [deliveryActive, setDeliveryActive] = useState(true);
  

  // Load company info
  const { data: companyData } = useQuery({
    queryKey: ["company-info"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/login");
        return null;
      }

      // Verificar o role do usuário
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, company_id')
        .eq('id', user.id)
        .single();

      // Se for master_admin, redireciona para o painel admin
      if (profile?.role === 'master_admin') {
        navigate('/admin');
        return null;
      }

      // Buscar dados da empresa
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

  // Calculate metrics for dashboard
  const { data: todayOrders } = useQuery({
    queryKey: ["today-orders", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('company_id', companyId)
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false });
      
      return data || [];
    },
    enabled: !!companyId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const metrics = useMemo(() => {
    if (!todayOrders) return {
      todayOrders: 0,
      todayRevenue: 0,
      averageTicket: 0,
      pendingOrders: 0,
    };

    const totalOrders = todayOrders.length;
    const totalRevenue = todayOrders.reduce((sum, order) => sum + Number(order.total), 0);
    const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const pendingOrders = todayOrders.filter(order => 
      ['pending', 'preparing'].includes(order.status)
    ).length;

    return {
      todayOrders: totalOrders,
      todayRevenue: totalRevenue,
      averageTicket,
      pendingOrders,
    };
  }, [todayOrders]);

  // Revenue data for chart
  const revenueData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return {
        date: date.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' }),
        revenue: Math.random() * 2000 + 500, // Mock data
      };
    });
    return last7Days;
  }, []);

  // Payment methods data
  const paymentMethodsData = [
    { name: 'Dinheiro', value: 45, color: 'hsl(var(--success))' },
    { name: 'Cartão', value: 30, color: 'hsl(var(--primary))' },
    { name: 'PIX', value: 25, color: 'hsl(var(--warning))' },
  ];

  // Top products data
  const topProducts = [
    { name: 'Pizza Margherita', sales: 45, revenue: 1350 },
    { name: 'Hambúrguer Artesanal', sales: 38, revenue: 950 },
    { name: 'Açaí 500ml', sales: 32, revenue: 640 },
    { name: 'Refrigerante 2L', sales: 28, revenue: 224 },
    { name: 'Batata Frita', sales: 25, revenue: 375 },
  ];

  // Recent alerts
  const recentAlerts = [
    { id: 1, type: 'order', message: 'Novo pedido recebido #1234', time: '2 min atrás' },
    { id: 2, type: 'stock', message: 'Produto "Coca-Cola 2L" acabando', time: '15 min atrás' },
    { id: 3, type: 'system', message: 'Impressora desconectada', time: '30 min atrás' },
  ];

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

  const handleToggleDelivery = () => {
    setDeliveryActive(!deliveryActive);
    toast({
      title: deliveryActive ? "Delivery Pausado" : "Delivery Ativado",
      description: deliveryActive 
        ? "O delivery foi pausado temporariamente."
        : "O delivery está ativo novamente.",
    });
  };

  const handleBackup = () => {
    toast({
      title: "Backup Iniciado",
      description: "O backup dos dados está sendo realizado.",
    });
  };

  const handleBroadcast = () => {
    toast({
      title: "Mensagem em Massa",
      description: "Abrindo configurações de mensagem...",
    });
  };


  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background">
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
                    <h1 className="text-xl font-bold">{companyName || "Carregando..."}</h1>
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

          {/* Main Content Area */}
          <div className="flex-1 p-6">
            <div className="space-y-6">
              {/* Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricsCard
                  title="Pedidos Hoje"
                  value={metrics.todayOrders}
                  icon={ShoppingBag}
                  trend={{ value: 12, isPositive: true }}
                  subtitle="vs. ontem"
                />
                <MetricsCard
                  title="Faturamento"
                  value={`R$ ${metrics.todayRevenue.toFixed(2)}`}
                  icon={DollarSign}
                  trend={{ value: 8, isPositive: true }}
                  subtitle="vs. ontem"
                />
                <MetricsCard
                  title="Ticket Médio"
                  value={`R$ ${metrics.averageTicket.toFixed(2)}`}
                  icon={TrendingUp}
                  trend={{ value: 5, isPositive: true }}
                  subtitle="vs. média"
                />
                <MetricsCard
                  title="Pedidos Pendentes"
                  value={metrics.pendingOrders}
                  icon={Clock}
                  subtitle="aguardando"
                />
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <RevenueChart data={revenueData.map(item => ({ time: item.date, revenue: item.revenue }))} />
                </div>
                <div>
                  <PaymentMethodsChart data={paymentMethodsData} />
                </div>
              </div>

              {/* Bottom Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <TopProductsList products={topProducts.map(p => ({ name: p.name, quantity: p.sales, revenue: p.revenue }))} />
                <AlertsWidget alerts={recentAlerts.map(a => ({ 
                  id: a.id.toString(), 
                  type: a.type === 'order' ? 'info' as const : a.type === 'stock' ? 'warning' as const : 'error' as const, 
                  title: a.type === 'order' ? 'Novo Pedido' : a.type === 'stock' ? 'Estoque Baixo' : 'Sistema',
                  description: a.message, 
                  time: a.time 
                }))} />
                <QuickActions
                  onToggleStore={handleToggleStore}
                  onToggleDelivery={handleToggleDelivery}
                  onBackup={handleBackup}
                  onSendBroadcast={handleBroadcast}
                  storeOpen={storeOpen}
                  deliveryActive={deliveryActive}
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}