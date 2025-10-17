import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { masks } from "@/lib/masks";
import { 
  Store, 
  Printer, 
  Truck, 
  Clock, 
  Volume2,
  RefreshCw,
  Palette,
  Sun,
  Moon
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { qzPrinter } from "@/lib/qz-tray";
import { useTheme } from "@/components/theme-provider";
import { useColorPalette, type ColorPalette } from "@/hooks/use-color-palette";
import { PrintLayoutConfig } from "@/components/settings/print-layout/PrintLayoutConfig";

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



export function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();
  const { palette, setPalette, palettes } = useColorPalette();
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
      // Garantir que todos os valores sejam strings definidas
      setPrinterSettings({
        caixa: storeSettings.printer_settings.caixa || "",
        cozinha1: storeSettings.printer_settings.cozinha1 || "",
        cozinha2: storeSettings.printer_settings.cozinha2 || "",
        copa_bar: storeSettings.printer_settings.copa_bar || ""
      });
    }
  }, [storeSettings]);

  // Carregar impressoras automaticamente quando a aba de impressão é acessada pela primeira vez
  const printersLoadedRef = useRef(false);
  
  useEffect(() => {
    if (activeTab === "printer" && !printersLoadedRef.current && storeSettings) {
      printersLoadedRef.current = true;
      fetchPrinters(false);
    }
  }, [activeTab, storeSettings]);

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
          <TabsList className="grid grid-cols-3 w-full max-w-4xl">
            <TabsTrigger value="general">Geral</TabsTrigger>
            <TabsTrigger value="appearance">Aparência</TabsTrigger>
            <TabsTrigger value="print">Configurações de Impressão</TabsTrigger>
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
                      value={storeSettings?.pickup_time ?? 45}
                      onChange={(e) => handleSettingsUpdate("pickup_time", parseInt(e.target.value) || 45)}
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
                      value={storeSettings?.delivery_time ?? 30}
                      onChange={(e) => handleSettingsUpdate("delivery_time", parseInt(e.target.value) || 30)}
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
                  <Label htmlFor="delayed-alert">
                    <Clock className="inline h-4 w-4 mr-2" />
                    Alerta de Pedidos em Atraso (min)
                  </Label>
                  <Select
                    value={String(storeSettings?.alert_time ?? 10)}
                    onValueChange={(value) => handleSettingsUpdate("alert_time", parseInt(value))}
                    disabled={loadingSettings}
                  >
                    <SelectTrigger id="delayed-alert">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[5, 10, 15, 20, 30].map((time) => (
                        <SelectItem key={time} value={String(time)}>
                          {time} minutos
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Tempo em minutos para alertar pedidos em atraso (apenas Em Preparo)
                  </p>
                </div>

              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Settings */}
          <TabsContent value="appearance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Tema
                </CardTitle>
                <CardDescription>
                  Escolha entre tema claro ou escuro
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label>Modo de Tema</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      variant={theme === "light" ? "default" : "outline"}
                      className="h-auto flex-col gap-2 p-4"
                      onClick={() => setTheme("light")}
                    >
                      <Sun className="h-6 w-6" />
                      <span>Claro</span>
                    </Button>
                    <Button
                      variant={theme === "dark" ? "default" : "outline"}
                      className="h-auto flex-col gap-2 p-4"
                      onClick={() => setTheme("dark")}
                    >
                      <Moon className="h-6 w-6" />
                      <span>Escuro</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Paleta de Cores
                </CardTitle>
                <CardDescription>
                  Personalize as cores do sistema escolhendo uma paleta
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label>Escolha uma Paleta</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <Button
                      variant={palette === "purple" ? "default" : "outline"}
                      className="h-auto flex-col gap-3 p-4"
                      onClick={() => setPalette("purple")}
                    >
                      <div className="w-full h-12 rounded-md bg-gradient-to-br from-purple-500 to-purple-600" />
                      <span className="text-sm font-medium">Roxo</span>
                    </Button>
                    <Button
                      variant={palette === "blue" ? "default" : "outline"}
                      className="h-auto flex-col gap-3 p-4"
                      onClick={() => setPalette("blue")}
                    >
                      <div className="w-full h-12 rounded-md bg-gradient-to-br from-blue-500 to-blue-600" />
                      <span className="text-sm font-medium">Azul</span>
                    </Button>
                    <Button
                      variant={palette === "green" ? "default" : "outline"}
                      className="h-auto flex-col gap-3 p-4"
                      onClick={() => setPalette("green")}
                    >
                      <div className="w-full h-12 rounded-md bg-gradient-to-br from-green-500 to-green-600" />
                      <span className="text-sm font-medium">Verde</span>
                    </Button>
                    <Button
                      variant={palette === "orange" ? "default" : "outline"}
                      className="h-auto flex-col gap-3 p-4"
                      onClick={() => setPalette("orange")}
                    >
                      <div className="w-full h-12 rounded-md bg-gradient-to-br from-orange-500 to-orange-600" />
                      <span className="text-sm font-medium">Laranja</span>
                    </Button>
                    <Button
                      variant={palette === "pink" ? "default" : "outline"}
                      className="h-auto flex-col gap-3 p-4"
                      onClick={() => setPalette("pink")}
                    >
                      <div className="w-full h-12 rounded-md bg-gradient-to-br from-pink-500 to-pink-600" />
                      <span className="text-sm font-medium">Rosa</span>
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    A paleta de cores será aplicada em todos os elementos do sistema
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Print Settings - replaces old Printer and Layout tabs */}
          <TabsContent value="print" className="space-y-6">
            {profile?.company_id ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Printer className="h-5 w-5" />
                      Impressão Automática
                    </CardTitle>
                    <CardDescription>
                      Configure quando imprimir pedidos automaticamente
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label htmlFor="auto-print">Impressão Automática ao Aceitar</Label>
                        <p className="text-sm text-muted-foreground">
                          Imprimir automaticamente quando aceitar um pedido
                        </p>
                      </div>
                      <Switch
                        id="auto-print"
                        checked={(storeSettings?.printer_settings as any)?.auto_print ?? true}
                        onCheckedChange={(checked) => {
                          const currentPrinterSettings = storeSettings?.printer_settings || {};
                          handleSettingsUpdate("printer_settings", {
                            ...(typeof currentPrinterSettings === 'object' ? currentPrinterSettings : {}),
                            auto_print: checked
                          });
                        }}
                        disabled={loadingSettings}
                      />
                    </div>
                  </CardContent>
                </Card>
                <PrintLayoutConfig />
              </>
            ) : (
              <Card>
                <CardContent className="py-10">
                  <p className="text-center text-muted-foreground">
                    Erro ao carregar configurações. Por favor, recarregue a página.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}