import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    console.log(`📝 Processando notificação WhatsApp para pedido ${order_id}, status: ${status}`);

    // Buscar dados do pedido
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single();

    if (error) throw error;

    console.log('✅ Pedido encontrado');

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
    const { data: statusMessageConfig } = await supabase
      .from('whatsapp_config')
      .select('*')
      .eq('company_id', order.company_id)
      .eq('config_type', 'status_message')
      .eq('status', status)
      .eq('is_active', true)
      .single();

    console.log(`📊 Status: ${status}, Config encontrada: ${!!statusMessageConfig}, is_active: ${statusMessageConfig?.is_active}`);

    // Enviar notificação via WhatsApp apenas se estiver habilitado e com mensagem configurada
    if (whatsappConfig?.session_name && order.customer_phone && statusMessageConfig?.message_template) {
      try {
        // Formatar lista de itens
        const items = order.items || [];
        const itemsList = items.map((item: any) => {
          const extrasText = item.extras?.length > 0 
            ? `\n  + ${item.extras.map((e: any) => e.name).join(', ')}` 
            : '';
          return `${item.quantity}x ${item.name} - R$ ${(item.price * item.quantity).toFixed(2).replace('.', ',')}${extrasText}`;
        }).join('\n');

        // Formatar valor total
        const totalFormatted = `R$ ${(order.total || 0).toFixed(2).replace('.', ',')}`;

        // Formatar endereço
        const deliveryAddress = order.address || 'Retirada no local';

        // Substituir variáveis no template
        let message = statusMessageConfig.message_template
          .replace(/{order_number}/g, order.order_number || order.id)
          .replace(/{order_items}/g, itemsList || 'Sem itens')
          .replace(/{order_total}/g, totalFormatted)
          .replace(/{estimated_time}/g, order.estimated_time ? `${order.estimated_time} minutos` : 'A definir')
          .replace(/{delivery_address}/g, deliveryAddress)
          .replace(/{cancellation_reason}/g, order.cancellation_reason || 'Não informado');

        console.log('📝 Mensagem personalizada:', message.substring(0, 100) + '...');
        
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
      const reasons = [];
      if (!whatsappConfig?.session_name) reasons.push('sem sessão WhatsApp');
      if (!order.customer_phone) reasons.push('sem telefone');
      if (!statusMessageConfig?.message_template) reasons.push('sem template de mensagem');
      console.log(`⚠️ WhatsApp não enviado. Motivo(s): ${reasons.join(', ')}`);
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