import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Settings as SettingsIcon, 
  Store, 
  Bell, 
  Printer, 
  Truck, 
  Clock, 
  DollarSign,
  Save,
  Wifi,
  Volume2,
  FileText,
  Shield,
  Key,
  Globe,
  Building2,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { qzPrinter } from "@/lib/qz-tray";

interface StoreSettings {
  id?: string;
  company_id?: string;
  store_open: boolean;
  auto_accept: boolean;
  sound_enabled: boolean;
  delivery_time: number;
  pickup_time: number;
  delivery_fee: number;
  alert_time: number;
  printer_settings?: any;
  visible_columns?: any;
}

interface CompanyInfo {
  id: string;
  name: string;
  fantasy_name?: string;
  cnpj?: string;
  email?: string;
  phone?: string;
  address?: any;
  subdomain: string;
  segment?: string;
}

export function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("general");
  const [availablePrinters, setAvailablePrinters] = useState<string[]>([]);
  const [loadingPrinters, setLoadingPrinters] = useState(false);
  const [printerSettings, setPrinterSettings] = useState({
    caixa: "",
    cozinha1: "",
    cozinha2: "",
    copa_bar: ""
  });

  // Get company ID from user profile
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      const { data, error } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Fetch company info
  const { data: companyInfo, isLoading: loadingCompany } = useQuery({
    queryKey: ["company-info", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return null;
      
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", profile.company_id)
        .single();
      
      if (error) throw error;
      return data as CompanyInfo;
    },
    enabled: !!profile?.company_id,
  });

  // Fetch store settings
  const { data: storeSettings, isLoading: loadingSettings } = useQuery({
    queryKey: ["store-settings", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return null;
      
      const { data, error } = await supabase
        .from("store_settings")
        .select("*")
        .eq("company_id", profile.company_id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      // Return default settings if not found
      return data || {
        store_open: true,
        auto_accept: false,
        sound_enabled: true,
        delivery_time: 30,
        pickup_time: 45,
        delivery_fee: 5.00,
        alert_time: 60,
      } as StoreSettings;
    },
    enabled: !!profile?.company_id,
  });

  // Load printer settings when store settings are available
  useEffect(() => {
    if (storeSettings?.printer_settings) {
      setPrinterSettings(storeSettings.printer_settings);
      
      // Se já tem impressoras configuradas, buscar as disponíveis automaticamente
      const hasPrinters = Object.values(storeSettings.printer_settings).some(p => p);
      if (hasPrinters && availablePrinters.length === 0) {
        fetchPrinters();
      }
    }
  }, [storeSettings]);

  // Fetch available printers - only shows toast if manual
  const fetchPrinters = async (showToast = true) => {
    setLoadingPrinters(true);
    try {
      const printers = await qzPrinter.getPrinters();
      setAvailablePrinters(printers);
      if (showToast) {
        toast({
          title: "Sucesso",
          description: `${printers.length} impressora(s) encontrada(s)`,
        });
      }
    } catch (error) {
      console.error("Erro ao buscar impressoras:", error);
      if (showToast) {
        toast({
          title: "Erro",
          description: "Certifique-se que o QZ Tray está aberto e rodando",
          variant: "destructive",
        });
      }
    } finally {
      setLoadingPrinters(false);
    }
  };

  // Update company info mutation
  const updateCompanyMutation = useMutation({
    mutationFn: async (data: Partial<CompanyInfo>) => {
      if (!profile?.company_id) throw new Error("Company ID not found");
      
      const { error } = await supabase
        .from("companies")
        .update(data)
        .eq("id", profile.company_id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-info"] });
      toast({
        title: "Sucesso",
        description: "Informações da empresa atualizadas",
      });
    },
    onError: (error) => {
      console.error("Error updating company:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar informações da empresa",
        variant: "destructive",
      });
    },
  });

  // Update store settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<StoreSettings>) => {
      if (!profile?.company_id) throw new Error("Company ID not found");
      
      const { error } = await supabase
        .from("store_settings")
        .upsert({
          company_id: profile.company_id,
          ...data
        }, {
          onConflict: 'company_id'
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-settings"] });
      toast({
        title: "Sucesso",
        description: "Configurações atualizadas",
      });
    },
    onError: (error) => {
      console.error("Error updating settings:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar configurações",
        variant: "destructive",
      });
    },
  });

  const handleCompanyUpdate = (field: string, value: any) => {
    updateCompanyMutation.mutate({ [field]: value });
  };

  const handleSettingsUpdate = (field: string, value: any) => {
    updateSettingsMutation.mutate({ [field]: value });
  };

  const handlePrinterUpdate = (sector: string, printer: string) => {
    const newSettings = { ...printerSettings, [sector]: printer };
    setPrinterSettings(newSettings);
    handleSettingsUpdate("printer_settings", newSettings);
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="bg-card/50 backdrop-blur border-b border-border sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="lg:hidden" />
              <div>
                <h1 className="text-xl font-bold">Configurações</h1>
                <p className="text-xs text-muted-foreground">
                  Gerencie as configurações do sistema
                </p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-3 w-full max-w-2xl">
            <TabsTrigger value="general">Geral</TabsTrigger>
            <TabsTrigger value="printer">Impressão</TabsTrigger>
            <TabsTrigger value="company">Empresa</TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  Configurações da Loja
                </CardTitle>
                <CardDescription>
                  Configure o funcionamento básico da sua loja
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="store-open">Loja Aberta</Label>
                    <p className="text-sm text-muted-foreground">
                      Permite que clientes façam pedidos
                    </p>
                  </div>
                  <Switch
                    id="store-open"
                    checked={storeSettings?.store_open}
                    onCheckedChange={(checked) => handleSettingsUpdate("store_open", checked)}
                    disabled={loadingSettings}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="auto-accept">Aceitar Pedidos Automaticamente</Label>
                    <p className="text-sm text-muted-foreground">
                      Pedidos são aceitos sem aprovação manual
                    </p>
                  </div>
                  <Switch
                    id="auto-accept"
                    checked={storeSettings?.auto_accept}
                    onCheckedChange={(checked) => handleSettingsUpdate("auto_accept", checked)}
                    disabled={loadingSettings}
                  />
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pickup-time">
                      <Clock className="inline h-4 w-4 mr-2" />
                      Tempo de Retirada (min)
                    </Label>
                    <Input
                      id="pickup-time"
                      type="number"
                      value={storeSettings?.pickup_time}
                      onChange={(e) => handleSettingsUpdate("pickup_time", parseInt(e.target.value))}
                      disabled={loadingSettings}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="delivery-time">
                      <Truck className="inline h-4 w-4 mr-2" />
                      Tempo de Entrega (min)
                    </Label>
                    <Input
                      id="delivery-time"
                      type="number"
                      value={storeSettings?.delivery_time}
                      onChange={(e) => handleSettingsUpdate("delivery_time", parseInt(e.target.value))}
                      disabled={loadingSettings}
                    />
                  </div>
                </div>

                <Separator />

                {/* Notificações movidas para a aba Geral */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="sound-enabled">
                      <Volume2 className="inline h-4 w-4 mr-2" />
                      Som de Notificação
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Tocar som quando receber novos pedidos
                    </p>
                  </div>
                  <Switch
                    id="sound-enabled"
                    checked={storeSettings?.sound_enabled}
                    onCheckedChange={(checked) => handleSettingsUpdate("sound_enabled", checked)}
                    disabled={loadingSettings}
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="alert-time">
                    <Clock className="inline h-4 w-4 mr-2" />
                    Tempo de Alerta (segundos)
                  </Label>
                  <Input
                    id="alert-time"
                    type="number"
                    value={storeSettings?.alert_time}
                    onChange={(e) => handleSettingsUpdate("alert_time", parseInt(e.target.value))}
                    disabled={loadingSettings}
                  />
                  <p className="text-sm text-muted-foreground">
                    Tempo de exibição das notificações na tela
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Printer Settings */}
          <TabsContent value="printer" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Printer className="h-5 w-5" />
                  Configuração de Impressoras
                </CardTitle>
                <CardDescription>
                  Defina as impressoras padrão para cada setor
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {availablePrinters.length > 0 
                      ? `${availablePrinters.length} impressora(s) disponível(is)`
                      : "Clique em buscar para encontrar impressoras"}
                  </p>
                  <Button
                    onClick={() => fetchPrinters(true)}
                    disabled={loadingPrinters}
                    variant="outline"
                    size="sm"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${loadingPrinters ? 'animate-spin' : ''}`} />
                    {loadingPrinters ? "Buscando..." : "Buscar Impressoras"}
                  </Button>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="printer-caixa">Impressora - CAIXA</Label>
                    <Select
                      value={printerSettings.caixa}
                      onValueChange={(value) => handlePrinterUpdate("caixa", value)}
                      disabled={availablePrinters.length === 0}
                    >
                      <SelectTrigger id="printer-caixa">
                        <SelectValue placeholder="Selecione a impressora do caixa" />
                      </SelectTrigger>
                      <SelectContent>
                        {availablePrinters.map((printer) => (
                          <SelectItem key={printer} value={printer}>
                            {printer}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="printer-cozinha1">Impressora - Cozinha 1</Label>
                    <Select
                      value={printerSettings.cozinha1}
                      onValueChange={(value) => handlePrinterUpdate("cozinha1", value)}
                      disabled={availablePrinters.length === 0}
                    >
                      <SelectTrigger id="printer-cozinha1">
                        <SelectValue placeholder="Selecione a impressora da cozinha 1" />
                      </SelectTrigger>
                      <SelectContent>
                        {availablePrinters.map((printer) => (
                          <SelectItem key={printer} value={printer}>
                            {printer}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="printer-cozinha2">Impressora - Cozinha 2</Label>
                    <Select
                      value={printerSettings.cozinha2}
                      onValueChange={(value) => handlePrinterUpdate("cozinha2", value)}
                      disabled={availablePrinters.length === 0}
                    >
                      <SelectTrigger id="printer-cozinha2">
                        <SelectValue placeholder="Selecione a impressora da cozinha 2" />
                      </SelectTrigger>
                      <SelectContent>
                        {availablePrinters.map((printer) => (
                          <SelectItem key={printer} value={printer}>
                            {printer}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="printer-copa-bar">Impressora - Copa/Bar</Label>
                    <Select
                      value={printerSettings.copa_bar}
                      onValueChange={(value) => handlePrinterUpdate("copa_bar", value)}
                      disabled={availablePrinters.length === 0}
                    >
                      <SelectTrigger id="printer-copa-bar">
                        <SelectValue placeholder="Selecione a impressora da copa/bar" />
                      </SelectTrigger>
                      <SelectContent>
                        {availablePrinters.map((printer) => (
                          <SelectItem key={printer} value={printer}>
                            {printer}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Printer className="h-4 w-4" />
                    Importante
                  </p>
                  <p className="text-sm text-muted-foreground">
                    • Certifique-se que o QZ Tray está aberto e rodando no Windows
                  </p>
                  <p className="text-sm text-muted-foreground">
                    • As impressoras devem estar instaladas e configuradas no sistema
                  </p>
                  <p className="text-sm text-muted-foreground">
                    • Use "Buscar Impressoras" para atualizar a lista
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Company Settings */}
          <TabsContent value="company" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Informações da Empresa
                </CardTitle>
                <CardDescription>
                  Dados cadastrais e informações legais
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company-name">Razão Social</Label>
                    <Input
                      id="company-name"
                      value={companyInfo?.name || ""}
                      onChange={(e) => handleCompanyUpdate("name", e.target.value)}
                      disabled={loadingCompany}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fantasy-name">Nome Fantasia</Label>
                    <Input
                      id="fantasy-name"
                      value={companyInfo?.fantasy_name || ""}
                      onChange={(e) => handleCompanyUpdate("fantasy_name", e.target.value)}
                      disabled={loadingCompany}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <Input
                      id="cnpj"
                      value={companyInfo?.cnpj || ""}
                      onChange={(e) => handleCompanyUpdate("cnpj", e.target.value)}
                      disabled={loadingCompany}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="segment">Segmento</Label>
                    <Input
                      id="segment"
                      value={companyInfo?.segment || ""}
                      onChange={(e) => handleCompanyUpdate("segment", e.target.value)}
                      disabled={loadingCompany}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">
                      <Mail className="inline h-4 w-4 mr-2" />
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={companyInfo?.email || ""}
                      onChange={(e) => handleCompanyUpdate("email", e.target.value)}
                      disabled={loadingCompany}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">
                      <Phone className="inline h-4 w-4 mr-2" />
                      Telefone
                    </Label>
                    <Input
                      id="phone"
                      value={companyInfo?.phone || ""}
                      onChange={(e) => handleCompanyUpdate("phone", e.target.value)}
                      disabled={loadingCompany}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subdomain">
                    <Globe className="inline h-4 w-4 mr-2" />
                    Subdomínio
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="subdomain"
                      value={companyInfo?.subdomain || ""}
                      onChange={(e) => handleCompanyUpdate("subdomain", e.target.value)}
                      disabled={loadingCompany}
                    />
                    <span className="flex items-center text-sm text-muted-foreground">.anafood.vip</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Configurações Avançadas
                </CardTitle>
                <CardDescription>
                  Configurações de segurança e integrações
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                  <p className="text-sm font-medium">Impressora Térmica</p>
                  <p className="text-sm text-muted-foreground">
                    Configure a impressora para imprimir pedidos automaticamente
                  </p>
                  <Button variant="outline" size="sm">
                    <Printer className="h-4 w-4 mr-2" />
                    Configurar Impressora
                  </Button>
                </div>

                <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                  <p className="text-sm font-medium">WhatsApp</p>
                  <p className="text-sm text-muted-foreground">
                    Configure a integração com WhatsApp para receber pedidos
                  </p>
                  <Button variant="outline" size="sm">
                    <Wifi className="h-4 w-4 mr-2" />
                    Configurar WhatsApp
                  </Button>
                </div>

                <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                  <p className="text-sm font-medium">Formas de Pagamento</p>
                  <p className="text-sm text-muted-foreground">
                    Configure as formas de pagamento aceitas pela loja
                  </p>
                  <Button variant="outline" size="sm">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Gerenciar Pagamentos
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}