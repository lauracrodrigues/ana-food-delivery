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

    const webhookData = await req.json();
    console.log('🎣 Webhook recebido do N8n:', webhookData);

    // Gerar número do pedido
    const { data: lastOrder } = await supabase
      .from('orders')
      .select('order_number')
      .eq('company_id', webhookData.company_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const nextNumber = lastOrder?.order_number 
      ? String(parseInt(lastOrder.order_number) + 1).padStart(3, '0')
      : '001';

    // Inserir pedido do WhatsApp
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        company_id: webhookData.company_id,
        customer_name: webhookData.customer_name,
        customer_phone: webhookData.customer_phone,
        total: webhookData.total,
        items: webhookData.items,
        status: webhookData.status || 'pending',
        order_number: nextNumber,
        delivery_fee: webhookData.delivery_fee || 0,
        payment_method: webhookData.payment_method || 'dinheiro',
        type: webhookData.type || 'delivery',
        address: webhookData.address || '',
        observations: webhookData.observations || 'Pedido via WhatsApp',
        estimated_time: webhookData.estimated_time || 30,
      })
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Pedido do WhatsApp criado:', order.id);

    // Buscar configuração do WhatsApp para confirmar
    const { data: whatsappConfig } = await supabase
      .from('whatsapp_config')
      .select('*')
      .eq('company_id', webhookData.company_id)
      .eq('config_type', 'session')
      .eq('is_active', true)
      .single();

    // Enviar confirmação
    if (whatsappConfig?.session_name && webhookData.customer_phone) {
      try {
        const message = `✅ *Pedido Recebido!*\n\nNúmero: #${nextNumber}\nTotal: R$ ${webhookData.total}\n\nObrigado! Seu pedido está sendo preparado! 🍕`;
        
        const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');
        const phoneNumber = webhookData.customer_phone.replace(/\D/g, '');

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

        console.log('📱 Confirmação WhatsApp enviada');
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