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
        source: 'whatsapp',
      })
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Pedido do WhatsApp criado:', order.id);

    // Buscar configuração do WhatsApp para confirmar
    const { data: whatsappConfig, error: configError } = await supabase
      .from('whatsapp_config')
      .select('*')
      .eq('company_id', webhookData.company_id)
      .eq('config_type', 'session')
      .eq('is_active', true)
      .single();

    console.log('📱 Config WhatsApp:', whatsappConfig ? 'Encontrada' : 'Não encontrada');
    if (configError) console.log('⚠️ Erro ao buscar config:', configError);

    // Buscar configuração de mensagem para status 'pending'
    const { data: statusMessageConfig } = await supabase
      .from('whatsapp_config')
      .select('*')
      .eq('company_id', webhookData.company_id)
      .eq('config_type', 'status_message')
      .eq('status', 'pending')
      .eq('is_active', true)
      .single();

    console.log(`📊 Status: pending, Config encontrada: ${!!statusMessageConfig}, is_active: ${statusMessageConfig?.is_active}`);

    // Enviar confirmação se configurado e com mensagem ativa
    if (whatsappConfig?.session_name && webhookData.customer_phone && statusMessageConfig?.message_template) {
      try {
        // Formatar lista de itens
        const items = webhookData.items || [];
        const itemsList = items.map((item: any) => {
          const extrasText = item.extras?.length > 0 
            ? `\n  + ${item.extras.map((e: any) => e.name).join(', ')}` 
            : '';
          return `${item.quantity}x ${item.name} - R$ ${(item.price * item.quantity).toFixed(2).replace('.', ',')}${extrasText}`;
        }).join('\n');

        // Formatar valor total
        const totalFormatted = `R$ ${(webhookData.total || 0).toFixed(2).replace('.', ',')}`;

        // Formatar endereço
        const deliveryAddress = webhookData.address || 'Retirada no local';

        // Substituir variáveis no template
        let message = statusMessageConfig.message_template
          .replace(/{order_number}/g, nextNumber)
          .replace(/{order_items}/g, itemsList || 'Sem itens')
          .replace(/{order_total}/g, totalFormatted)
          .replace(/{estimated_time}/g, webhookData.estimated_time ? `${webhookData.estimated_time} minutos` : 'A definir')
          .replace(/{delivery_address}/g, deliveryAddress);

        console.log('📝 Mensagem personalizada:', message.substring(0, 100) + '...');
        
        const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');
        let phoneNumber = webhookData.customer_phone.replace(/\D/g, '');
        
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
        console.log('📱 Confirmação WhatsApp enviada. Resposta:', responseData);
      } catch (error) {
        console.error('❌ Erro ao enviar WhatsApp:', error);
      }
    } else {
      const reasons = [];
      if (!whatsappConfig?.session_name) reasons.push('sem sessão WhatsApp');
      if (!webhookData.customer_phone) reasons.push('sem telefone');
      if (!statusMessageConfig?.message_template) reasons.push('sem template de mensagem para status pending');
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