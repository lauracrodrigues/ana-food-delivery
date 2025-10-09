import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const statusMessages: Record<string, string> = {
  pending: '⏳ Seu pedido foi recebido e aguarda confirmação.',
  confirmed: '✅ Pedido confirmado! Estamos preparando tudo com carinho.',
  preparing: '👨‍🍳 Seu pedido está sendo preparado!',
  ready: '🎉 Pedido pronto! ',
  delivering: '🚴 Pedido saiu para entrega!',
  delivered: '✅ Pedido entregue! Bom apetite!',
  completed: '✅ Pedido finalizado. Obrigado!',
  cancelled: '❌ Pedido cancelado.',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { order_id, status } = await req.json();
    console.log(`📝 Atualizando status do pedido ${order_id} para ${status}`);

    // Atualizar status do pedido
    const { data: order, error } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', order_id)
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Status atualizado');

    // Buscar configuração do WhatsApp
    const { data: whatsappConfig } = await supabase
      .from('whatsapp_config')
      .select('*')
      .eq('company_id', order.company_id)
      .eq('config_type', 'session')
      .eq('is_active', true)
      .single();

    // Enviar notificação via WhatsApp
    if (whatsappConfig?.session_name && order.customer_phone) {
      try {
        const message = `*Pedido #${order.order_number}*\n\n${statusMessages[status] || 'Status atualizado!'}`;
        
        const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');
        const phoneNumber = order.customer_phone.replace(/\D/g, '');

        await fetch(`https://evo.anafood.vip/message/sendText/${whatsappConfig.session_name}`, {
          method: 'POST',
          headers: {
            'apikey': evolutionApiKey || '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            number: `55${phoneNumber}`,
            text: message,
          }),
        });

        console.log('📱 Notificação WhatsApp enviada');
      } catch (error) {
        console.error('❌ Erro ao enviar WhatsApp:', error);
      }
    }

    return new Response(
      JSON.stringify({ success: true, order }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Erro:', error);
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});