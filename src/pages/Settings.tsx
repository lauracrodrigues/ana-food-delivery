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
  Truck, 
  Clock, 
  Volume2,
  RefreshCw,
  Palette,
  Sun,
  Moon,
  Hash,
  RotateCcw
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
  alert_time: number;
  printer_settings?: any;
  visible_columns?: any;
  order_numbering_mode?: string;
  order_numbering_reset_time?: string;
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
        alert_time: 60,
        order_numbering_mode: 'sequential',
        order_numbering_reset_time: '00:00',
      } as StoreSettings;
    },
    enabled: !!profile?.company_id,
  });

  // Fetch next order number preview
  const { data: nextOrderNumber } = useQuery({
    queryKey: ["next-order-number", profile?.company_id, storeSettings?.order_numbering_mode],
    queryFn: async () => {
      if (!profile?.company_id) return null;
      
      const mode = storeSettings?.order_numbering_mode || 'sequential';
      const resetTime = storeSettings?.order_numbering_reset_time || '00:00';
      
      let query = supabase
        .from("orders")
        .select("order_number")
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false })
        .limit(1);

      // Se modo diário, filtrar apenas pedidos do dia atual
      if (mode === 'daily') {
        const now = new Date();
        const [hours, minutes] = resetTime.split(':').map(Number);
        
        const resetDate = new Date(now);
        resetDate.setHours(hours, minutes, 0, 0);
        
        if (now < resetDate) {
          resetDate.setDate(resetDate.getDate() - 1);
        }
        
        query = query.gte('created_at', resetDate.toISOString());
      }

      const { data } = await query.maybeSingle();
      
      return data?.order_number 
        ? String(parseInt(data.order_number) + 1).padStart(3, '0')
        : '001';
    },
    enabled: !!profile?.company_id && !!storeSettings,
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
      queryClient.invalidateQueries({ queryKey: ["next-order-number"] });
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

  // Reset order counter manually
  const handleResetOrderCounter = async () => {
    if (!confirm("Tem certeza que deseja zerar a contagem de pedidos? O próximo pedido será #001.")) {
      return;
    }

    // Não há nada a fazer no banco - a lógica de reset é baseada em filtros
    // Apenas mudamos para modo diário com hora atual para "simular" um reset
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    updateSettingsMutation.mutate({ 
      order_numbering_mode: 'daily',
      order_numbering_reset_time: currentTime 
    });
    
    toast({
      title: "Sucesso",
      description: "Contagem zerada! Próximo pedido será #001",
    });
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

            {/* Order Numbering Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Hash className="h-5 w-5" />
                  Numeração de Pedidos
                </CardTitle>
                <CardDescription>
                  Configure como os números dos pedidos são gerados
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label>Modo de Numeração</Label>
                  <RadioGroup
                    value={storeSettings?.order_numbering_mode || 'sequential'}
                    onValueChange={(value) => handleSettingsUpdate("order_numbering_mode", value)}
                    disabled={loadingSettings}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                  >
                    <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                      <RadioGroupItem value="sequential" id="sequential" className="mt-1" />
                      <div className="space-y-1">
                        <Label htmlFor="sequential" className="font-medium cursor-pointer">
                          Sequencial
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Nunca reinicia. Os números continuam crescendo indefinidamente (001, 002, 003...)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                      <RadioGroupItem value="daily" id="daily" className="mt-1" />
                      <div className="space-y-1">
                        <Label htmlFor="daily" className="font-medium cursor-pointer">
                          Diária
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Reinicia todo dia na hora configurada. Começa em 001 a cada dia.
                        </p>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                {storeSettings?.order_numbering_mode === 'daily' && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <Label htmlFor="reset-time">
                        <Clock className="inline h-4 w-4 mr-2" />
                        Hora de Reset
                      </Label>
                      <Input
                        id="reset-time"
                        type="time"
                        value={storeSettings?.order_numbering_reset_time || '00:00'}
                        onChange={(e) => handleSettingsUpdate("order_numbering_reset_time", e.target.value)}
                        disabled={loadingSettings}
                        className="w-32"
                      />
                      <p className="text-sm text-muted-foreground">
                        Hora em que a numeração reinicia para 001
                      </p>
                    </div>
                  </>
                )}

                <Separator />

                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Próximo pedido será:</p>
                    <p className="text-2xl font-bold text-primary">#{nextOrderNumber || '001'}</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleResetOrderCounter}
                    disabled={loadingSettings || updateSettingsMutation.isPending}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Zerar Contagem
                  </Button>
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

          {/* Print Settings */}
          <TabsContent value="print" className="space-y-6">
            {profile?.company_id ? (
              <PrintLayoutConfig />
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
