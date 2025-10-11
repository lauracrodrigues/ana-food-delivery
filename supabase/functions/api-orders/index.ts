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
    // 1. Validar API Token
    const apiToken = Deno.env.get('API_TOKEN');
    if (!apiToken) {
      throw new Error('API_TOKEN não configurado');
    }

    // 2. Extrair e validar JWT do usuário
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Token de autenticação não fornecido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // 3. Inicializar Supabase com o token do usuário
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // 4. Verificar autenticação do usuário
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Token inválido ou expirado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ Usuário autenticado: ${user.email}`);

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

    // Verificar se usuário pertence à empresa
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!profile || profile.company_id !== companyId) {
      return new Response(
        JSON.stringify({ error: 'Acesso negado à empresa' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
        const body: OrderRequest = await req.json();
        
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

        // Verificar se usuário pode criar pedido nesta empresa
        if (profile.company_id !== orderData.company_id) {
          return new Response(
            JSON.stringify({ error: 'Acesso negado para criar pedido nesta empresa' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
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

        // Enviar confirmação via WhatsApp se configurado
        if (whatsappConfig?.session_name && orderData.customer_phone) {
          try {
            const message = `🎉 *Pedido Confirmado!*\n\nNúmero: #${nextNumber}\nTotal: R$ ${orderData.total}\n\nSeu pedido foi recebido e está sendo preparado! ⏱️`;
            
            const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');
            let phoneNumber = orderData.customer_phone.replace(/\D/g, '');
            
            if (phoneNumber.startsWith('55')) {
              phoneNumber = phoneNumber.substring(2);
            }

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
