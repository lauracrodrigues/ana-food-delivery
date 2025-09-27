import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ShoppingBag, 
  Settings, 
  LogOut, 
  BarChart3, 
  Package, 
  TrendingUp,
  DollarSign,
  Clock,
  Users,
  ChefHat,
  Megaphone,
  Store
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { OrdersKanban } from "@/components/orders/OrdersKanban";
import { MetricsCard } from "@/components/dashboard/MetricsCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { TopProductsList } from "@/components/dashboard/TopProductsList";
import { PaymentMethodsChart } from "@/components/dashboard/PaymentMethodsChart";
import { AlertsWidget } from "@/components/dashboard/AlertsWidget";
import { QuickActions } from "@/components/dashboard/QuickActions";

export default function StoreDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [companyName, setCompanyName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [storeOpen, setStoreOpen] = useState(true);
  const [deliveryActive, setDeliveryActive] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  // Load company info
  const { data: companyData } = useQuery({
    queryKey: ["company-info"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/login");
        return null;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id, role")
        .eq("id", user.id)
        .single();

      if (!profile?.company_id) {
        toast({
          title: "Erro",
          description: "Empresa não encontrada.",
          variant: "destructive",
        });
        navigate("/login");
        return null;
      }

      setCompanyId(profile.company_id);

      const { data: company } = await supabase
        .from("companies")
        .select("name, fantasy_name, subdomain")
        .eq("id", profile.company_id)
        .single();

      if (company) {
        setCompanyName(company.fantasy_name || company.name);
        setSubdomain(company.subdomain);
      }

      // Load store settings
      const { data: settings } = await supabase
        .from("store_settings")
        .select("store_open")
        .eq("company_id", profile.company_id)
        .single();

      if (settings) {
        setStoreOpen(settings.store_open);
      }

      return company;
    },
  });

  // Load metrics data
  const { data: metricsData } = useQuery({
    queryKey: ["dashboard-metrics", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      if (!companyId) return null;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString();

      // Get today's orders
      const { data: todayOrders } = await supabase
        .from("orders")
        .select("*")
        .eq("company_id", companyId)
        .gte("created_at", todayStr);

      // Get this week's orders
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { data: weekOrders } = await supabase
        .from("orders")
        .select("*")
        .eq("company_id", companyId)
        .gte("created_at", weekAgo.toISOString());

      // Get this month's orders
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 30);
      const { data: monthOrders } = await supabase
        .from("orders")
        .select("*")
        .eq("company_id", companyId)
        .gte("created_at", monthAgo.toISOString());

      return {
        today: todayOrders || [],
        week: weekOrders || [],
        month: monthOrders || [],
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Calculate metrics
  const metrics = useMemo(() => {
    if (!metricsData) {
      return {
        todayOrders: 0,
        todayRevenue: 0,
        weekOrders: 0,
        monthRevenue: 0,
        averageTicket: 0,
        preparationTime: 0,
      };
    }

    const todayOrders = metricsData.today.length;
    const todayRevenue = metricsData.today.reduce((sum, order) => sum + Number(order.total), 0);
    const weekOrders = metricsData.week.length;
    const monthRevenue = metricsData.month.reduce((sum, order) => sum + Number(order.total), 0);
    const averageTicket = todayOrders > 0 ? todayRevenue / todayOrders : 0;
    
    // Calculate average preparation time (mock for now)
    const preparationTime = 45;

    return {
      todayOrders,
      todayRevenue,
      weekOrders,
      monthRevenue,
      averageTicket,
      preparationTime,
    };
  }, [metricsData]);

  // Generate hourly revenue data for chart
  const revenueChartData = useMemo(() => {
    if (!metricsData?.today) return [];

    const hourlyData: Record<string, number> = {};
    
    // Initialize all hours
    for (let i = 0; i < 24; i++) {
      const hour = i.toString().padStart(2, '0');
      hourlyData[`${hour}:00`] = 0;
    }

    // Aggregate revenue by hour
    metricsData.today.forEach(order => {
      const hour = new Date(order.created_at).getHours();
      const hourKey = `${hour.toString().padStart(2, '0')}:00`;
      hourlyData[hourKey] += Number(order.total);
    });

    // Convert to array and filter to business hours (10am to 10pm)
    return Object.entries(hourlyData)
      .filter(([time]) => {
        const hour = parseInt(time.split(':')[0]);
        return hour >= 10 && hour <= 22;
      })
      .map(([time, revenue]) => ({ time, revenue }));
  }, [metricsData]);

  // Generate top products data
  const topProducts = useMemo(() => {
    if (!metricsData?.today) return [];

    const productMap: Record<string, { quantity: number; revenue: number }> = {};

    metricsData.today.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          const name = item.name || 'Produto';
          if (!productMap[name]) {
            productMap[name] = { quantity: 0, revenue: 0 };
          }
          productMap[name].quantity += item.quantity || 1;
          productMap[name].revenue += (item.quantity || 1) * (item.price || 0);
        });
      }
    });

    return Object.entries(productMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [metricsData]);

  // Generate payment methods data
  const paymentMethodsData = useMemo(() => {
    if (!metricsData?.today) return [];

    const methodsMap: Record<string, number> = {};

    metricsData.today.forEach(order => {
      const method = order.payment_method || 'dinheiro';
      methodsMap[method] = (methodsMap[method] || 0) + Number(order.total);
    });

    const colors: Record<string, string> = {
      'dinheiro': 'hsl(var(--primary))',
      'cartao_credito': 'hsl(var(--secondary))',
      'cartao_debito': 'hsl(var(--accent))',
      'pix': 'hsl(var(--muted-foreground))',
    };

    const labels: Record<string, string> = {
      'dinheiro': 'Dinheiro',
      'cartao_credito': 'Crédito',
      'cartao_debito': 'Débito',
      'pix': 'PIX',
    };

    return Object.entries(methodsMap).map(([method, value]) => ({
      name: labels[method] || method,
      value,
      color: colors[method] || 'hsl(var(--primary))',
    }));
  }, [metricsData]);

  // Generate alerts
  const alerts = useMemo(() => {
    const alertsList = [];

    // Check for delayed orders
    if (metricsData?.today) {
      const delayedOrders = metricsData.today.filter(order => {
        const createdAt = new Date(order.created_at);
        const now = new Date();
        const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);
        return order.status === 'pending' && diffMinutes > 60;
      });

      if (delayedOrders.length > 0) {
        alertsList.push({
          id: 'delayed-orders',
          type: 'warning' as const,
          title: 'Pedidos Atrasados',
          description: `${delayedOrders.length} pedidos aguardando há mais de 1 hora`,
          time: 'agora',
        });
      }
    }

    return alertsList;
  }, [metricsData]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logout realizado",
      description: "Você foi desconectado com sucesso.",
    });
    navigate("/login");
  };

  const handleToggleStore = async () => {
    if (!companyId) return;

    const newStatus = !storeOpen;
    setStoreOpen(newStatus);

    const { error } = await supabase
      .from("store_settings")
      .update({ store_open: newStatus })
      .eq("company_id", companyId);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status da loja.",
        variant: "destructive",
      });
      setStoreOpen(!newStatus);
    } else {
      toast({
        title: newStatus ? "Loja Aberta" : "Loja Fechada",
        description: newStatus 
          ? "Sua loja está aberta e recebendo pedidos." 
          : "Sua loja está fechada. Novos pedidos não serão aceitos.",
      });
    }
  };

  const handleToggleDelivery = () => {
    setDeliveryActive(!deliveryActive);
    toast({
      title: deliveryActive ? "Delivery Pausado" : "Delivery Ativo",
      description: deliveryActive 
        ? "Delivery pausado temporariamente." 
        : "Delivery ativado e recebendo pedidos.",
    });
  };

  const handleSendBroadcast = () => {
    toast({
      title: "Em breve",
      description: "Funcionalidade de mensagens em massa será implementada.",
    });
  };

  const handleBackup = () => {
    toast({
      title: "Em breve",
      description: "Sistema de backup será implementado.",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-dark">
      {/* Header */}
      <header className="bg-card/50 backdrop-blur border-b border-border sticky top-0 z-20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">{companyName || "Carregando..."}</h1>
                <p className="text-xs text-muted-foreground">
                  {subdomain ? `${subdomain}.anafood.vip` : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/dashboard/settings")}
                className="text-muted-foreground hover:text-foreground"
              >
                <Settings className="w-4 h-4 mr-2" />
                Configurações
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Pedidos
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Metrics Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <MetricsCard
                title="Pedidos Hoje"
                value={metrics.todayOrders}
                subtitle="Total de pedidos"
                icon={Package}
                trend={{ value: 12, isPositive: true }}
              />
              <MetricsCard
                title="Faturamento"
                value={`R$ ${metrics.todayRevenue.toFixed(2)}`}
                subtitle="Hoje"
                icon={DollarSign}
                trend={{ value: 8, isPositive: true }}
              />
              <MetricsCard
                title="Ticket Médio"
                value={`R$ ${metrics.averageTicket.toFixed(2)}`}
                subtitle="Por pedido"
                icon={TrendingUp}
              />
              <MetricsCard
                title="Tempo Médio"
                value={`${metrics.preparationTime} min`}
                subtitle="Preparo"
                icon={Clock}
              />
              <MetricsCard
                title="Pedidos Semana"
                value={metrics.weekOrders}
                subtitle="Últimos 7 dias"
                icon={ChefHat}
              />
              <MetricsCard
                title="Faturamento Mês"
                value={`R$ ${metrics.monthRevenue.toFixed(2)}`}
                subtitle="Últimos 30 dias"
                icon={Store}
                trend={{ value: 15, isPositive: true }}
              />
            </div>

            {/* Charts and Widgets */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Revenue Chart - Takes 2 columns */}
              <div className="lg:col-span-2">
                <RevenueChart data={revenueChartData} />
              </div>

              {/* Quick Actions - Takes 1 column */}
              <QuickActions
                storeOpen={storeOpen}
                deliveryActive={deliveryActive}
                onToggleStore={handleToggleStore}
                onToggleDelivery={handleToggleDelivery}
                onSendBroadcast={handleSendBroadcast}
                onBackup={handleBackup}
              />
            </div>

            {/* Bottom Row */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <TopProductsList products={topProducts} />
              <PaymentMethodsChart data={paymentMethodsData} />
              <AlertsWidget alerts={alerts} />
            </div>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-6">
            <h2 className="text-2xl font-bold">Gerenciamento de Pedidos</h2>
            <OrdersKanban />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}