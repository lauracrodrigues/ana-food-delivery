// Hook centralizado para envio WhatsApp — substitui lógica duplicada em 6+ arquivos
// Tenta Evolution API (se sessão ativa); fallback: WhatsApp Web
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { useToast } from '@/hooks/use-toast';

interface SendOptions {
  phone: string;         // apenas dígitos, sem código de país
  message: string;
  countryCode?: string;  // default: '55' (Brasil)
}

export function useWhatsAppSend() {
  const { settings } = useStoreSettings();
  const { toast } = useToast();

  const send = useCallback(async ({ phone, message, countryCode = '55' }: SendOptions) => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone) {
      toast({ title: 'Telefone inválido', variant: 'destructive' });
      return false;
    }

    const fullNumber = `${countryCode}${cleanPhone}`;
    const session = settings?.default_whatsapp_session;

    if (session) {
      try {
        const { error } = await supabase.functions.invoke('whatsapp-send', {
          body: { instanceName: session, number: fullNumber, message },
        });
        if (error) throw error;
        toast({ title: 'Mensagem enviada via WhatsApp ✓' });
        return true;
      } catch {
        // Fallback para WhatsApp Web se Evolution falhar
        window.open(`https://wa.me/${fullNumber}?text=${encodeURIComponent(message)}`, '_blank');
        toast({ title: 'Abrindo WhatsApp Web...' });
        return true;
      }
    } else {
      // Sem sessão Evolution: abre WhatsApp Web direto
      window.open(`https://wa.me/${fullNumber}?text=${encodeURIComponent(message)}`, '_blank');
      toast({ title: 'Abrindo WhatsApp Web...' });
      return true;
    }
  }, [settings, toast]);

  const hasSession = !!settings?.default_whatsapp_session;

  return { send, hasSession };
}
