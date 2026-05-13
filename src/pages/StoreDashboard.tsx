import { useState, useRef, useEffect } from "react";
import { formatCurrency } from "@/lib/currency-formatter";
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
import { supabaseQueryNullable } from "@/lib/supabase-safe";
import { useQuery } from "@tanstack/react-query";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { useDateRangeOrders } from "@/hooks/useDateRangeOrders";
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
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw new Error(authError.message);

      if (!user) {
        navigate("/login");
        return null;
      }

      const profile = await supabaseQueryNullable(
        supabase.from('profiles').select('role, company_id').eq('id', user.id).single()
      );

      if (profile?.role === 'super_admin' || profile?.role === 'master_admin') {
        navigate('/admin');
        return null;
      }

      const company = await supabaseQueryNullable(
        supabase.from('companies').select('*').eq('id', profile?.company_id).single()
      );

      return company;
    },
  });

  // Sincroniza estado local a partir dos dados da empresa
  useEffect(() => {
    if (!companyData) return;
    setSubdomain(companyData.subdomain);
    setCompanyId(companyData.id);
  }, [companyData]);

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
      
      return data;
    },
    enabled: !!companyId,
  });

  // Sincroniza storeOpen a partir das configurações da loja
  useEffect(() => {
    if (storeSettings) setStoreOpen(storeSettings.store_open || false);
  }, [storeSettings]);

  const { data: filteredOrders } = useDateRangeOrders({ companyId, showTodayOnly, startDate, endDate });

  const { metrics, revenueData, paymentMethodsData, topProducts, topCustomers } = useDashboardMetrics({
    filteredOrders,
    showTodayOnly,
    startDate,
    endDate,
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
              value={formatCurrency(metrics.totalRevenue)}
              icon={DollarSign}
              subtitle={showTodayOnly ? "hoje" : "no período"}
            />
            <MetricsCard
              title="Ticket Médio"
              value={formatCurrency(metrics.averageTicket)}
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