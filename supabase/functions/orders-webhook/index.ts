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

    // Buscar configuração de numeração
    const { data: storeSettings } = await supabase
      .from('store_settings')
      .select('order_numbering_mode, order_numbering_reset_time')
      .eq('company_id', webhookData.company_id)
      .maybeSingle();

    const mode = storeSettings?.order_numbering_mode || 'sequential';
    const resetTime = storeSettings?.order_numbering_reset_time || '00:00';

    console.log(`📊 Modo de numeração: ${mode}, Hora de reset: ${resetTime}`);

    // Construir query base para buscar último pedido
    let query = supabase
      .from('orders')
      .select('order_number')
      .eq('company_id', webhookData.company_id)
      .order('created_at', { ascending: false })
      .limit(1);

    // Se modo diário, filtrar apenas pedidos do dia atual
    if (mode === 'daily') {
      const now = new Date();
      const [hours, minutes] = resetTime.split(':').map(Number);
      
      // Calcular início do dia baseado na hora de reset
      const resetDate = new Date(now);
      resetDate.setHours(hours, minutes, 0, 0);
      
      // Se ainda não passou a hora de reset, usar o dia anterior
      if (now < resetDate) {
        resetDate.setDate(resetDate.getDate() - 1);
      }
      
      console.log(`📅 Filtrando pedidos desde: ${resetDate.toISOString()}`);
      query = query.gte('created_at', resetDate.toISOString());
    }

    const { data: lastOrder } = await query.maybeSingle();

    const nextNumber = lastOrder?.order_number 
      ? String(parseInt(lastOrder.order_number) + 1).padStart(3, '0')
      : '001';

    console.log(`🔢 Próximo número de pedido: ${nextNumber}`);

    // Inserir pedido do WhatsApp com campos de endereço estruturados
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
        // Endereço estruturado
        address: webhookData.address || webhookData.street || '',
        address_number: webhookData.address_number || '',
        address_complement: webhookData.address_complement || '',
        neighborhood: webhookData.neighborhood || '',
        city: webhookData.city || '',
        state: webhookData.state || '',
        zip_code: webhookData.zip_code || '',
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
      .maybeSingle();

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
      .maybeSingle();

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

        // Formatar endereço completo
        const addressParts = [
          webhookData.address || webhookData.street,
          webhookData.address_number,
          webhookData.address_complement,
          webhookData.neighborhood,
          webhookData.city,
          webhookData.state
        ].filter(Boolean);
        const deliveryAddress = addressParts.length > 0 ? addressParts.join(', ') : 'Retirada no local';

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
