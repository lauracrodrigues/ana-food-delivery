import { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Plus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WhatsAppSessionList } from "@/components/whatsapp/WhatsAppSessionList";
import { WhatsAppTestMessage } from "@/components/whatsapp/WhatsAppTestMessage";
import { WhatsAppStatusMessages } from "@/components/whatsapp/WhatsAppStatusMessages";
import { WhatsAppSessionDialog } from "@/components/whatsapp/WhatsAppSessionDialog";
import { WhatsAppQRCodeDialog } from "@/components/whatsapp/WhatsAppQRCodeDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

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
  
  const [formData, setFormData] = useState<SessionForm>({
    session_name: "",
    agent_name: "",
    agent_prompt: "",
  });

  // Load company info
  useEffect(() => {
    async function loadCompany() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user.id)
          .single();
        
        if (profile?.company_id) {
          setCompanyId(profile.company_id);
        }
      }
    }
    loadCompany();
  }, []);

  // Load WhatsApp sessions with optimized caching
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["whatsapp-sessions", companyId],
    queryFn: async () => {
      console.log('[WhatsApp] 🔄 Carregando sessões para empresa:', companyId);
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('whatsapp_config')
        .select('*')
        .eq('company_id', companyId)
        .eq('config_type', 'session')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[WhatsApp] ❌ Erro ao carregar sessões:', error);
        throw error;
      }
      console.log('[WhatsApp] ✅ Sessões carregadas:', data?.length || 0);
      return data as WhatsAppSession[];
    },
    enabled: !!companyId,
    staleTime: 30000, // Cache por 30s
    gcTime: 60000, // Manter em cache por 1min
  });

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
          } else {
            console.log('Sucesso ao comunicar com Evolution API:', response.data);
          }
        } catch (error) {
          console.error('Erro ao chamar edge function:', error);
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
          console.log(`[WhatsApp] 🔄 Iniciando polling de status`);
          const pollInterval = setInterval(async () => {
            const status = await checkConnectionStatus(sessionName, true);
            console.log(`[WhatsApp] 📊 Status atual: ${status}`);
            
            if (status === 'open') {
              console.log(`[WhatsApp] ✅ Conexão estabelecida com sucesso!`);
              clearInterval(pollInterval);
              setQrCodeDialog({ open: false, qrCode: '', sessionName: '' });
              toast({
                title: "Conectado com sucesso!",
                description: "Sua sessão do WhatsApp está conectada.",
              });
              queryClient.invalidateQueries({ queryKey: ["whatsapp-sessions"] });
            } else if (status === 'close') {
              console.warn(`[WhatsApp] ⚠️ Conexão fechada`);
              clearInterval(pollInterval);
              toast({
                title: "Erro na conexão",
                description: "Não foi possível conectar. Verifique se o QR Code foi escaneado corretamente.",
                variant: "destructive",
              });
            }
          }, 3000); // Verifica a cada 3 segundos

          // Timeout após 2 minutos
          setTimeout(() => {
            clearInterval(pollInterval);
            if (qrCodeDialog.open) {
              console.warn(`[WhatsApp] ⏰ Timeout do QR Code`);
              toast({
                title: "Tempo esgotado",
                description: "O QR Code expirou. Por favor, tente novamente.",
                variant: "destructive",
              });
            }
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

  // Remover verificação em background - status será verificado apenas manualmente

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Aviso sobre limite de verificações */}
      <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Limite de verificações de status
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Para evitar sobrecarga na API, as verificações de status têm um intervalo mínimo de 10 segundos entre cada chamada.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Configurações WhatsApp</h1>
        </div>
        <Button onClick={handleOpenAddDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Sessão
        </Button>
      </div>

      <Tabs defaultValue="sessions" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sessions">Sessões</TabsTrigger>
          <TabsTrigger value="test">Teste de Envio</TabsTrigger>
          <TabsTrigger value="status">Mensagens de Status</TabsTrigger>
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

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover esta sessão do WhatsApp? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* QR Code Dialog */}
      <WhatsAppQRCodeDialog
        open={qrCodeDialog.open}
        qrCode={qrCodeDialog.qrCode}
        sessionName={qrCodeDialog.sessionName}
        onClose={() => setQrCodeDialog({ open: false, qrCode: '', sessionName: '' })}
        onRefresh={handleConnect}
      />
    </div>
  );
}