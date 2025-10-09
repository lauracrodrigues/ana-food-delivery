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

    const orderData = await req.json();
    console.log('📦 Novo pedido recebido:', orderData);

    // Gerar número do pedido
    const { data: lastOrder } = await supabase
      .from('orders')
      .select('order_number')
      .eq('company_id', orderData.company_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const nextNumber = lastOrder?.order_number 
      ? String(parseInt(lastOrder.order_number) + 1).padStart(3, '0')
      : '001';

    // Inserir pedido
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        company_id: orderData.company_id,
        customer_name: orderData.customer_name,
        customer_phone: orderData.customer_phone,
        total: orderData.total,
        items: orderData.items,
        status: orderData.status || 'pending',
        order_number: nextNumber,
        delivery_fee: orderData.delivery_fee || 0,
        payment_method: orderData.payment_method || 'dinheiro',
        type: orderData.type || 'delivery',
        address: orderData.address || '',
        observations: orderData.observations || '',
        estimated_time: orderData.estimated_time || 30,
      })
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Pedido criado:', order.id);

    // Buscar configuração do WhatsApp
    const { data: whatsappConfig } = await supabase
      .from('whatsapp_config')
      .select('*')
      .eq('company_id', orderData.company_id)
      .eq('config_type', 'session')
      .eq('is_active', true)
      .single();

    // Enviar confirmação via WhatsApp se configurado
    if (whatsappConfig?.session_name && orderData.customer_phone) {
      try {
        const message = `🎉 *Pedido Confirmado!*\n\nNúmero: #${nextNumber}\nTotal: R$ ${orderData.total}\n\nSeu pedido foi recebido e está sendo preparado! ⏱️`;
        
        const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');
        const phoneNumber = orderData.customer_phone.replace(/\D/g, '');

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

        console.log('📱 Mensagem WhatsApp enviada');
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