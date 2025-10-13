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
    const { data: whatsappConfig, error: configError } = await supabase
      .from('whatsapp_config')
      .select('*')
      .eq('company_id', order.company_id)
      .eq('config_type', 'session')
      .eq('is_active', true)
      .single();

    console.log('📱 Config WhatsApp:', whatsappConfig ? 'Encontrada' : 'Não encontrada');
    if (configError) console.log('⚠️ Erro ao buscar config:', configError);

    // Buscar configuração de mensagens de status
    const { data: statusMessageConfigs } = await supabase
      .from('whatsapp_config')
      .select('*')
      .eq('company_id', order.company_id)
      .eq('config_type', 'status_message');

    // Verificar se o envio está habilitado para este status
    const statusConfig = statusMessageConfigs?.find(config => config.status === status);
    // Envia APENAS se a configuração existir E estiver explicitamente ativa
    const shouldSendMessage = statusConfig?.is_active === true;

    console.log(`📊 Status: ${status}, Config encontrada: ${!!statusConfig}, is_active: ${statusConfig?.is_active}, Envio habilitado: ${shouldSendMessage}`);

    // Enviar notificação via WhatsApp apenas se estiver habilitado
    if (whatsappConfig?.session_name && order.customer_phone && shouldSendMessage) {
      try {
        const message = `*Pedido #${order.order_number}*\n\n${statusMessages[status] || 'Status atualizado!'}`;
        
        const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');
        let phoneNumber = order.customer_phone.replace(/\D/g, '');
        
        // Remove o prefixo 55 se já existir
        if (phoneNumber.startsWith('55')) {
          phoneNumber = phoneNumber.substring(2);
        }
        
        console.log('📱 Telefone formatado:', phoneNumber, '-> 55' + phoneNumber);

        const response = await fetch(`https://evo.anafood.vip/message/sendText/${whatsappConfig.session_name}`, {
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

        const responseData = await response.text();
        console.log('📱 Notificação WhatsApp enviada. Resposta:', responseData);
      } catch (error) {
        console.error('❌ Erro ao enviar WhatsApp:', error);
      }
    } else {
      console.log('⚠️ WhatsApp não enviado. Config:', !!whatsappConfig, 'Session:', whatsappConfig?.session_name, 'Phone:', order.customer_phone);
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