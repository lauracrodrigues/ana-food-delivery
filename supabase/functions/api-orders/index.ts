import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-company-key',
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
    // Inicializar Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseServiceRole = createClient(supabaseUrl, supabaseServiceKey);
    
    let companyId: string | null = null;
    let userId: string | null = null;
    let authMethod: string = 'none';

    // ========================================
    // AUTENTICAÇÃO (3 métodos suportados)
    // ========================================
    
    // 1. Autenticação por X-Company-Key (CNPJ/CPF da empresa)
    const companyKey = req.headers.get('X-Company-Key');
    
    if (companyKey) {
      // Limpar formatação (remover pontos, barras, hífens)
      const cleanKey = companyKey.replace(/\D/g, '');
      
      if (!cleanKey) {
        return new Response(
          JSON.stringify({ error: 'X-Company-Key inválido' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Buscar empresa pelo CNPJ (limpo)
      const { data: company, error: companyError } = await supabaseServiceRole
        .from('companies')
        .select('id, name, cnpj')
        .eq('cnpj', cleanKey)
        .maybeSingle();
      
      if (companyError || !company) {
        console.error('❌ Empresa não encontrada para CNPJ:', cleanKey);
        return new Response(
          JSON.stringify({ error: 'Empresa não encontrada. Verifique o CNPJ/CPF.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      companyId = company.id;
      authMethod = 'company_key';
      console.log(`✅ Autenticado via X-Company-Key - Empresa: ${company.name}`);
    }
    
    // 2. Autenticação por X-API-Token (token global - legado)
    const providedToken = req.headers.get('X-API-Token');
    const apiToken = Deno.env.get('API_TOKEN');
    
    if (!companyId && providedToken) {
      if (!apiToken || providedToken !== apiToken) {
        console.error('❌ API Token inválido');
        return new Response(
          JSON.stringify({ error: 'API Token inválido' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      authMethod = 'api_token';
      console.log('✅ Autenticado via X-API-Token');
    }
    
    // 3. Autenticação por JWT (usuários logados)
    const authHeader = req.headers.get('Authorization');
    
    if (!companyId && !providedToken && authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const supabaseAuth = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: authHeader } },
      });
      
      const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
      
      if (authError || !user) {
        console.error('❌ JWT inválido:', authError);
        return new Response(
          JSON.stringify({ error: 'Token JWT inválido' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      userId = user.id;
      authMethod = 'jwt';
      
      // Buscar company_id do usuário
      const { data: profile } = await supabaseServiceRole
        .from('profiles')
        .select('company_id')
        .eq('id', userId)
        .single();
      
      if (profile?.company_id) {
        companyId = profile.company_id;
      }
      
      console.log(`✅ Autenticado via JWT - User: ${user.email}`);
    }
    
    // Nenhum método de autenticação fornecido
    if (!companyId && !providedToken && !authHeader) {
      return new Response(
        JSON.stringify({ 
          error: 'Autenticação necessária',
          methods: [
            'X-Company-Key: CNPJ ou CPF da empresa (recomendado)',
            'Authorization: Bearer <JWT>',
            'X-API-Token: Token global (legado)'
          ]
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================
    // PROCESSAR REQUISIÇÃO
    // ========================================
    
    const body = req.method === 'POST' ? await req.json() : {};
    const url = new URL(req.url);
    const action = body.action || url.searchParams.get('action') || 'list';
    
    // Para autenticação com API_TOKEN ou JWT, o company_id pode vir no body/query
    if (!companyId) {
      companyId = body.company_id || url.searchParams.get('company_id');
    }

    if (!companyId) {
      return new Response(
        JSON.stringify({ error: 'company_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar acesso à empresa (apenas se autenticado com JWT)
    if (userId && authMethod === 'jwt') {
      const { data: profile } = await supabaseServiceRole
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

    console.log(`📋 Action: ${action}, Company: ${companyId}, Auth: ${authMethod}`);

    // ========================================
    // EXECUTAR AÇÕES
    // ========================================
    
    switch (action) {
      case 'list': {
        const status = body.status || url.searchParams.get('status');
        const dateFrom = body.date_from || url.searchParams.get('date_from');
        const dateTo = body.date_to || url.searchParams.get('date_to');
        
        let query = supabaseServiceRole
          .from('orders')
          .select('*')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });
        
        if (status) query = query.eq('status', status);
        if (dateFrom) query = query.gte('created_at', dateFrom);
        if (dateTo) query = query.lte('created_at', dateTo);

        const { data, error } = await query;

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

        const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivering', 'completed', 'cancelled'];
        if (!validStatuses.includes(body.status)) {
          return new Response(
            JSON.stringify({ 
              error: 'Status inválido',
              valid_statuses: validStatuses
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data, error } = await supabaseServiceRole
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
          const supabaseAuth = createClient(supabaseUrl, supabaseKey);
          await supabaseAuth.functions.invoke('orders-status', {
            body: { order_id: body.order_id, status: body.status }
          });
          console.log('✅ orders-status chamado com sucesso');
        } catch (statusError) {
          console.error('⚠️ Erro ao enviar notificação WhatsApp:', statusError);
        }

        return new Response(
          JSON.stringify({ data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete': {
        if (!body.order_id) {
          return new Response(
            JSON.stringify({ error: 'order_id é obrigatório' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error } = await supabaseServiceRole
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
        const orderData = body.order || body;
        
        if (!orderData.customer_name) {
          return new Response(
            JSON.stringify({ error: 'customer_name é obrigatório' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('📦 Novo pedido recebido:', JSON.stringify(orderData).substring(0, 200));

        // Buscar configuração de numeração
        const { data: storeSettings } = await supabaseServiceRole
          .from('store_settings')
          .select('order_numbering_mode, order_numbering_reset_time')
          .eq('company_id', companyId)
          .maybeSingle();

        const mode = storeSettings?.order_numbering_mode || 'sequential';
        const resetTime = storeSettings?.order_numbering_reset_time || '00:00';

        console.log(`📊 Modo de numeração: ${mode}, Hora de reset: ${resetTime}`);

        // Construir query base para buscar último pedido
        let query = supabaseServiceRole
          .from('orders')
          .select('order_number')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(1);

        // Se modo diário, filtrar apenas pedidos do dia atual
        if (mode === 'daily') {
          const now = new Date();
          const [hours, minutes] = resetTime.split(':').map(Number);
          
          const resetDate = new Date(now);
          resetDate.setHours(hours, minutes, 0, 0);
          
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

        // Inserir pedido
        const { data: order, error: orderError } = await supabaseServiceRole
          .from('orders')
          .insert({
            company_id: companyId,
            customer_name: orderData.customer_name,
            customer_phone: orderData.customer_phone || '',
            total: orderData.total || 0,
            items: orderData.items || [],
            status: 'pending',
            order_number: nextNumber,
            delivery_fee: orderData.delivery_fee || 0,
            payment_method: orderData.payment_method || 'dinheiro',
            type: orderData.type || 'delivery',
            address: orderData.address || orderData.street || '',
            address_number: orderData.address_number || '',
            address_complement: orderData.address_complement || '',
            neighborhood: orderData.neighborhood || '',
            city: orderData.city || '',
            state: orderData.state || '',
            zip_code: orderData.zip_code || '',
            observations: orderData.observations || '',
            estimated_time: orderData.estimated_time || 30,
            source: orderData.source || 'api',
          })
          .select()
          .single();

        if (orderError) throw orderError;

        console.log('✅ Pedido criado:', order.id);

        // Enviar confirmação via WhatsApp
        await sendWhatsAppConfirmation(supabaseServiceRole, companyId, order, orderData, nextNumber);

        return new Response(
          JSON.stringify({ 
            success: true, 
            order: {
              id: order.id,
              order_number: order.order_number,
              status: order.status,
              customer_name: order.customer_name,
              total: order.total,
              created_at: order.created_at
            }
          }),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ 
            error: 'Ação inválida',
            valid_actions: ['create', 'list', 'update_status', 'delete']
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error('❌ Erro na API:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro interno do servidor' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ========================================
// FUNÇÃO AUXILIAR: Enviar WhatsApp
// ========================================

async function sendWhatsAppConfirmation(
  supabase: any, 
  companyId: string, 
  order: any, 
  orderData: any, 
  orderNumber: string
) {
  try {
    // Buscar configuração do WhatsApp
    const { data: whatsappConfig } = await supabase
      .from('whatsapp_config')
      .select('*')
      .eq('company_id', companyId)
      .eq('config_type', 'session')
      .eq('is_active', true)
      .maybeSingle();

    // Buscar configuração de mensagem para status 'pending'
    const { data: statusMessageConfig } = await supabase
      .from('whatsapp_config')
      .select('*')
      .eq('company_id', companyId)
      .eq('config_type', 'status_message')
      .eq('status', 'pending')
      .eq('is_active', true)
      .maybeSingle();

    if (!whatsappConfig?.session_name || !orderData.customer_phone || !statusMessageConfig?.message_template) {
      const reasons = [];
      if (!whatsappConfig?.session_name) reasons.push('sem sessão WhatsApp');
      if (!orderData.customer_phone) reasons.push('sem telefone');
      if (!statusMessageConfig?.message_template) reasons.push('sem template de mensagem');
      console.log(`⚠️ WhatsApp não enviado: ${reasons.join(', ')}`);
      return;
    }

    // Formatar lista de itens
    const items = orderData.items || [];
    const itemsList = items.map((item: any) => {
      const extrasText = item.extras?.length > 0 
        ? `\n  + ${item.extras.map((e: any) => e.name).join(', ')}` 
        : '';
      return `${item.quantity}x ${item.name} - R$ ${(item.price * item.quantity).toFixed(2).replace('.', ',')}${extrasText}`;
    }).join('\n');

    const totalFormatted = `R$ ${(orderData.total || 0).toFixed(2).replace('.', ',')}`;

    const addressParts = [
      orderData.address || orderData.street,
      orderData.address_number,
      orderData.address_complement,
      orderData.neighborhood,
      orderData.city,
      orderData.state
    ].filter(Boolean);
    const deliveryAddress = addressParts.length > 0 ? addressParts.join(', ') : 'Retirada no local';

    let message = statusMessageConfig.message_template
      .replace(/{order_number}/g, orderNumber)
      .replace(/{order_items}/g, itemsList || 'Sem itens')
      .replace(/{order_total}/g, totalFormatted)
      .replace(/{estimated_time}/g, orderData.estimated_time ? `${orderData.estimated_time} minutos` : 'A definir')
      .replace(/{delivery_address}/g, deliveryAddress);

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
