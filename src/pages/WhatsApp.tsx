import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Clock, Bot, Mic, Play, Loader2, Printer, Wifi, WifiOff, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WelcomeMessageEditor } from "@/components/whatsapp/WelcomeMessageEditor";
import { UpgradeGate } from "@/components/billing/UpgradeGate";
import { WhatsAppStatusMessages } from "@/components/whatsapp/WhatsAppStatusMessages";
import { AgentBehaviorConfig, type AgentBehaviorData } from "@/components/whatsapp/AgentBehaviorConfig";

interface WhatsAppSession {
  id: string;
  session_name: string;
  agent_name: string;
  agent_prompt: string | null;
  is_active: boolean;
  created_at: string;
  connection_status?: 'open' | 'close' | 'connecting' | 'unknown';
  is_primary?: boolean;        // multi-sessão: marca a sessão padrão de envio
  display_name?: string | null; // apelido amigável ("Principal", "Backup")
}


export default function WhatsApp() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isElectron = typeof window !== 'undefined' && !!(window as any).require;
  const [activeTab, setActiveTab] = useState("sessions");
  const placeholderRef = useRef<HTMLDivElement>(null);
  const [localSettings, setLocalSettings] = useState<any>({
    autoReplyEnabled: true,
    autoReplyMessage: "",
    autoReplyDelay: 3000,
    printerName: "",
    enableLocalPrint: true,
  });
  const [printers, setPrinters] = useState<string[]>([]);
  const [whatsConnected, setWhatsConnected] = useState<boolean>(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [printAgentStatus, setPrintAgentStatus] = useState<{
    connected: boolean;
    devices: any[];
    onlineCount?: number;
    error?: string;
    loading: boolean;
  }>({
    connected: false,
    devices: [],
    loading: false,
  });
  const [testPrinting, setTestPrinting] = useState(false);
  const [isTesting, setIsTesting] = useState<string | false>(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  // estado local de velocidade — atualiza imediatamente sem esperar cache DB
  const [localSpeed, setLocalSpeed] = useState<string>('normal');

  // Electron IPC bounds sync
  useEffect(() => {
    if (!isElectron) return;

    const { ipcRenderer } = (window as any).require("electron");

    // Inform that route is active
    ipcRenderer.send("route-changed", "/whatsapp");
    ipcRenderer.send("whatsapp-view-status", { active: true });

    // Listen to status updates
    const handleStatus = (event: any, status: any) => {
      if (status && typeof status.connected === 'boolean') {
        setWhatsConnected(status.connected);
      }
    };
    ipcRenderer.on("whats-status-update", handleStatus);

    // Watch placeholder bounds
    const placeholder = placeholderRef.current;
    if (!placeholder) return;

    const updateBounds = () => {
      if (activeTab !== "sessions" || !placeholderRef.current) {
        // Outros tabs: esconde o BrowserView
        ipcRenderer.send("whatsapp-view-status", { active: false });
        ipcRenderer.send("whatsapp-view-bounds", { x: 0, y: 0, width: 0, height: 0 });
        return;
      }
      ipcRenderer.send("whatsapp-view-status", { active: true });
      const rect = placeholderRef.current.getBoundingClientRect();
      ipcRenderer.send("whatsapp-view-bounds", {
        x: Math.round(rect.left),
        y: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      });
    };

    // Update bounds immediately and on window resize/scroll
    updateBounds();
    window.addEventListener("resize", updateBounds);

    const observer = new ResizeObserver(() => {
      updateBounds();
    });
    observer.observe(placeholder);

    // Load local settings and printers
    ipcRenderer.invoke("get-settings").then((settings: any) => {
      if (settings) {
        setLocalSettings({
          autoReplyEnabled: settings.autoReplyEnabled,
          autoReplyMessage: settings.autoReplyMessage,
          autoReplyDelay: settings.autoReplyDelay,
          printerName: settings.printerName,
          enableLocalPrint: settings.enableLocalPrint !== false,
        });
      }
    });

    ipcRenderer.invoke("get-printers").then((list: any[]) => {
      if (list) {
        setPrinters(list.map(p => p.name));
      }
    });

    return () => {
      ipcRenderer.removeListener("whats-status-update", handleStatus);
      ipcRenderer.send("route-changed", "");
      ipcRenderer.send("whatsapp-view-status", { active: false });
      window.removeEventListener("resize", updateBounds);
      observer.disconnect();
    };
  }, [activeTab]);

  const handleReload = () => {
    if (isElectron) {
      const { ipcRenderer } = (window as any).require("electron");
      ipcRenderer.send("reload-whatsapp");
    }
  };

  const handleClearSession = () => {
    if (isElectron) {
      const { ipcRenderer } = (window as any).require("electron");
      ipcRenderer.send("clear-whatsapp-session");
    }
  };

  const handleZoomIn = () => {
    if (isElectron) {
      const { ipcRenderer } = (window as any).require("electron");
      ipcRenderer.send("zoom-in");
    }
  };

  const handleZoomOut = () => {
    if (isElectron) {
      const { ipcRenderer } = (window as any).require("electron");
      ipcRenderer.send("zoom-out");
    }
  };

  const handleResetZoom = () => {
    if (isElectron) {
      const { ipcRenderer } = (window as any).require("electron");
      ipcRenderer.send("reset-zoom");
    }
  };

  const handleSaveLocalSettings = async () => {
    if (isElectron) {
      const { ipcRenderer } = (window as any).require("electron");
      const res = await ipcRenderer.invoke("save-settings", localSettings);
      if (res.success) {
        toast({
          title: "Configurações salvas",
          description: "As configurações do desktop foram salvas com sucesso.",
        });
      } else {
        toast({
          title: "Erro ao salvar",
          description: "Não foi possível salvar as configurações.",
          variant: "destructive",
        });
      }
    }
  };

  // Verificar status do agente Ana Food Print
  const checkPrintAgentStatus = async () => {
    if (!isElectron) return;
    setPrintAgentStatus(prev => ({ ...prev, loading: true }));
    try {
      const { ipcRenderer } = (window as any).require("electron");
      const result = await ipcRenderer.invoke("get-print-agent-status");
      setPrintAgentStatus({
        connected: result.connected || false,
        devices: result.devices || [],
        onlineCount: result.onlineCount || 0,
        error: result.error,
        loading: false,
      });
    } catch (err: any) {
      setPrintAgentStatus(prev => ({
        ...prev,
        loading: false,
        error: err.message || "Erro ao verificar status",
      }));
    }
  };

  // Imprimir teste local
  const handleTestPrint = async () => {
    if (!isElectron) return;
    setTestPrinting(true);
    try {
      const { ipcRenderer } = (window as any).require("electron");
      const result = await ipcRenderer.invoke("test-print", { printerName: localSettings.printerName || "" });
      if (result.success) {
        toast({ title: "Impressão de teste enviada", description: "Verifique se o recibo foi impresso." });
      } else {
        toast({ title: "Falha na impressão de teste", description: result.error || "Erro desconhecido", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setTestPrinting(false);
    }
  };

  // Load company info
  useEffect(() => {
    async function loadCompany() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user) return;

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;
        if (profile?.company_id) setCompanyId(profile.company_id);
      } catch (err) {
        console.error('[WhatsApp] ❌ Erro ao carregar empresa:', err);
        toast({
          title: "Erro ao carregar configurações",
          description: "Não foi possível identificar sua empresa. Recarregue a página.",
          variant: "destructive",
        });
      }
    }
    loadCompany();
  }, []);

  // Load bot timing settings from store_settings — declarado ANTES do useEffect que usa botSettings
  const { data: botSettings, isLoading: loadingBotSettings } = useQuery({
    queryKey: ["bot-settings", companyId],
    queryFn: async () => {
      if (!companyId) return { debounce_ms: 1000, typing_debounce_ms: 1000, typing_duration_ms: 2500, recording_duration_ms: 7500, presence_enabled: true, followup_minutes: 10, cancel_minutes: 20, human_takeover_resume_minutes: 15, tts_enabled: false, tts_voice: 'pt-BR-Chirp3-HD-Aoede', tts_speed: 'normal' };
      const { data } = await supabase
        .from("store_settings")
        .select("debounce_ms, typing_debounce_ms, typing_duration_ms, recording_duration_ms, presence_enabled, followup_minutes, cancel_minutes, human_takeover_resume_minutes, tts_enabled, tts_voice, tts_speed, send_status_messages")
        .eq("company_id", companyId)
        .single();
      return {
        debounce_ms: data?.debounce_ms ?? 1000,
        typing_debounce_ms: data?.typing_debounce_ms ?? 1000,
        typing_duration_ms: (data as any)?.typing_duration_ms ?? 2500,
        recording_duration_ms: (data as any)?.recording_duration_ms ?? 7500,
        presence_enabled: (data as any)?.presence_enabled !== false,
        followup_minutes: data?.followup_minutes ?? 10,
        cancel_minutes: data?.cancel_minutes ?? 20,
        human_takeover_resume_minutes: data?.human_takeover_resume_minutes ?? 15,
        tts_enabled: (data as any)?.tts_enabled ?? false,
        tts_voice: (data as any)?.tts_voice ?? 'pt-BR-Chirp3-HD-Aoede',
        tts_speed: (data as any)?.tts_speed ?? 'normal',
        send_status_messages: (data as any)?.send_status_messages !== false,
      };
    },
    enabled: !!companyId,
  });

  // Sincroniza localSpeed quando botSettings carrega do banco (declarado após botSettings)
  useEffect(() => {
    if (botSettings?.tts_speed) setLocalSpeed(botSettings.tts_speed);
  }, [botSettings?.tts_speed]);

  const updateBotSettingsMutation = useMutation({
    mutationFn: async (values: Partial<{ debounce_ms: number; typing_debounce_ms: number; typing_duration_ms: number; recording_duration_ms: number; presence_enabled: boolean; followup_minutes: number; cancel_minutes: number; human_takeover_resume_minutes: number; tts_enabled: boolean; tts_voice: string; tts_speed: string; send_status_messages: boolean }>) => {
      if (!companyId) throw new Error("No company");
      const { error } = await supabase
        .from("store_settings")
        .upsert({ company_id: companyId, ...values }, { onConflict: "company_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bot-settings", companyId] });
      toast({ title: "Salvo", description: "Configurações atualizadas." });
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível salvar.", variant: "destructive" }),
  });

  // Salva personalidade + regras na sessão ativa (whatsapp_config)
  const saveAgentBehaviorMutation = useMutation({
    mutationFn: async ({ sessionId, data }: { sessionId: string; data: AgentBehaviorData }) => {
      const { error } = await supabase
        .from("whatsapp_config")
        .update({
          agent_personality: data.agent_personality,
          behavior_rules: data.behavior_rules,
        })
        .eq("id", sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-sessions", companyId] });
      toast({ title: "Salvo", description: "Comportamento do agente atualizado." });
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível salvar comportamento.", variant: "destructive" }),
  });

  // Load WhatsApp sessions with optimized caching
  const { data: sessions = [] } = useQuery({
    queryKey: ["whatsapp-sessions", companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('whatsapp_config')
        .select('*')
        .eq('company_id', companyId)
        .eq('config_type', 'session')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as WhatsAppSession[];
    },
    enabled: !!companyId,
    staleTime: 30000,
    gcTime: 60000,
  });


  if (isElectron) {
    return (
      <PageLayout title="WhatsApp" subtitle="Conexão e controle do WhatsApp Web">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="sessions" className="flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4" />
                WhatsApp Web
              </TabsTrigger>
              <TabsTrigger value="mensagens" className="flex items-center gap-1.5">
                <Bot className="h-4 w-4" />
                Controle de Mensagens
              </TabsTrigger>
              <TabsTrigger value="configuracoes" className="flex items-center gap-1.5">
                <Printer className="h-4 w-4" />
                Configurações
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2 text-sm">
              <span className={`h-2.5 w-2.5 rounded-full ${whatsConnected ? "bg-green-500" : "bg-red-500"}`} />
              <span className="text-muted-foreground">
                {whatsConnected ? "WhatsApp conectado" : "Aguardando conexão"}
              </span>
            </div>
          </div>

          {/* ── Aba 1: WhatsApp Web ── */}
          <TabsContent value="sessions" className="m-0 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Sessão direta com WhatsApp Web — sem Evolution API</p>
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="sm" onClick={handleZoomOut}>A-</Button>
                <Button variant="outline" size="sm" onClick={handleResetZoom}>100%</Button>
                <Button variant="outline" size="sm" onClick={handleZoomIn}>A+</Button>
                <Button variant="outline" size="sm" onClick={handleReload} className="flex items-center gap-1">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Recarregar
                </Button>
                <Button variant="destructive" size="sm" onClick={handleClearSession}>
                  Desconectar
                </Button>
              </div>
            </div>

            <div
              ref={placeholderRef}
              className="w-full rounded-xl border border-border bg-muted/20 overflow-hidden relative"
              style={{ height: "calc(100vh - 260px)", minHeight: "420px" }}
            >
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center select-none pointer-events-none">
                <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
                <p className="text-sm text-muted-foreground">WhatsApp Web carregando...</p>
              </div>
            </div>
          </TabsContent>

          {/* ── Aba 2: Controle de Mensagens ── */}
          <TabsContent value="mensagens" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Auto-Resposta</CardTitle>
                <CardDescription>Bot local responde automaticamente novas conversas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Ativar Auto-Resposta</Label>
                    <p className="text-sm text-muted-foreground">
                      Envia mensagem de boas-vindas para novos contatos
                    </p>
                  </div>
                  <Switch
                    checked={localSettings.autoReplyEnabled}
                    onCheckedChange={(checked) => setLocalSettings((prev: any) => ({ ...prev, autoReplyEnabled: checked }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Mensagem de Boas-vindas</Label>
                  <textarea
                    className="w-full min-h-[120px] p-3 rounded-md border border-input bg-transparent text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
                    value={localSettings.autoReplyMessage}
                    onChange={(e) => setLocalSettings((prev: any) => ({ ...prev, autoReplyMessage: e.target.value }))}
                    placeholder="Olá! 👋 Bem-vindo ao nosso atendimento. Como posso ajudar?"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Atraso antes de responder</Label>
                  <Select
                    value={String(localSettings.autoReplyDelay)}
                    onValueChange={(v) => setLocalSettings((prev: any) => ({ ...prev, autoReplyDelay: parseInt(v) }))}
                  >
                    <SelectTrigger className="w-72"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1000">1 segundo</SelectItem>
                      <SelectItem value="3000">3 segundos — padrão</SelectItem>
                      <SelectItem value="5000">5 segundos</SelectItem>
                      <SelectItem value="10000">10 segundos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={handleSaveLocalSettings}>Salvar</Button>
              </CardContent>
            </Card>

          </TabsContent>

          {/* ── Aba 3: Configurações ── */}
          <TabsContent value="configuracoes" className="space-y-4">
            {/* Timings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Timings de Resposta
                </CardTitle>
                <CardDescription>Controle debounce e indicadores de presença do bot</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Mostrar "digitando..." / "gravando..."</Label>
                    <p className="text-sm text-muted-foreground">Desligado = resposta imediata sem indicador</p>
                  </div>
                  <Switch
                    checked={botSettings?.presence_enabled !== false}
                    onCheckedChange={(v) => updateBotSettingsMutation.mutate({ presence_enabled: v })}
                    disabled={loadingBotSettings || updateBotSettingsMutation.isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Duração indicador "digitando"</Label>
                  <Select
                    value={String(botSettings?.typing_duration_ms ?? 2500)}
                    onValueChange={(v) => updateBotSettingsMutation.mutate({ typing_duration_ms: parseInt(v) })}
                    disabled={loadingBotSettings || updateBotSettingsMutation.isPending || botSettings?.presence_enabled === false}
                  >
                    <SelectTrigger className="w-72"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1500">1.5s — bem rápido</SelectItem>
                      <SelectItem value="2500">2.5s — padrão</SelectItem>
                      <SelectItem value="5000">5s — normal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Debounce de Mensagens (buffer de acúmulo)</Label>
                  <Select
                    value={String(botSettings?.debounce_ms ?? 5000)}
                    onValueChange={(v) => updateBotSettingsMutation.mutate({ debounce_ms: parseInt(v) })}
                    disabled={loadingBotSettings || updateBotSettingsMutation.isPending}
                  >
                    <SelectTrigger className="w-72"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1500">1.5s — rápido</SelectItem>
                      <SelectItem value="3000">3s</SelectItem>
                      <SelectItem value="5000">5s — padrão</SelectItem>
                      <SelectItem value="8000">8s</SelectItem>
                      <SelectItem value="10000">10s — devagar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Followup após inatividade (minutos)</Label>
                  <Select
                    value={String(botSettings?.followup_minutes ?? 10)}
                    onValueChange={(v) => updateBotSettingsMutation.mutate({ followup_minutes: parseInt(v) })}
                    disabled={loadingBotSettings || updateBotSettingsMutation.isPending}
                  >
                    <SelectTrigger className="w-72"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 minutos</SelectItem>
                      <SelectItem value="10">10 minutos — padrão</SelectItem>
                      <SelectItem value="15">15 minutos</SelectItem>
                      <SelectItem value="30">30 minutos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Cancelamento automático (minutos)</Label>
                  <Select
                    value={String(botSettings?.cancel_minutes ?? 20)}
                    onValueChange={(v) => updateBotSettingsMutation.mutate({ cancel_minutes: parseInt(v) })}
                    disabled={loadingBotSettings || updateBotSettingsMutation.isPending}
                  >
                    <SelectTrigger className="w-72"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutos</SelectItem>
                      <SelectItem value="20">20 minutos — padrão</SelectItem>
                      <SelectItem value="30">30 minutos</SelectItem>
                      <SelectItem value="60">60 minutos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Impressão */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Printer className="h-5 w-5" />
                  Impressão Térmica
                </CardTitle>
                <CardDescription>Configure a impressora para recibos dos pedidos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Agente Ana Food Print</Label>
                    <Button variant="outline" size="sm" onClick={checkPrintAgentStatus} disabled={printAgentStatus.loading}>
                      {printAgentStatus.loading
                        ? <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        : <RefreshCw className="h-4 w-4 mr-1" />
                      }
                      Verificar
                    </Button>
                  </div>
                  <div className={`flex items-center gap-2 text-sm rounded-md px-3 py-2 ${
                    printAgentStatus.connected
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                      : printAgentStatus.error
                        ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
                        : 'bg-muted text-muted-foreground'
                  }`}>
                    {printAgentStatus.connected
                      ? <><CheckCircle2 className="h-4 w-4" /> {printAgentStatus.onlineCount} agente(s) conectado(s)</>
                      : printAgentStatus.error
                        ? <><AlertCircle className="h-4 w-4" /> {printAgentStatus.error}</>
                        : <><WifiOff className="h-4 w-4" /> Nenhum agente de impressão conectado</>
                    }
                  </div>
                  {printAgentStatus.devices.length > 0 && (
                    <div className="space-y-1">
                      {printAgentStatus.devices.map((dev: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-xs px-2 py-1 rounded bg-background border">
                          <span className="font-medium">{dev.device_name || 'Agente ' + (i + 1)}</span>
                          <span className={`px-2 py-0.5 rounded-full ${dev.status === 'online' ? 'bg-emerald-500/20 text-emerald-600' : 'bg-red-500/20 text-red-600'}`}>
                            {dev.status || 'offline'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Impressora Local (Fallback)</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">Usada quando o agente Ana Food Print não está disponível</p>
                    </div>
                    <Switch
                      checked={localSettings.enableLocalPrint !== false}
                      onCheckedChange={(checked) => setLocalSettings((prev: any) => ({ ...prev, enableLocalPrint: checked }))}
                    />
                  </div>

                  {localSettings.enableLocalPrint !== false && (
                    <div className="space-y-2 pl-1">
                      <Select
                        value={localSettings.printerName || ""}
                        onValueChange={(v) => setLocalSettings((prev: any) => ({ ...prev, printerName: v }))}
                      >
                        <SelectTrigger className="w-72">
                          <SelectValue placeholder="Impressora Padrão do Sistema" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Impressora Padrão</SelectItem>
                          {printers.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                        </SelectContent>
                      </Select>

                      <Button variant="outline" size="sm" onClick={handleTestPrint} disabled={testPrinting} className="flex items-center gap-2">
                        {testPrinting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                        Imprimir recibo de teste
                      </Button>
                    </div>
                  )}
                </div>

                <Button onClick={handleSaveLocalSettings}>Salvar</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </PageLayout>
    );
  }


  return (
    <PageLayout title="WhatsApp" subtitle="Configurações de integração">
      <Tabs defaultValue="bot" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="bot">
            <Bot className="h-4 w-4 mr-1" />
            Bot
          </TabsTrigger>
          <TabsTrigger value="welcome">Boas-vindas</TabsTrigger>
          <TabsTrigger value="status">Status</TabsTrigger>
        </TabsList>

        <TabsContent value="bot">
          <div className="space-y-4">
            {/* Comportamento do Agente — personalidade + regras */}
            {(() => {
              const activeSession = sessions.find((s) => s.is_active) ?? sessions[0];
              if (!activeSession) return (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground text-sm">
                    Crie uma sessão WhatsApp primeiro para configurar o comportamento do agente.
                  </CardContent>
                </Card>
              );
              return (
                <AgentBehaviorConfig
                  sessionId={activeSession.id}
                  agentName={activeSession.agent_name}
                  initialData={{
                    agent_personality: (activeSession as any).agent_personality ?? "amigavel",
                    behavior_rules: (activeSession as any).behavior_rules ?? [],
                  }}
                  onSave={(data) => saveAgentBehaviorMutation.mutate({ sessionId: activeSession.id, data })}
                  isSaving={saveAgentBehaviorMutation.isPending}
                />
              );
            })()}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Timings de Resposta
                </CardTitle>
                <CardDescription>
                  Controle os tempos de debounce e indicador "digitando"
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Switch ativar/desativar indicadores presença (digitando/gravando) */}
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <Label className="text-base">Mostrar "digitando..." / "gravando..."</Label>
                    <p className="text-sm text-muted-foreground">
                      Desligado = bot responde sem mostrar indicador (mais rápido).
                    </p>
                  </div>
                  <Switch
                    checked={botSettings?.presence_enabled !== false}
                    onCheckedChange={(v) => updateBotSettingsMutation.mutate({ presence_enabled: v })}
                    disabled={loadingBotSettings || updateBotSettingsMutation.isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Duração indicador "digitando" (texto)</Label>
                  <Select
                    value={String(botSettings?.typing_duration_ms ?? 2500)}
                    onValueChange={(v) => updateBotSettingsMutation.mutate({ typing_duration_ms: parseInt(v) })}
                    disabled={loadingBotSettings || updateBotSettingsMutation.isPending || botSettings?.presence_enabled === false}
                  >
                    <SelectTrigger className="w-72"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1500">1.5s — bem rápido</SelectItem>
                      <SelectItem value="2500">2.5s — padrão (rápido)</SelectItem>
                      <SelectItem value="5000">5s — normal</SelectItem>
                      <SelectItem value="8000">8s — devagar</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Tempo que "digitando..." aparece antes do envio. Menor = bot responde mais cedo.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Duração indicador "gravando" (áudio)</Label>
                  <Select
                    value={String(botSettings?.recording_duration_ms ?? 7500)}
                    onValueChange={(v) => updateBotSettingsMutation.mutate({ recording_duration_ms: parseInt(v) })}
                    disabled={loadingBotSettings || updateBotSettingsMutation.isPending || botSettings?.presence_enabled === false}
                  >
                    <SelectTrigger className="w-72"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3000">3s — bem rápido</SelectItem>
                      <SelectItem value="7500">7.5s — padrão (rápido)</SelectItem>
                      <SelectItem value="15000">15s — normal</SelectItem>
                      <SelectItem value="30000">30s — devagar</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Tempo que "gravando..." aparece. Áudio TTS leva ~5-10s, manter próximo disso.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Typing Debounce — aguardar antes de mostrar "digitando"</Label>
                  <Select
                    value={String(botSettings?.typing_debounce_ms ?? 1500)}
                    onValueChange={(v) => updateBotSettingsMutation.mutate({ typing_debounce_ms: parseInt(v) })}
                    disabled={loadingBotSettings || updateBotSettingsMutation.isPending || botSettings?.presence_enabled === false}
                  >
                    <SelectTrigger className="w-72">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="500">0.5s — instantâneo</SelectItem>
                      <SelectItem value="1000">1s</SelectItem>
                      <SelectItem value="1500">1.5s — padrão (rápido)</SelectItem>
                      <SelectItem value="3000">3s — normal</SelectItem>
                      <SelectItem value="5000">5s — devagar</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Tempo de silêncio antes de disparar "digitando". Reset se cliente envia outra msg.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Debounce de Mensagens — buffer de acúmulo</Label>
                  <Select
                    value={String(botSettings?.debounce_ms ?? 5000)}
                    onValueChange={(v) => updateBotSettingsMutation.mutate({ debounce_ms: parseInt(v) })}
                    disabled={loadingBotSettings || updateBotSettingsMutation.isPending || botSettings?.presence_enabled === false}
                  >
                    <SelectTrigger className="w-72">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1500">1.5s — bem rápido</SelectItem>
                      <SelectItem value="3000">3s — rápido</SelectItem>
                      <SelectItem value="5000">5s — padrão</SelectItem>
                      <SelectItem value="8000">8s</SelectItem>
                      <SelectItem value="10000">10s — devagar</SelectItem>
                      <SelectItem value="15000">15s — clientes que digitam devagar</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Tempo que aguarda por mais mensagens antes de processar tudo junto.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Followup & Cancelamento
                </CardTitle>
                <CardDescription>
                  Controle lembretes e cancelamento automático por inatividade
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Lembrete de Followup (minutos)</Label>
                  <Select
                    value={String(botSettings?.followup_minutes ?? 10)}
                    onValueChange={(v) => updateBotSettingsMutation.mutate({ followup_minutes: parseInt(v) })}
                    disabled={loadingBotSettings || updateBotSettingsMutation.isPending}
                  >
                    <SelectTrigger className="w-72">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 minutos</SelectItem>
                      <SelectItem value="10">10 minutos — padrão</SelectItem>
                      <SelectItem value="15">15 minutos</SelectItem>
                      <SelectItem value="20">20 minutos</SelectItem>
                      <SelectItem value="30">30 minutos</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Após X minutos sem resposta, envia mensagem "Oi! Ainda está por aí?"
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Cancelamento Automático (minutos)</Label>
                  <Select
                    value={String(botSettings?.cancel_minutes ?? 20)}
                    onValueChange={(v) => updateBotSettingsMutation.mutate({ cancel_minutes: parseInt(v) })}
                    disabled={loadingBotSettings || updateBotSettingsMutation.isPending}
                  >
                    <SelectTrigger className="w-72">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutos</SelectItem>
                      <SelectItem value="20">20 minutos — padrão</SelectItem>
                      <SelectItem value="30">30 minutos</SelectItem>
                      <SelectItem value="45">45 minutos</SelectItem>
                      <SelectItem value="60">60 minutos</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Após X minutos sem resposta, cancela atendimento e reseta sessão.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Auto-Retomada após Intervenção Humana (minutos)</Label>
                  <Select
                    value={String(botSettings?.human_takeover_resume_minutes ?? 15)}
                    onValueChange={(v) => updateBotSettingsMutation.mutate({ human_takeover_resume_minutes: parseInt(v) })}
                    disabled={loadingBotSettings || updateBotSettingsMutation.isPending}
                  >
                    <SelectTrigger className="w-72">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 minutos</SelectItem>
                      <SelectItem value="10">10 minutos</SelectItem>
                      <SelectItem value="15">15 minutos — padrão</SelectItem>
                      <SelectItem value="20">20 minutos</SelectItem>
                      <SelectItem value="30">30 minutos</SelectItem>
                      <SelectItem value="60">1 hora</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Quando operador envia mensagem no chat, agente pausa. Retoma automaticamente após X minutos de silêncio do operador.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Seção TTS — resposta por voz (gated por plano) */}
            <UpgradeGate feature="tts">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Mic className="h-4 w-4" />
                  Resposta por Voz (TTS)
                </CardTitle>
                <CardDescription>
                  Quando cliente enviar áudio, agente responde com mensagem de voz. Texto é salvo no histórico mas não enviado ao cliente.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Toggle TTS */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Ativar resposta por voz</Label>
                    <p className="text-sm text-muted-foreground">
                      Detecta automaticamente quando cliente envia áudio e responde no mesmo formato.
                    </p>
                  </div>
                  <Switch
                    checked={botSettings?.tts_enabled ?? false}
                    onCheckedChange={(checked) => updateBotSettingsMutation.mutate({ tts_enabled: checked })}
                    disabled={loadingBotSettings || updateBotSettingsMutation.isPending}
                  />
                </div>

                {/* Cards de seleção de voz + velocidade */}
                {botSettings?.tts_enabled && (
                  <div className="space-y-5">
                    {/* Velocidade */}
                    <div className="space-y-2">
                      <Label>Velocidade de resposta</Label>
                      <div className="flex gap-2">
                        {([
                          { id: 'fast',   label: 'Rápida',   desc: 'Ágil, direto ao ponto' },
                          { id: 'normal', label: 'Natural',  desc: 'Ritmo equilibrado' },
                          { id: 'slow',   label: 'Relaxada', desc: 'Calma e pausada' },
                        ] as { id: string; label: string; desc: string }[]).map(s => {
                          const isSelected = localSpeed === s.id;
                          return (
                            <button
                              key={s.id}
                              onClick={() => { setLocalSpeed(s.id); updateBotSettingsMutation.mutate({ tts_speed: s.id }); }}
                              className={`flex-1 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                                isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-muted/30'
                              }`}
                            >
                              <div className="font-medium text-sm">{s.label}</div>
                              <div className="text-xs text-muted-foreground mt-0.5">{s.desc}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Voz */}
                    <div className="space-y-2">
                      <Label>Voz do agente</Label>
                      <div className="space-y-2">
                        {([
                          // Chirp 3 HD — modelo generativo novo, entonação natural
                          { id: 'pt-BR-Chirp3-HD-Aoede',  label: 'Aoede',  desc: 'Feminina suave (caloroso)', badge: 'Recomendada' },
                          { id: 'pt-BR-Chirp3-HD-Kore',   label: 'Kore',   desc: 'Feminina firme' },
                          { id: 'pt-BR-Chirp3-HD-Leda',   label: 'Leda',   desc: 'Feminina jovem informal' },
                          { id: 'pt-BR-Chirp3-HD-Charon', label: 'Charon', desc: 'Masculino grave' },
                          { id: 'pt-BR-Chirp3-HD-Zephyr', label: 'Zephyr', desc: 'Leve (anúncios)' },
                          // Legado Neural2 — manter pra retro-compat
                          { id: 'pt-BR-Neural2-C',        label: 'Clara',  desc: 'Feminina Neural2 (legado)' },
                          { id: 'pt-BR-Neural2-B',        label: 'Bruno',  desc: 'Masculina Neural2 (legado)' },
                        ] as { id: string; label: string; desc: string; badge?: string }[]).map(v => {
                          const isSelected = (botSettings?.tts_voice ?? 'pt-BR-Chirp3-HD-Aoede') === v.id;
                          const isPlayingThis = isTesting === v.id;
                          const speed = localSpeed;
                          const STORAGE_URL = `https://jgdyklzrxygvwuhlnbat.supabase.co/storage/v1/object/public/voice-samples/${companyId}`;

                          return (
                            <div
                              key={v.id}
                              onClick={() => updateBotSettingsMutation.mutate({ tts_voice: v.id })}
                              className={`flex items-center justify-between px-4 py-3 rounded-lg border cursor-pointer transition-colors ${
                                isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-muted/30'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                  isSelected ? 'border-primary' : 'border-muted-foreground/40'
                                }`}>
                                  {isSelected && <div className="h-2 w-2 rounded-full bg-primary" />}
                                </div>
                                <div>
                                  <span className="font-medium text-sm">{v.label}</span>
                                  <span className="text-muted-foreground text-sm ml-2">{v.desc}</span>
                                  {v.badge && (
                                    <span className="ml-2 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{v.badge}</span>
                                  )}
                                </div>
                              </div>

                              {/* Play direto do Storage — para áudio anterior se houver */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Para áudio em execução (seja qual for)
                                  if (currentAudioRef.current) {
                                    currentAudioRef.current.pause();
                                    currentAudioRef.current.currentTime = 0;
                                    currentAudioRef.current = null;
                                  }
                                  // Se clicou no que já tocava → apenas parar
                                  if (isTesting === v.id) {
                                    setIsTesting(false);
                                    return;
                                  }
                                  setIsTesting(v.id as any);
                                  const audio = new Audio(`${STORAGE_URL}/${v.id}_${speed}.mp3`);
                                  currentAudioRef.current = audio;
                                  audio.onended = () => { currentAudioRef.current = null; setIsTesting(false); };
                                  audio.onerror = () => {
                                    currentAudioRef.current = null;
                                    setIsTesting(false);
                                    toast({ title: "Erro ao tocar áudio", variant: "destructive" });
                                  };
                                  audio.play().catch(() => { currentAudioRef.current = null; setIsTesting(false); });
                                }}
                                className="shrink-0"
                              >
                                {isPlayingThis
                                  ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Tocando...</>
                                  : <><Play className="h-4 w-4 mr-1" /> Ouvir</>
                                }
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Google Cloud TTS — vozes em português brasileiro nativo · Neural2: 1M chars/mês grátis
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
            </UpgradeGate>
          </div>
        </TabsContent>

        <TabsContent value="welcome">
          <WelcomeMessageEditor />
        </TabsContent>

        <TabsContent value="status">
          <WhatsAppStatusMessages />
        </TabsContent>
      </Tabs>

    </PageLayout>
  );
}