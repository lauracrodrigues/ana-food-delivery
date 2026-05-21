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
  RotateCcw,
  Grid3X3,
  MessageSquare,
  CreditCard,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageLayout } from "@/components/layout/PageLayout";
import { ThemeToggle } from "@/components/theme-toggle";
// v1.2.0 — QZ removido. Impressoras gerenciadas pelo Ana Food Print agent.
import { useTheme } from "@/components/theme-provider";
import { useColorPalette, type ColorPalette } from "@/hooks/use-color-palette";
import { PrintLayoutConfig } from "@/components/settings/print-layout/PrintLayoutConfig";
import { AutomationRulesTab } from "@/components/settings/AutomationRulesTab";
import { WhatsAppGroupTab } from "@/components/settings/WhatsAppGroupTab";
import { TablesSettings } from "@/components/settings/TablesSettings";
import { BusinessHoursConfig } from "@/components/settings/BusinessHoursConfig";
import { PaymentSettingsConfig } from "@/components/settings/PaymentSettingsConfig";
import { MenuSortConfig } from "@/components/settings/MenuSortConfig";
import Retention from "@/pages/Retention";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { SkeletonTable } from "@/components/loading";

interface StoreSettings {
  id?: string;
  company_id?: string;
  store_open: boolean;
  auto_accept: boolean;
  sound_enabled: boolean;
  delivery_time: number;
  pickup_time: number;
  alert_time: number;
  debounce_ms: number;
  printer_settings?: any;
  visible_columns?: any;
  order_numbering_mode?: string;
  order_numbering_reset_time?: string;
}

export function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();
  const { palette, setPalette, customColor, setCustomColor, palettes } = useColorPalette();
  // Preferências pessoais do usuário (som, impressora, etc.)
  const { preferences: userPrefs, savePreference } = useUserPreferences();
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
        debounce_ms: 10000,
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
  const fetchPrinters = async (_showToast = true) => {
    // v1.2.0 — Impressoras agora vêm do app Ana Food Print (configuração local).
    // Aqui apenas mantém compat com componentes antigos.
    setLoadingPrinters(false);
    setAvailablePrinters([]);
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
    <PageLayout
      title="Configurações"
      subtitle="Gerencie as configurações do sistema"
    >
      <div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-7 w-full max-w-4xl">
            <TabsTrigger value="general">Geral</TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5" />Pagamentos
            </TabsTrigger>
            <TabsTrigger value="tables">
              <Grid3X3 className="h-4 w-4 mr-1" />
              Mesas
            </TabsTrigger>
            <TabsTrigger value="hours">
              <Clock className="h-4 w-4 mr-1" />
              Horários
            </TabsTrigger>
            <TabsTrigger value="appearance">Aparência</TabsTrigger>
            <TabsTrigger value="print">Impressão</TabsTrigger>
            <TabsTrigger value="automations">⚡ Automações</TabsTrigger>
            <TabsTrigger value="lgpd">LGPD</TabsTrigger>
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
                    checked={userPrefs.soundEnabled ?? storeSettings?.sound_enabled ?? true}
                    onCheckedChange={(checked) => savePreference({ soundEnabled: checked })}
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

          {/* Payment Settings */}
          <TabsContent value="payments" className="space-y-6">
            <PaymentSettingsConfig />
          </TabsContent>

          {/* Appearance Settings */}
          <TabsContent value="appearance" className="space-y-6">
            {/* MenuSortConfig global removido — agora cada categoria tem sort_mode próprio (em /categories) */}
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
                  Personalize as cores do sistema — presets rápidos ou cor personalizada
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Presets principais */}
                <div className="space-y-3">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Cores prontas
                  </Label>
                  <div className="grid grid-cols-5 gap-2">
                    {(
                      [
                        { key: "purple",  label: "Roxo",    from: "from-purple-500", to: "to-violet-600" },
                        { key: "blue",    label: "Azul",    from: "from-blue-500",   to: "to-sky-600" },
                        { key: "green",   label: "Verde",   from: "from-green-500",  to: "to-emerald-600" },
                        { key: "orange",  label: "Laranja", from: "from-orange-500", to: "to-amber-500" },
                        { key: "pink",    label: "Rosa",    from: "from-pink-500",   to: "to-rose-500" },
                        { key: "red",     label: "Vermelho",from: "from-red-500",    to: "to-rose-600" },
                        { key: "teal",    label: "Teal",    from: "from-teal-500",   to: "to-cyan-600" },
                        { key: "indigo",  label: "Índigo",  from: "from-indigo-500", to: "to-blue-600" },
                        { key: "yellow",  label: "Amarelo", from: "from-yellow-400", to: "to-amber-500" },
                        { key: "slate",   label: "Cinza",   from: "from-slate-500",  to: "to-slate-600" },
                      ] as const
                    ).map(({ key, label, from, to }) => (
                      <button
                        key={key}
                        onClick={() => setPalette(key as ColorPalette)}
                        title={label}
                        className={`relative rounded-xl overflow-hidden h-14 w-full transition-all duration-200 ring-offset-2 ${
                          palette === key
                            ? "ring-2 ring-primary scale-105 shadow-lg"
                            : "hover:scale-105 hover:shadow-md opacity-80 hover:opacity-100"
                        }`}
                      >
                        <div className={`w-full h-full bg-gradient-to-br ${from} ${to}`} />
                        {palette === key && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <svg className="w-5 h-5 text-white drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                        <span className="absolute bottom-1 left-0 right-0 text-center text-[9px] font-semibold text-white drop-shadow">
                          {label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Paleta customizada */}
                <div className="space-y-3">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Cor personalizada
                  </Label>
                  <div className="flex items-center gap-4">
                    <div className={`relative rounded-xl overflow-hidden h-14 w-16 shrink-0 ring-offset-2 transition-all ${
                      palette === "custom" ? "ring-2 ring-primary scale-105 shadow-lg" : "opacity-70"
                    }`}>
                      <div
                        className="w-full h-full"
                        style={{ background: `linear-gradient(135deg, ${customColor}, ${customColor}dd)` }}
                      />
                      {palette === "custom" && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <svg className="w-5 h-5 text-white drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Escolha qualquer cor — o sistema gera a paleta automaticamente
                      </p>
                      <div className="flex items-center gap-3">
                        {/* Color picker nativo */}
                        <label className="cursor-pointer">
                          <input
                            type="color"
                            value={customColor}
                            onChange={e => setCustomColor(e.target.value)}
                            className="sr-only"
                          />
                          <div
                            className="w-10 h-10 rounded-lg border-2 border-border cursor-pointer hover:scale-110 transition-transform shadow-sm"
                            style={{ backgroundColor: customColor }}
                            title="Clique para abrir o seletor de cor"
                          />
                        </label>
                        <Input
                          value={customColor}
                          onChange={e => {
                            const v = e.target.value;
                            // Aceita hex válido
                            if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setCustomColor(v.length === 7 ? v : v);
                          }}
                          className="w-32 font-mono text-sm"
                          placeholder="#000000"
                          maxLength={7}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCustomColor(customColor)}
                        >
                          Aplicar
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  A paleta de cores é aplicada em todos os elementos do sistema
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tables Settings */}
          <TabsContent value="tables" className="space-y-6">
            <TablesSettings />
          </TabsContent>

          {/* Business Hours Settings */}
          <TabsContent value="hours" className="space-y-6">
            {profile?.company_id ? (
              <BusinessHoursConfig companyId={profile.company_id} />
            ) : (
              <Card>
                <CardContent className="py-10">
                  <SkeletonTable rows={5} cols={3} />
                </CardContent>
              </Card>
            )}
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

          {/* v1.0.0 — Automações de fluxo (auto-avanço status) */}
          <TabsContent value="automations" className="space-y-6">
            <AutomationRulesTab />
            <WhatsAppGroupTab />
          </TabsContent>

          {/* LGPD — retenção de dados (movido do menu lateral) */}
          <TabsContent value="lgpd" className="space-y-6">
            <Retention embedded />
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
}
