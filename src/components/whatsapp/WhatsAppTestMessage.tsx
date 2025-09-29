import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const [selectedSession, setSelectedSession] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

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

      toast({
        title: "Mensagem enviada!",
        description: "A mensagem foi enviada com sucesso.",
      });

      // Limpar campos após envio bem-sucedido
      setMessage("");
      setPhoneNumber("");
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast({
        title: "Erro ao enviar",
        description: error instanceof Error ? error.message : "Não foi possível enviar a mensagem.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const connectedSessions = sessions.filter(s => s.connection_status === 'open');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Teste de Envio</CardTitle>
        <CardDescription>
          Envie uma mensagem de teste pelo WhatsApp
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="session">Sessão</Label>
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
                    {session.session_name}
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
          />
        </div>

        <Button 
          onClick={handleSendMessage} 
          disabled={!selectedSession || isSending || !phoneNumber || !message}
          className="w-full"
        >
          <Send className="h-4 w-4 mr-2" />
          {isSending ? "Enviando..." : "Enviar Mensagem"}
        </Button>
      </CardContent>
    </Card>
  );
}