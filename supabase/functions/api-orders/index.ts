import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrderRequest {
  action: 'list' | 'update_status' | 'delete' | 'create';
  order_id?: string;
  status?: string;
  order?: any;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Detectar se veio do API Gateway
    const isGatewayRequest = req.headers.get('X-Gateway') === 'cloudflare-worker';
    const requestId = req.headers.get('X-Request-ID');

    if (isGatewayRequest) {
      console.log(`🌐 Requisição via Gateway - ID: ${requestId}`);
    }

    // 2. Obter tokens
    const apiToken = Deno.env.get('API_TOKEN');
    if (!apiToken) {
      throw new Error('API_TOKEN não configurado');
    }

    const authHeader = req.headers.get('Authorization');
    const providedToken = req.headers.get('X-API-Token');

    // 3. Inicializar Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    let userId: string | null = null;
    let userEmail: string | null = null;
    let supabase;

    // 4. Validar autenticação (JWT ou API Token)
    if (providedToken) {
      // Requisição com API Token (externa via Gateway)
      if (providedToken !== apiToken) {
        console.error("❌ API Token inválido");
        return new Response(
          JSON.stringify({ error: "API Token inválido" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log("✅ API Token válido" + (isGatewayRequest ? " (via Gateway)" : ""));
      
      // Usar service role client para requisições públicas
      supabase = createClient(supabaseUrl, supabaseServiceKey);
      
    } else {
      // Requisição com JWT (interna)
      if (!authHeader) {
        console.error("❌ Sem autenticação");
        return new Response(
          JSON.stringify({ error: "Autenticação necessária: forneça Authorization header (JWT) ou X-API-Token" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const token = authHeader.replace("Bearer ", "");
      
      supabase = createClient(supabaseUrl, supabaseKey, {
        global: {
          headers: { Authorization: authHeader },
        },
      });

      // Validar JWT
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        console.error("❌ JWT inválido:", authError);
        return new Response(
          JSON.stringify({ error: "Token JWT inválido" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      userId = user.id;
      userEmail = user.email || null;
      console.log(`✅ Usuário autenticado: ${userEmail}` + (isGatewayRequest ? " (via Gateway)" : ""));
    }

    // 5. Processar requisição
    const body = req.method === 'POST' ? await req.json() : {};
    const url = new URL(req.url);
    const action = body.action || url.searchParams.get('action') || 'list';
    const companyId = body.company_id || url.searchParams.get('company_id');

    if (!companyId) {
      return new Response(
        JSON.stringify({ error: 'company_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar acesso à empresa (apenas se autenticado com JWT)
    if (userId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', userId)
        .single();

      if (!profile || profile.company_id !== companyId) {
        return new Response(
          JSON.stringify({ error: 'Acesso negado à empresa' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 6. Executar ação
    switch (action) {
      case 'list': {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        return new Response(
          JSON.stringify({ data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update_status': {
        if (!body.order_id || !body.status) {
          return new Response(
            JSON.stringify({ error: 'order_id e status são obrigatórios' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data, error } = await supabase
          .from('orders')
          .update({ status: body.status, updated_at: new Date().toISOString() })
          .eq('id', body.order_id)
          .eq('company_id', companyId)
          .select()
          .single();

        if (error) throw error;

        // Chamar orders-status para enviar notificação WhatsApp
        try {
          console.log(`📱 Chamando orders-status para pedido ${body.order_id}`);
          const statusResponse = await supabase.functions.invoke('orders-status', {
            body: { 
              order_id: body.order_id, 
              status: body.status 
            }
          });
          
          if (statusResponse.error) {
            console.error('⚠️ Erro ao chamar orders-status:', statusResponse.error);
          } else {
            console.log('✅ orders-status chamado com sucesso');
          }
        } catch (statusError) {
          console.error('⚠️ Erro ao enviar notificação WhatsApp:', statusError);
          // Não falhar a requisição por causa da notificação
        }

        return new Response(
          JSON.stringify({ data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete': {
        const body: OrderRequest = await req.json();
        
        if (!body.order_id) {
          return new Response(
            JSON.stringify({ error: 'order_id é obrigatório' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error } = await supabase
          .from('orders')
          .delete()
          .eq('id', body.order_id)
          .eq('company_id', companyId);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'create': {
        const orderData = body.order;
        
        if (!orderData || !orderData.company_id) {
          return new Response(
            JSON.stringify({ error: 'Dados do pedido são obrigatórios' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verificar acesso à empresa (apenas se autenticado com JWT)
        if (userId) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('company_id')
            .eq('id', userId)
            .single();

          if (!profile || profile.company_id !== orderData.company_id) {
            return new Response(
              JSON.stringify({ error: 'Acesso negado para criar pedido nesta empresa' }),
              { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }

        console.log('📦 Novo pedido recebido:', orderData);

        // Gerar número do pedido usando service role
        const supabaseServiceRole = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        const { data: lastOrder } = await supabaseServiceRole
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
        const { data: order, error: orderError } = await supabaseServiceRole
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
            source: orderData.source || 'digital_menu',
          })
          .select()
          .single();

        if (orderError) throw orderError;

        console.log('✅ Pedido criado:', order.id);

        // Buscar configuração do WhatsApp
        const { data: whatsappConfig } = await supabaseServiceRole
          .from('whatsapp_config')
          .select('*')
          .eq('company_id', orderData.company_id)
          .eq('config_type', 'session')
          .eq('is_active', true)
          .single();

        // Buscar configuração de mensagem para status 'pending'
        const { data: statusMessageConfig } = await supabaseServiceRole
          .from('whatsapp_config')
          .select('*')
          .eq('company_id', orderData.company_id)
          .eq('config_type', 'status_message')
          .eq('status', 'pending')
          .eq('is_active', true)
          .single();

        console.log(`📊 Status: pending, Config encontrada: ${!!statusMessageConfig}, is_active: ${statusMessageConfig?.is_active}`);

        // Enviar confirmação via WhatsApp se configurado e com mensagem ativa
        if (whatsappConfig?.session_name && orderData.customer_phone && statusMessageConfig?.message_template) {
          try {
            // Formatar lista de itens
            const items = orderData.items || [];
            const itemsList = items.map((item: any) => {
              const extrasText = item.extras?.length > 0 
                ? `\n  + ${item.extras.map((e: any) => e.name).join(', ')}` 
                : '';
              return `${item.quantity}x ${item.name} - R$ ${(item.price * item.quantity).toFixed(2).replace('.', ',')}${extrasText}`;
            }).join('\n');

            // Formatar valor total
            const totalFormatted = `R$ ${(orderData.total || 0).toFixed(2).replace('.', ',')}`;

            // Formatar endereço
            const deliveryAddress = orderData.address || 'Retirada no local';

            // Substituir variáveis no template
            let message = statusMessageConfig.message_template
              .replace(/{order_number}/g, nextNumber)
              .replace(/{order_items}/g, itemsList || 'Sem itens')
              .replace(/{order_total}/g, totalFormatted)
              .replace(/{estimated_time}/g, orderData.estimated_time ? `${orderData.estimated_time} minutos` : 'A definir')
              .replace(/{delivery_address}/g, deliveryAddress);

            console.log('📝 Mensagem personalizada:', message.substring(0, 100) + '...');
            
            const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');
            let phoneNumber = orderData.customer_phone.replace(/\D/g, '');
            
            if (phoneNumber.startsWith('55')) {
              phoneNumber = phoneNumber.substring(2);
            }

            console.log('📱 Telefone formatado:', phoneNumber, '-> 55' + phoneNumber);

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
        } else {
          const reasons = [];
          if (!whatsappConfig?.session_name) reasons.push('sem sessão WhatsApp');
          if (!orderData.customer_phone) reasons.push('sem telefone');
          if (!statusMessageConfig?.message_template) reasons.push('sem template de mensagem para status pending');
          console.log(`⚠️ WhatsApp não enviado. Motivo(s): ${reasons.join(', ')}`);
        }

        return new Response(
          JSON.stringify({ success: true, order }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Ação inválida' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error('❌ Erro na API:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro interno do servidor' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
