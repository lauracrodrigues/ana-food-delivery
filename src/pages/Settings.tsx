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
  Moon,
  Play,
  Pause
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { qzPrinter } from "@/lib/qz-tray";
import { useTheme } from "@/components/theme-provider";
import { useColorPalette, type ColorPalette } from "@/hooks/use-color-palette";

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
  notification_sound?: string;
  printer_settings?: any;
  visible_columns?: any;
}


const availableSounds = [
  { value: "/sounds/ifood_toque.mp3", label: "iFood", icon: "🎵" },
  { value: "/notification.mp3", label: "Clássico", icon: "🔔" },
  { value: "/sounds/bell.mp3", label: "Digital", icon: "🔊" },
  { value: "/sounds/chime.mp3", label: "Sino", icon: "🎶" },
  { value: "/sounds/ping.mp3", label: "Ping", icon: "📢" },
];

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
  const [playingSound, setPlayingSound] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  const handleSoundTest = (soundPath: string) => {
    // Se o mesmo som está tocando, pausar
    if (playingSound === soundPath && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlayingSound(null);
      return;
    }

    // Parar qualquer som que esteja tocando
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    // Criar e tocar novo áudio
    const audio = new Audio(soundPath);
    audioRef.current = audio;
    setPlayingSound(soundPath);

    audio.play().catch(e => {
      console.error("Erro ao reproduzir som:", e);
      toast({
        title: "Erro",
        description: "Não foi possível reproduzir o som",
        variant: "destructive",
      });
      setPlayingSound(null);
    });

    // Resetar quando o som terminar
    audio.onended = () => {
      setPlayingSound(null);
      audioRef.current = null;
    };
  };

  // Limpar áudio ao desmontar
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

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
          <TabsList className="grid grid-cols-3 w-full max-w-3xl">
            <TabsTrigger value="general">Geral</TabsTrigger>
            <TabsTrigger value="appearance">Aparência</TabsTrigger>
            <TabsTrigger value="printer">Impressão</TabsTrigger>
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

                <div className="space-y-4">
                  <Label>
                    <Volume2 className="inline h-4 w-4 mr-2" />
                    Escolha o Som de Notificação
                  </Label>
                  <RadioGroup
                    value={storeSettings?.notification_sound || '/sounds/ifood_toque.mp3'}
                    onValueChange={(value) => handleSettingsUpdate("notification_sound", value)}
                    disabled={loadingSettings}
                    className="space-y-3"
                  >
                    {availableSounds.map((sound) => (
                      <div 
                        key={sound.value}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <RadioGroupItem value={sound.value} id={sound.value} />
                          <Label 
                            htmlFor={sound.value} 
                            className="cursor-pointer font-medium flex items-center gap-2"
                          >
                            <span className="text-lg">{sound.icon}</span>
                            <span>{sound.label}</span>
                          </Label>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSoundTest(sound.value)}
                          disabled={loadingSettings || !storeSettings?.sound_enabled}
                          className="gap-2"
                        >
                          {playingSound === sound.value ? (
                            <>
                              <Pause className="h-4 w-4" />
                              Pausar
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4" />
                              Testar
                            </>
                          )}
                        </Button>
                      </div>
                    ))}
                  </RadioGroup>
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
                    value={storeSettings?.alert_time ?? 60}
                    onChange={(e) => handleSettingsUpdate("alert_time", parseInt(e.target.value) || 60)}
                    disabled={loadingSettings}
                  />
                  <p className="text-sm text-muted-foreground">
                    Tempo de exibição das notificações na tela
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
                      value={printerSettings.caixa || ""}
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
                      value={printerSettings.cozinha1 || ""}
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
                      value={printerSettings.cozinha2 || ""}
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
                      value={printerSettings.copa_bar || ""}
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

        </Tabs>
      </div>
    </div>
  );
}