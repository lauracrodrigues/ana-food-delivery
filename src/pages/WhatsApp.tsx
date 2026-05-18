import { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Plus, Clock, Bot, Mic, Play, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WhatsAppSessionList } from "@/components/whatsapp/WhatsAppSessionList";
import { WhatsAppTestMessage } from "@/components/whatsapp/WhatsAppTestMessage";
import { WelcomeMessageEditor } from "@/components/whatsapp/WelcomeMessageEditor";
import { UpgradeGate } from "@/components/billing/UpgradeGate";
import { WhatsAppStatusMessages } from "@/components/whatsapp/WhatsAppStatusMessages";
import { WhatsAppSessionDialog } from "@/components/whatsapp/WhatsAppSessionDialog";
import { WhatsAppQRCodeDialog } from "@/components/whatsapp/WhatsAppQRCodeDialog";
import { AgentBehaviorConfig, type AgentBehaviorData } from "@/components/whatsapp/AgentBehaviorConfig";
import { ConfirmDeleteDialog } from "@/components/common/ConfirmDeleteDialog";

interface WhatsAppSession {
  id: string;
  session_name: string;
  agent_name: string;
  agent_prompt: string | null;
  is_active: boolean;
  created_at: string;
  connection_status?: 'open' | 'close' | 'connecting' | 'unknown';
}

interface SessionForm {
  session_name: string;
  agent_name: string;
  agent_prompt: string;
}

export default function WhatsApp() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<WhatsAppSession | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [qrCodeDialog, setQrCodeDialog] = useState<{ open: boolean; qrCode: string; sessionName: string }>({
    open: false,
    qrCode: '',
    sessionName: '',
  });
  const [loadingStatus, setLoadingStatus] = useState<Record<string, boolean>>({});
  const [isTesting, setIsTesting] = useState<string | false>(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  // estado local de velocidade — atualiza imediatamente sem esperar cache DB
  const [localSpeed, setLocalSpeed] = useState<string>('normal');
  
  const [formData, setFormData] = useState<SessionForm>({
    session_name: "",
    agent_name: "",
    agent_prompt: "",
  });

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
  const { data: sessions = [], isLoading, isError: sessionsLoadError } = useQuery({
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

  useEffect(() => {
    if (sessionsLoadError) {
      toast({
        title: "Erro ao carregar sessões",
        description: "Não foi possível buscar as sessões do WhatsApp.",
        variant: "destructive",
      });
    }
  }, [sessionsLoadError, toast]);

  // Auto-check status de todas sessões ao carregar — sem toast, silencioso
  const autoCheckedRef = useRef(false);
  useEffect(() => {
    if (!sessions.length || autoCheckedRef.current) return;
    autoCheckedRef.current = true;
    sessions.forEach(s => {
      checkConnectionStatus(s.session_name, true);
    });
  }, [sessions]); // eslint-disable-line react-hooks/exhaustive-deps

  // Add/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: SessionForm & { id?: string }) => {
      if (data.id) {
        // Update existing session
        const { error } = await supabase
          .from('whatsapp_config')
          .update({
            session_name: data.session_name,
            agent_name: data.agent_name,
            agent_prompt: data.agent_prompt || null,
          })
          .eq('id', data.id);

        if (error) throw error;
        return { isNew: false, data };
      } else {
        // Add new session
        const { error } = await supabase
          .from('whatsapp_config')
          .insert({ 
            company_id: companyId,
            config_type: 'session',
            session_name: data.session_name,
            agent_name: data.agent_name,
            agent_prompt: data.agent_prompt || null,
          });

        if (error) throw error;
        return { isNew: true, data };
      }
    },
    onSuccess: async ({ isNew, data }) => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-sessions"] });
      toast({
        title: editingSession ? "Sessão atualizada" : "Sessão adicionada",
        description: `A sessão foi ${editingSession ? 'atualizada' : 'adicionada'} com sucesso.`,
      });
      handleCloseDialog();

      // Comunicar com Evolution API apenas para novas sessões
      if (isNew) {
        try {
          const response = await supabase.functions.invoke('whatsapp-evolution', {
            body: {
              sessionName: data.session_name,
              agentName: data.agent_name,
              agentPrompt: data.agent_prompt || '',
            }
          });

          if (response.error) {
            console.error('Erro ao comunicar com Evolution API:', response.error);
            toast({
              title: "Atenção",
              description: "Sessão salva, mas houve erro ao comunicar com Evolution API.",
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error('Erro ao chamar edge function:', error);
          toast({
            title: "Aviso",
            description: "Sessão salva localmente, mas não foi possível registrar na Evolution API.",
            variant: "destructive",
          });
        }
      }
    },
    onError: () => {
      toast({
        title: `Erro ao ${editingSession ? 'atualizar' : 'adicionar'}`,
        description: `Não foi possível ${editingSession ? 'atualizar' : 'adicionar'} a sessão.`,
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Buscar o nome da sessão antes de deletar
      const session = sessions.find(s => s.id === id);
      
      // Deletar do banco de dados
      const { error } = await supabase
        .from('whatsapp_config')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Deletar da Evolution API
      if (session) {
        try {
          await supabase.functions.invoke('whatsapp-evolution', {
            body: { instanceName: session.session_name, action: 'delete' }
          });
        } catch (error) {
          console.error('Erro ao deletar da Evolution API:', error);
          // Continua mesmo se falhar na API
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-sessions"] });
      toast({
        title: "Sessão removida",
        description: "A sessão foi removida com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao remover",
        description: "Não foi possível remover a sessão.",
        variant: "destructive",
      });
    },
  });

  const handleOpenAddDialog = () => {
    setFormData({
      session_name: "",
      agent_name: "",
      agent_prompt: "",
    });
    setEditingSession(null);
    setIsAddDialogOpen(true);
  };

  const handleOpenEditDialog = (session: WhatsAppSession) => {
    setFormData({
      session_name: session.session_name,
      agent_name: session.agent_name,
      agent_prompt: session.agent_prompt || "",
    });
    setEditingSession(session);
    setIsAddDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsAddDialogOpen(false);
    setEditingSession(null);
    setFormData({
      session_name: "",
      agent_name: "",
      agent_prompt: "",
    });
  };

  const handleSave = () => {
    if (!formData.session_name.trim() || !formData.agent_name.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome da sessão e nome do agente são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    // Verificar duplicidade apenas ao criar nova sessão
    if (!editingSession) {
      const duplicateName = sessions.find(
        s => s.session_name.toLowerCase() === formData.session_name.trim().toLowerCase()
      );
      
      if (duplicateName) {
        toast({
          title: "Nome duplicado",
          description: "Já existe uma sessão com este nome. Por favor, escolha outro nome.",
          variant: "destructive",
        });
        return;
      }
    }

    if (editingSession) {
      saveMutation.mutate({ ...formData, id: editingSession.id });
    } else {
      saveMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
    setDeleteId(null);
  };

  // Controle de limite de chamadas
  const lastCheckRef = useRef<Record<string, number>>({});
  const MIN_CHECK_INTERVAL = 10000; // 10 segundos entre verificações

  // Verificar status da conexão com logs detalhados
  const checkConnectionStatus = async (sessionName: string, silent: boolean = false) => {
    console.log(`[WhatsApp] 🔍 Verificando status da instância: ${sessionName}`);
    const now = Date.now();
    const lastCheck = lastCheckRef.current[sessionName] || 0;
    
    // Verificar se já passou tempo suficiente desde a última verificação
    if (!silent && now - lastCheck < MIN_CHECK_INTERVAL) {
      const waitTime = Math.ceil((MIN_CHECK_INTERVAL - (now - lastCheck)) / 1000);
      console.log(`[WhatsApp] ⏳ Throttle ativo. Aguardar ${waitTime}s`);
      toast({
        title: "Aguarde",
        description: `Próxima verificação disponível em ${waitTime} segundos`,
        variant: "default",
      });
      return sessions.find(s => s.session_name === sessionName)?.connection_status || 'unknown';
    }

    setLoadingStatus(prev => ({ ...prev, [sessionName]: true }));
    lastCheckRef.current[sessionName] = now;
    
    try {
      console.log(`[WhatsApp] 📡 Enviando requisição de status para: ${sessionName}`);
      const response = await supabase.functions.invoke('whatsapp-evolution', {
        body: { instanceName: sessionName, action: 'status' }
      });

      console.log(`[WhatsApp] 📥 Resposta recebida:`, response);

      if (response.error) {
        console.error(`[WhatsApp] ❌ Erro na resposta:`, response.error);
        // Detectar erro do servidor Evolution
        const errData = response.error?.context || response.error;
        if (errData?.error === 'evolution_server_error') {
          throw new Error('Servidor da Evolution API indisponível. Verifique se o serviço está online.');
        }
        throw new Error(response.error.message || 'Erro ao verificar status');
      }

      if (response.data?.success) {
        const status = response.data.data.instance.state;
        console.log(`[WhatsApp] ✅ Status da instância ${sessionName}: ${status}`);
        
        // Atualizar o cache do React Query com o novo status
        const updatedSessions = sessions.map(s => 
          s.session_name === sessionName 
            ? { ...s, connection_status: status }
            : s
        );
        queryClient.setQueryData(["whatsapp-sessions", companyId], updatedSessions);
        
        if (!silent) {
          toast({
            title: "Status atualizado",
            description: `Status da sessão: ${status === 'open' ? 'Conectado' : status === 'close' ? 'Desconectado' : 'Conectando...'}`,
          });
        }
        
        return status;
      }
      
      console.warn(`[WhatsApp] ⚠️ Resposta sem sucesso:`, response.data);
      return 'unknown';
    } catch (error) {
      console.error(`[WhatsApp] ❌ Erro ao verificar status de ${sessionName}:`, error);
      if (!silent) {
        toast({
          title: "Erro ao verificar status",
          description: error instanceof Error ? error.message : "Não foi possível verificar o status da conexão",
          variant: "destructive",
        });
      }
      return 'unknown';
    } finally {
      setLoadingStatus(prev => ({ ...prev, [sessionName]: false }));
    }
  };

  // Verificar e recriar instância se necessário
  const ensureInstanceExists = async (sessionName: string) => {
    console.log(`[WhatsApp] 🔧 Verificando existência da instância: ${sessionName}`);
    
    try {
      // Primeiro verifica o status
      const response = await supabase.functions.invoke('whatsapp-evolution', {
        body: { instanceName: sessionName, action: 'status' }
      });

      console.log(`[WhatsApp] 📥 Resposta de verificação:`, response);

      // Se a instância não existe (404), tenta criar
      if (response.error || !response.data?.success) {
        console.warn(`[WhatsApp] ⚠️ Instância não existe, tentando criar: ${sessionName}`);
        
        const session = sessions.find(s => s.session_name === sessionName);
        if (!session) {
          throw new Error('Sessão não encontrada no banco de dados');
        }

        // Criar a instância na Evolution API
        const createResponse = await supabase.functions.invoke('whatsapp-evolution', {
          body: {
            sessionName: session.session_name,
            agentName: session.agent_name,
            agentPrompt: session.agent_prompt || '',
          }
        });

        console.log(`[WhatsApp] 📥 Resposta de criação:`, createResponse);

        if (createResponse.error) {
          throw new Error(createResponse.error.message || 'Erro ao criar instância');
        }

        console.log(`[WhatsApp] ✅ Instância criada com sucesso: ${sessionName}`);
        return true;
      }

      console.log(`[WhatsApp] ✅ Instância já existe: ${sessionName}`);
      return true;
    } catch (error: any) {
      console.error(`[WhatsApp] ❌ Erro ao verificar/criar instância ${sessionName}:`, error);
      // Detectar erro do servidor Evolution
      const errorContext = error?.context;
      if (errorContext?.error === 'evolution_server_error' || error?.message?.includes('evolution_server_error')) {
        throw new Error('Servidor da Evolution API está com problemas internos. Verifique se o serviço está online.');
      }
      throw error;
    }
  };

  // Conectar/Reconectar via QR Code com validação
  const handleConnect = async (sessionName: string) => {
    console.log(`[WhatsApp] 🔌 Iniciando conexão para: ${sessionName}`);
    
    try {
      toast({
        title: "Verificando instância",
        description: "Validando comunicação com Evolution API...",
      });

      // Primeiro, garantir que a instância existe
      console.log(`[WhatsApp] 🔧 Garantindo que instância existe: ${sessionName}`);
      await ensureInstanceExists(sessionName);

      toast({
        title: "Gerando QR Code",
        description: "Aguarde enquanto geramos o QR Code...",
      });

      console.log(`[WhatsApp] 📡 Solicitando QR Code para: ${sessionName}`);
      const response = await supabase.functions.invoke('whatsapp-evolution', {
        body: { instanceName: sessionName, action: 'connect' }
      });

      console.log(`[WhatsApp] 📥 Resposta do QR Code:`, response);

      if (response.error) {
        console.error(`[WhatsApp] ❌ Erro na resposta:`, response.error);
        throw new Error(response.error.message || 'Edge Function returned a non-2xx status code');
      }

      if (response.data?.success && response.data.data?.code) {
        console.log(`[WhatsApp] ✅ QR Code recebido com sucesso`);
        
        // Gerar imagem do QR Code a partir do código
        try {
          const qrCodeDataUrl = await QRCode.toDataURL(response.data.data.code, {
            width: 300,
            margin: 2,
          });
          
          console.log(`[WhatsApp] 🎨 QR Code renderizado com sucesso`);
          
          setQrCodeDialog({
            open: true,
            qrCode: qrCodeDataUrl,
            sessionName: sessionName,
          });

          // Iniciar polling do status da conexão
          const pollInterval = setInterval(async () => {
            const status = await checkConnectionStatus(sessionName, true);

            if (status === 'open') {
              clearInterval(pollInterval);
              clearTimeout(timeoutId);
              setQrCodeDialog({ open: false, qrCode: '', sessionName: '' });
              toast({
                title: "Conectado com sucesso!",
                description: "Sua sessão do WhatsApp está conectada.",
              });
              queryClient.invalidateQueries({ queryKey: ["whatsapp-sessions"] });
            } else if (status === 'close') {
              clearInterval(pollInterval);
              clearTimeout(timeoutId);
              toast({
                title: "Erro na conexão",
                description: "Não foi possível conectar. Verifique se o QR Code foi escaneado corretamente.",
                variant: "destructive",
              });
            }
          }, 3000);

          // Timeout após 2 minutos — limpa o poll se QR expirar
          const timeoutId = setTimeout(() => {
            clearInterval(pollInterval);
            setQrCodeDialog(prev => {
              if (prev.open) {
                toast({
                  title: "Tempo esgotado",
                  description: "O QR Code expirou. Por favor, tente novamente.",
                  variant: "destructive",
                });
              }
              return prev;
            });
          }, 120000);
        } catch (qrError) {
          console.error('[WhatsApp] ❌ Erro ao gerar QR Code:', qrError);
          throw new Error('Erro ao gerar imagem do QR Code');
        }
      } else {
        console.error(`[WhatsApp] ❌ QR Code não disponível na resposta`);
        throw new Error('QR Code não disponível');
      }
    } catch (error: any) {
      console.error('[WhatsApp] ❌ Erro ao conectar:', error);
      
      const errorMessage = error instanceof Error ? error.message : "Não foi possível gerar o QR Code.";
      const isServerError = errorMessage.includes('Evolution API') || errorMessage.includes('evolution_server_error');
      
      toast({
        title: isServerError ? "Servidor Evolution indisponível" : "Erro ao gerar QR Code",
        description: isServerError 
          ? "O servidor da Evolution API está fora do ar ou com problemas internos. Reinicie o serviço e tente novamente."
          : errorMessage,
        variant: "destructive",
      });
    }
  };

  // Botão "Nova Sessão" visível só se não há sessão ativa
  const hasActiveSession = sessions.some(s => s.is_active);

  return (
    <PageLayout title="WhatsApp" subtitle="Configurações de integração">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-6 w-6" />
        </div>
        {!hasActiveSession && (
          <Button onClick={handleOpenAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Sessão
          </Button>
        )}
      </div>

      <Tabs defaultValue="sessions" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="sessions">Sessões</TabsTrigger>
          <TabsTrigger value="bot">
            <Bot className="h-4 w-4 mr-1" />
            Bot
          </TabsTrigger>
          <TabsTrigger value="welcome">Boas-vindas</TabsTrigger>
          <TabsTrigger value="test">Teste</TabsTrigger>
          <TabsTrigger value="status">Status</TabsTrigger>
        </TabsList>

        <TabsContent value="sessions">
          <WhatsAppSessionList
            sessions={sessions}
            isLoading={isLoading}
            loadingStatus={loadingStatus}
            onAddNew={handleOpenAddDialog}
            onEdit={handleOpenEditDialog}
            onDelete={(id) => setDeleteId(id)}
            onConnect={handleConnect}
            onCheckStatus={checkConnectionStatus}
          />
        </TabsContent>

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

        <TabsContent value="test">
          <WhatsAppTestMessage sessions={sessions} />
        </TabsContent>

        <TabsContent value="status">
          <WhatsAppStatusMessages />
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <WhatsAppSessionDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        formData={formData}
        onFormChange={setFormData}
        onSave={handleSave}
        onCancel={handleCloseDialog}
        isEditing={!!editingSession}
      />

      <ConfirmDeleteDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Confirmar exclusão"
        description="Tem certeza que deseja remover esta sessão do WhatsApp? Esta ação não pode ser desfeita."
        confirmLabel="Remover"
        onConfirm={() => deleteId && handleDelete(deleteId)}
      />

      {/* QR Code Dialog */}
      <WhatsAppQRCodeDialog
        open={qrCodeDialog.open}
        qrCode={qrCodeDialog.qrCode}
        sessionName={qrCodeDialog.sessionName}
        onClose={() => setQrCodeDialog({ open: false, qrCode: '', sessionName: '' })}
        onRefresh={handleConnect}
      />
    </PageLayout>
  );
}