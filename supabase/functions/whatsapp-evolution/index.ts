import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EVOLUTION_BASE_URL = 'https://evo.anafood.vip';

function handleEvolutionServerError(status: number, errorBody: string) {
  console.error(`[Evolution] 🔥 Server error ${status}:`, errorBody.substring(0, 500));
  return new Response(
    JSON.stringify({
      success: false,
      error: 'evolution_server_error',
      message: status === 502
        ? 'Servidor da Evolution API indisponível (502). Verifique se o serviço está online.'
        : 'Erro interno na Evolution API (500). O banco de dados pode estar com problemas.',
      statusCode: status,
    }),
    { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function fetchEvolution(url: string, apiKey: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'apikey': apiKey,
      ...(options.headers || {}),
    },
  });

  // Handle 500/502 specifically
  if (response.status === 500 || response.status === 502) {
    const errorBody = await response.text();
    return { response, serverError: true, errorBody, data: null };
  }

  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  return { response, serverError: false, errorBody: '', data };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, instanceName, sessionName, agentName, agentPrompt } = body;
    const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');

    console.log('[Evolution] 📥 Nova requisição:', { action, instanceName: instanceName || sessionName });

    if (!EVOLUTION_API_KEY) {
      console.error('[Evolution] ❌ EVOLUTION_API_KEY não configurada');
      throw new Error('EVOLUTION_API_KEY não configurada');
    }

    // Verificar status da conexão
    if (action === 'status') {
      console.log('[Evolution] 🔍 Verificando status da instância:', instanceName);

      const { response, serverError, errorBody, data } = await fetchEvolution(
        `${EVOLUTION_BASE_URL}/instance/connectionState/${instanceName}`,
        EVOLUTION_API_KEY
      );

      if (serverError) return handleEvolutionServerError(response.status, errorBody);

      if (!response.ok) {
        console.error('[Evolution] ❌ Erro ao verificar status:', response.status, data);
        
        if (response.status === 404) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'instance_not_found',
              message: `A instância "${instanceName}" não existe na Evolution API`,
              details: data
            }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        throw new Error(`Evolution API error: ${JSON.stringify(data)}`);
      }

      console.log('[Evolution] ✅ Status da instância:', data);
      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Obter QR Code para conectar
    if (action === 'connect') {
      console.log('[Evolution] 📲 Obtendo QR Code para:', instanceName);

      const { response, serverError, errorBody, data } = await fetchEvolution(
        `${EVOLUTION_BASE_URL}/instance/connect/${instanceName}`,
        EVOLUTION_API_KEY
      );

      if (serverError) return handleEvolutionServerError(response.status, errorBody);

      if (!response.ok) {
        console.error('[Evolution] ❌ Erro ao obter QR Code:', response.status, data);
        
        if (response.status === 404) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'instance_not_found',
              message: `A instância "${instanceName}" não existe. Tente criá-la primeiro.`,
              details: data
            }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        throw new Error(`Evolution API error: ${JSON.stringify(data)}`);
      }

      console.log('[Evolution] ✅ QR Code obtido com sucesso');
      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Deletar instância
    if (action === 'delete') {
      console.log('[Evolution] 🗑️ Deletando instância:', instanceName);

      const { response, serverError, errorBody, data } = await fetchEvolution(
        `${EVOLUTION_BASE_URL}/instance/delete/${instanceName}`,
        EVOLUTION_API_KEY,
        { method: 'DELETE' }
      );

      if (serverError) return handleEvolutionServerError(response.status, errorBody);

      if (!response.ok) {
        console.error('[Evolution] ❌ Erro ao deletar instância:', response.status, data);
        
        if (response.status === 404) {
          console.log('[Evolution] ℹ️ Instância não existe, considerando como deletada');
          return new Response(
            JSON.stringify({ success: true, message: 'Instância não existe ou já foi deletada' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        throw new Error(`Evolution API error: ${JSON.stringify(data)}`);
      }

      console.log('[Evolution] ✅ Instância deletada com sucesso');
      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar nova instância
    console.log('[Evolution] 🆕 Criando nova instância:', { sessionName, agentName });

    const { response, serverError, errorBody, data } = await fetchEvolution(
      `${EVOLUTION_BASE_URL}/instance/create`,
      EVOLUTION_API_KEY,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceName: sessionName,
          token: EVOLUTION_API_KEY,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
          rejectCall: false,
          msgCall: '',
          groupsIgnore: true,
          alwaysOnline: false,
          readMessages: false,
          readStatus: false,
          syncFullHistory: false
        }),
      }
    );

    if (serverError) return handleEvolutionServerError(response.status, errorBody);

    if (!response.ok) {
      console.error('[Evolution] ❌ Erro ao criar instância:', response.status, data);
      throw new Error(`Evolution API error: ${JSON.stringify(data)}`);
    }

    console.log('[Evolution] ✅ Instância criada com sucesso:', data);

    // Configurar webhook automaticamente após criação
    try {
      console.log('[Evolution] ⚙️ Configurando webhook para instância:', sessionName);
      
      const webhookUrl = `https://n8n.anafood.vip/webhook/${sessionName}`;
      
      const webhookResult = await fetchEvolution(
        `${EVOLUTION_BASE_URL}/webhook/set/${sessionName}`,
        EVOLUTION_API_KEY,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: webhookUrl,
            webhook_by_events: false,
            webhook_base64: true,
            events: ['MESSAGES_UPSERT']
          }),
        }
      );

      if (webhookResult.response.ok) {
        console.log('[Evolution] ✅ Webhook configurado com sucesso para:', sessionName);
      } else {
        console.error('[Evolution] ⚠️ Erro ao configurar webhook:', webhookResult.data);
      }
    } catch (webhookError) {
      console.error('[Evolution] ⚠️ Falha ao configurar webhook (não crítico):', webhookError);
    }

    // Atualizar Supabase com webhook_url
    try {
      const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        console.log('[Evolution] 💾 Atualizando webhook_url no Supabase para:', sessionName);
        
        const webhookUrl = `https://n8n.anafood.vip/webhook/${sessionName}`;
        
        const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_config?session_name=eq.${sessionName}&config_type=eq.session`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ webhook_url: webhookUrl }),
        });

        if (updateResponse.ok) {
          console.log('[Evolution] ✅ Webhook URL atualizado no Supabase:', webhookUrl);
        } else {
          const updateError = await updateResponse.text();
          console.error('[Evolution] ⚠️ Erro ao atualizar webhook_url no Supabase:', updateError);
        }
      }
    } catch (supabaseError) {
      console.error('[Evolution] ⚠️ Falha ao atualizar Supabase (não crítico):', supabaseError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data,
        message: 'Sessão criada e configurada com sucesso'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Evolution] ❌ Erro no whatsapp-evolution:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
