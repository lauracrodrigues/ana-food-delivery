import { useState, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  ShoppingBag,
  TrendingUp,
  DollarSign,
  Clock,
  Store,
  CalendarIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { MetricsCard } from "@/components/dashboard/MetricsCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { TopProductsList } from "@/components/dashboard/TopProductsList";
import { PaymentMethodsChart } from "@/components/dashboard/PaymentMethodsChart";
import { TopCustomersList } from "@/components/dashboard/TopCustomersList";
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
import { PageLayout } from "@/components/layout/PageLayout";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function StoreDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [companyName, setCompanyName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [storeOpen, setStoreOpen] = useState(true);
  const [deliveryActive, setDeliveryActive] = useState(true);
  const [showTodayOnly, setShowTodayOnly] = useState(true);
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const endDateRef = useRef<HTMLButtonElement>(null);
  

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

      // Se for super_admin/master_admin, redireciona para o painel admin
      if (profile?.role === 'super_admin' || profile?.role === 'master_admin') {
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
  const { data: filteredOrders } = useQuery({
    queryKey: ["filtered-orders", companyId, showTodayOnly, startDate, endDate],
    queryFn: async () => {
      if (!companyId) return [];
      
      let query = supabase
        .from('orders')
        .select('*')
        .eq('company_id', companyId);
      
      if (showTodayOnly) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        query = query
          .gte('created_at', today.toISOString())
          .lt('created_at', tomorrow.toISOString());
      } else if (startDate && endDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        
        query = query
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString());
      }
      
      const { data } = await query.order('created_at', { ascending: false });
      
      return data || [];
    },
    enabled: !!companyId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const metrics = useMemo(() => {
    if (!filteredOrders) return {
      totalOrders: 0,
      totalRevenue: 0,
      averageTicket: 0,
      pendingOrders: 0,
    };

    const totalOrders = filteredOrders.length;
    const totalRevenue = filteredOrders.reduce((sum, order) => sum + Number(order.total), 0);
    const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const pendingOrders = filteredOrders.filter(order => 
      ['pending', 'preparing'].includes(order.status)
    ).length;

    return {
      totalOrders,
      totalRevenue,
      averageTicket,
      pendingOrders,
    };
  }, [filteredOrders]);

  // Receita por dia — dados reais dos pedidos filtrados
  const revenueData = useMemo(() => {
    if (!filteredOrders || filteredOrders.length === 0) {
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return {
          date: date.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' }),
          revenue: 0,
        };
      });
      return last7Days;
    }

    const revenueByDay: Record<string, number> = {};
    for (const order of filteredOrders) {
      if (order.status === 'cancelled') continue;
      const d = new Date(order.created_at);
      const key = d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' });
      revenueByDay[key] = (revenueByDay[key] || 0) + Number(order.total || 0);
    }

    if (showTodayOnly) {
      const today = new Date();
      const key = today.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' });
      return [{ date: key, revenue: revenueByDay[key] || 0 }];
    }

    const days: { date: string; revenue: number }[] = [];
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date();
    const diff = Math.min(Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1, 90);
    for (let i = 0; i < diff; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const key = d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' });
      days.push({ date: key, revenue: revenueByDay[key] || 0 });
    }
    return days;
  }, [filteredOrders, showTodayOnly, startDate, endDate]);

  // Formas de pagamento — dados reais
  const paymentMethodsData = useMemo(() => {
    if (!filteredOrders || filteredOrders.length === 0) return [];
    const colors: Record<string, string> = {
      dinheiro: 'hsl(var(--success))',
      pix: 'hsl(var(--warning))',
      credito: 'hsl(var(--primary))',
      debito: 'hsl(142, 76%, 36%)',
    };
    const counts: Record<string, number> = {};
    for (const order of filteredOrders) {
      const method = (order.payment_method || 'outro').toLowerCase();
      counts[method] = (counts[method] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        color: colors[name] || 'hsl(var(--muted-foreground))',
      }));
  }, [filteredOrders]);

  // Produtos mais vendidos — dados reais
  const topProducts = useMemo(() => {
    if (!filteredOrders || filteredOrders.length === 0) return [];
    const productMap: Record<string, { quantity: number; revenue: number }> = {};
    for (const order of filteredOrders) {
      if (order.status === 'cancelled') continue;
      const items = order.items as Array<{ name?: string; quantity?: number; price?: number }> | null;
      if (!items) continue;
      for (const item of items) {
        const name = item.name || 'Sem nome';
        const qty = Number(item.quantity || 1);
        const price = Number(item.price || 0);
        if (!productMap[name]) productMap[name] = { quantity: 0, revenue: 0 };
        productMap[name].quantity += qty;
        productMap[name].revenue += price * qty;
      }
    }
    return Object.entries(productMap)
      .sort((a, b) => b[1].quantity - a[1].quantity)
      .slice(0, 5)
      .map(([name, data]) => ({ name, quantity: data.quantity, revenue: data.revenue }));
  }, [filteredOrders]);

  // Clientes que mais compram — dados reais
  const topCustomers = useMemo(() => {
    if (!filteredOrders || filteredOrders.length === 0) return [];
    const customerMap: Record<string, { orders: number; totalSpent: number }> = {};
    for (const order of filteredOrders) {
      const name = order.customer_name || order.customer_phone || 'Anônimo';
      if (!customerMap[name]) customerMap[name] = { orders: 0, totalSpent: 0 };
      customerMap[name].orders += 1;
      customerMap[name].totalSpent += Number(order.total || 0);
    }
    return Object.entries(customerMap)
      .sort((a, b) => b[1].orders - a[1].orders)
      .slice(0, 5)
      .map(([name, data]) => ({ name, orders: data.orders, totalSpent: data.totalSpent }));
  }, [filteredOrders]);

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


  const headerActions = (
    <>
      <div className="flex items-center gap-2">
        <Checkbox
          id="today-only"
          checked={showTodayOnly}
          onCheckedChange={(checked) => setShowTodayOnly(checked as boolean)}
        />
        <Label htmlFor="today-only" className="text-sm font-medium cursor-pointer">
          Apenas Hoje
        </Label>
      </div>
      {!showTodayOnly && (
        <div className="flex items-center gap-2">
          <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="w-[120px] justify-start">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "dd/MM/yyyy") : "Início"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={(date) => {
                  setStartDate(date);
                  setDatePopoverOpen(false);
                  setTimeout(() => endDateRef.current?.click(), 100);
                }}
                locale={ptBR}
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          <span className="text-sm text-muted-foreground">até</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button ref={endDateRef} variant="outline" size="sm" className="w-[120px] justify-start">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "dd/MM/yyyy") : "Fim"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                locale={ptBR}
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      )}
      <Button
        variant={storeOpen ? "default" : "destructive"}
        size="sm"
        onClick={handleToggleStore}
      >
        <Store className="w-4 h-4 mr-2" />
        {storeOpen ? "Loja Aberta" : "Loja Fechada"}
      </Button>
    </>
  );

  // Company not linked to profile — show helpful message
  if (companyData === null && !companyId) {
    return (
      <PageLayout title="Dashboard" fullHeight>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
          <Store className="w-12 h-12 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Loja não configurada</h2>
          <p className="text-muted-foreground max-w-sm">
            Sua conta não está vinculada a nenhuma loja. Entre em contato com o administrador do sistema.
          </p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Dashboard"
      subtitle={subdomain ? `${subdomain}.anafood.vip` : "Configure seu domínio"}
      actions={headerActions}
      fullHeight
    >
      <div className="space-y-6">
          {/* Onboarding Checklist */}
          {companyId && <OnboardingChecklist companyId={companyId} />}

          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricsCard
              title={showTodayOnly ? "Pedidos Hoje" : "Total de Pedidos"}
              value={metrics.totalOrders}
              icon={ShoppingBag}
              subtitle={showTodayOnly ? "hoje" : "no período"}
            />
            <MetricsCard
              title="Faturamento"
              value={`R$ ${metrics.totalRevenue.toFixed(2)}`}
              icon={DollarSign}
              subtitle={showTodayOnly ? "hoje" : "no período"}
            />
            <MetricsCard
              title="Ticket Médio"
              value={`R$ ${metrics.averageTicket.toFixed(2)}`}
              icon={TrendingUp}
              subtitle={showTodayOnly ? "hoje" : "no período"}
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TopProductsList products={topProducts.map(p => ({ name: p.name, quantity: p.quantity, revenue: p.revenue }))} />
            <TopCustomersList customers={topCustomers} />
          </div>
        </div>
    </PageLayout>
  );
}