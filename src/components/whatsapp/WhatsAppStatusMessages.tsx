import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Save } from "lucide-react";

interface StatusMessage {
  status: string;
  label: string;
  message: string;
  enabled: boolean;
}

export function WhatsAppStatusMessages() {
  const { toast } = useToast();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [statusMessages, setStatusMessages] = useState<StatusMessage[]>([
    { status: 'pending', label: 'Novo Pedido', message: '🔔 *Novo Pedido!*\n\nRecebemos seu pedido #{order_number}!\n\n📦 *Itens:*\n{order_items}\n\n💰 *Total:* R$ {order_total}\n\nEstamos preparando com carinho! 😊', enabled: true },
    { status: 'preparando', label: 'Preparando', message: '👨‍🍳 *Pedido em Preparação*\n\nSeu pedido #{order_number} está sendo preparado!\n\n⏱️ Tempo estimado: {estimated_time} minutos', enabled: true },
    { status: 'pronto', label: 'Pronto', message: '✅ *Pedido Pronto!*\n\nSeu pedido #{order_number} está pronto!\n\n🏃 Em breve sairá para entrega.', enabled: true },
    { status: 'em_entrega', label: 'Em Entrega', message: '🚴 *Saiu para Entrega!*\n\nSeu pedido #{order_number} está a caminho!\n\n📍 Endereço: {delivery_address}', enabled: true },
    { status: 'concluido', label: 'Concluído', message: '🎉 *Pedido Entregue!*\n\nObrigado pela preferência!\n\nEsperamos você novamente! ❤️', enabled: true },
    { status: 'cancelado', label: 'Cancelado', message: '❌ *Pedido Cancelado*\n\nSeu pedido #{order_number} foi cancelado.\n\nMotivo: {cancellation_reason}\n\nQualquer dúvida, estamos à disposição.', enabled: false },
  ]);
  const [isSaving, setIsSaving] = useState(false);

  // Load company info and messages
  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user.id)
          .single();
        
        if (profile?.company_id) {
          setCompanyId(profile.company_id);
          
          // Load existing messages - type-safe query
          const { data: messages, error } = await supabase
            .from('whatsapp_config')
            .select('*')
            .eq('company_id', profile.company_id)
            .eq('config_type', 'status_message');
          
          if (!error && messages && messages.length > 0) {
            const loadedMessages = statusMessages.map(sm => {
              const found = messages.find((m: any) => m.status === sm.status);
              if (found) {
                return {
                  ...sm,
                  message: found.message_template,
                  enabled: found.is_active
                };
              }
              return sm;
            });
            setStatusMessages(loadedMessages);
          }
        }
      }
    }
    loadData();
  }, []);

  const handleMessageChange = (status: string, message: string) => {
    setStatusMessages(prev => 
      prev.map(sm => sm.status === status ? { ...sm, message } : sm)
    );
  };

  const handleEnabledChange = (status: string, enabled: boolean) => {
    setStatusMessages(prev => 
      prev.map(sm => sm.status === status ? { ...sm, enabled } : sm)
    );
  };

  const handleSave = async () => {
    if (!companyId) {
      toast({
        title: "Erro",
        description: "ID da empresa não encontrado.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      // Upsert all messages
      for (const msg of statusMessages) {
        const { error } = await supabase
          .from('whatsapp_config')
          .upsert({
            company_id: companyId,
            config_type: 'status_message',
            status: msg.status,
            message_template: msg.message,
            is_active: msg.enabled,
          }, {
            onConflict: 'company_id,status,config_type'
          });

        if (error) throw error;
      }

      toast({
        title: "Configurações salvas!",
        description: "As mensagens de status foram atualizadas com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao salvar mensagens:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mensagens por Status</CardTitle>
        <CardDescription>
          Configure as mensagens automáticas para cada mudança de status do pedido
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {statusMessages.map((statusMsg) => (
          <div key={statusMsg.status} className="space-y-3 p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">{statusMsg.label}</Label>
              <div className="flex items-center gap-2">
                <Label htmlFor={`enabled-${statusMsg.status}`} className="text-sm">
                  Enviar notificação
                </Label>
                <Switch
                  id={`enabled-${statusMsg.status}`}
                  checked={statusMsg.enabled}
                  onCheckedChange={(checked) => handleEnabledChange(statusMsg.status, checked)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor={`msg-${statusMsg.status}`} className="text-sm text-muted-foreground">
                Mensagem (use variáveis: {'{order_number}'}, {'{order_items}'}, {'{order_total}'}, {'{estimated_time}'}, {'{delivery_address}'})
              </Label>
              <Textarea
                id={`msg-${statusMsg.status}`}
                value={statusMsg.message}
                onChange={(e) => handleMessageChange(statusMsg.status, e.target.value)}
                rows={5}
                disabled={!statusMsg.enabled}
                className="font-mono text-sm"
              />
            </div>
          </div>
        ))}

        <Button onClick={handleSave} disabled={isSaving} className="w-full">
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </CardContent>
    </Card>
  );
}