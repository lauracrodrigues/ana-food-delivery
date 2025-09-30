import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Send, CheckCircle2, Star, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

interface WhatsAppSession {
  id: string;
  session_name: string;
  agent_name: string;
  connection_status?: 'open' | 'close' | 'connecting' | 'unknown';
}

interface WhatsAppTestMessageProps {
  sessions: WhatsAppSession[];
}

export function WhatsAppTestMessage({ sessions }: WhatsAppTestMessageProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSession, setSelectedSession] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);

  // Obter company_id do usuário
  useEffect(() => {
    const getCompanyId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user.id)
          .single();
        if (profile) {
          setCompanyId(profile.company_id);
        }
      }
    };
    getCompanyId();
  }, []);

  // Buscar configurações da loja
  const { data: storeSettings } = useQuery({
    queryKey: ['store-settings', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data, error } = await supabase
        .from('store_settings')
        .select('default_whatsapp_session')
        .eq('company_id', companyId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao buscar configurações:', error);
        return null;
      }
      return data;
    },
    enabled: !!companyId,
  });

  // Definir sessão padrão quando as configurações forem carregadas
  useEffect(() => {
    if (storeSettings?.default_whatsapp_session && !selectedSession) {
      const defaultSession = sessions.find(s => 
        s.session_name === storeSettings.default_whatsapp_session && 
        s.connection_status === 'open'
      );
      if (defaultSession) {
        setSelectedSession(defaultSession.session_name);
      }
    }
  }, [storeSettings, sessions, selectedSession]);

  // Mutation para salvar sessão padrão
  const saveDefaultSession = useMutation({
    mutationFn: async (sessionName: string) => {
      if (!companyId) throw new Error('Company ID não encontrado');
      
      const { error } = await supabase
        .from('store_settings')
        .upsert({
          company_id: companyId,
          default_whatsapp_session: sessionName,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-settings'] });
      toast({
        title: "Sessão padrão salva",
        description: "Esta sessão será selecionada automaticamente nos próximos testes.",
      });
    },
    onError: (error) => {
      console.error('Erro ao salvar sessão padrão:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a sessão padrão.",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = async () => {
    if (!selectedSession) {
      toast({
        title: "Erro",
        description: "Selecione uma sessão para enviar a mensagem.",
        variant: "destructive",
      });
      return;
    }

    if (!phoneNumber || !message) {
      toast({
        title: "Erro",
        description: "Preencha o número de telefone e a mensagem.",
        variant: "destructive",
      });
      return;
    }

    // Validar formato do número
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    if (cleanNumber.length < 10 || cleanNumber.length > 11) {
      toast({
        title: "Número inválido",
        description: "O número deve ter entre 10 e 11 dígitos.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    setShowSuccess(false);
    
    try {
      const response = await supabase.functions.invoke('whatsapp-send', {
        body: { 
          instanceName: selectedSession,
          number: `55${cleanNumber}`,
          message: message
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      // Mostrar animação de sucesso
      setShowSuccess(true);
      
      toast({
        title: "✅ Mensagem enviada com sucesso!",
        description: `Mensagem enviada para ${phoneNumber} via ${selectedSession}`,
        className: "bg-green-50 border-green-200",
      });

      // Limpar campos após envio bem-sucedido
      setMessage("");
      setPhoneNumber("");
      
      // Esconder animação após 3 segundos
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast({
        title: "❌ Erro ao enviar",
        description: error instanceof Error ? error.message : "Não foi possível enviar a mensagem.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const connectedSessions = sessions.filter(s => s.connection_status === 'open');

  return (
    <Card className={showSuccess ? "border-green-500 animate-pulse" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Teste de Envio
              {showSuccess && (
                <CheckCircle2 className="h-5 w-5 text-green-500 animate-scale-in" />
              )}
            </CardTitle>
            <CardDescription>
              Envie uma mensagem de teste pelo WhatsApp
            </CardDescription>
          </div>
          {selectedSession && storeSettings?.default_whatsapp_session === selectedSession && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Star className="h-3 w-3" />
              Padrão
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mensagem de sucesso animada */}
        {showSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 animate-fade-in">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              <p className="font-medium">Mensagem enviada com sucesso!</p>
            </div>
            <p className="text-sm text-green-600 mt-1">
              Verifique o WhatsApp do destinatário para confirmar o recebimento.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="session">Sessão</Label>
            {selectedSession && selectedSession !== storeSettings?.default_whatsapp_session && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => saveDefaultSession.mutate(selectedSession)}
                disabled={saveDefaultSession.isPending}
                className="text-xs"
              >
                {saveDefaultSession.isPending ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Star className="h-3 w-3 mr-1" />
                )}
                Definir como padrão
              </Button>
            )}
          </div>
          <Select value={selectedSession} onValueChange={setSelectedSession}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma sessão conectada" />
            </SelectTrigger>
            <SelectContent>
              {connectedSessions.length === 0 ? (
                <SelectItem value="none" disabled>Nenhuma sessão conectada</SelectItem>
              ) : (
                connectedSessions.map((session) => (
                  <SelectItem key={session.id} value={session.session_name}>
                    <div className="flex items-center gap-2">
                      {session.session_name}
                      {storeSettings?.default_whatsapp_session === session.session_name && (
                        <Badge variant="outline" className="text-xs">
                          Padrão
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="phone">Número do WhatsApp</Label>
          <Input
            id="phone"
            placeholder="Ex: 11999998888"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            disabled={!selectedSession || isSending}
            className={showSuccess ? "border-green-400" : ""}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="message">Mensagem</Label>
          <Textarea
            id="message"
            placeholder="Digite sua mensagem de teste..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            disabled={!selectedSession || isSending}
            className={showSuccess ? "border-green-400" : ""}
          />
        </div>

        <Button 
          onClick={handleSendMessage} 
          disabled={!selectedSession || isSending || !phoneNumber || !message}
          className="w-full relative overflow-hidden"
          variant={showSuccess ? "default" : "default"}
        >
          {isSending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Enviando mensagem...
            </>
          ) : showSuccess ? (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Mensagem Enviada!
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Enviar Mensagem
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}