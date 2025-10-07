import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, instanceName, sessionName, agentName, agentPrompt } = body;
    const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');

    if (!EVOLUTION_API_KEY) {
      throw new Error('EVOLUTION_API_KEY não configurada');
    }

    // Verificar status da conexão
    if (action === 'status') {
      console.log('Verificando status da instância:', instanceName);

      const response = await fetch(`https://evo.anafood.vip/instance/connectionState/${instanceName}`, {
        method: 'GET',
        headers: {
          'apikey': EVOLUTION_API_KEY,
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('Erro ao verificar status:', response.status, data);
        throw new Error(`Evolution API error: ${JSON.stringify(data)}`);
      }

      console.log('Status da instância:', data);

      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Obter QR Code para conectar
    if (action === 'connect') {
      console.log('Obtendo QR Code para:', instanceName);

      const response = await fetch(`https://evo.anafood.vip/instance/connect/${instanceName}`, {
        method: 'GET',
        headers: {
          'apikey': EVOLUTION_API_KEY,
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('Erro ao obter QR Code:', response.status, data);
        throw new Error(`Evolution API error: ${JSON.stringify(data)}`);
      }

      console.log('QR Code obtido com sucesso');

      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Deletar instância
    if (action === 'delete') {
      console.log('Deletando instância:', instanceName);

      const response = await fetch(`https://evo.anafood.vip/instance/delete/${instanceName}`, {
        method: 'DELETE',
        headers: {
          'apikey': EVOLUTION_API_KEY,
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('Erro ao deletar instância:', response.status, data);
        throw new Error(`Evolution API error: ${JSON.stringify(data)}`);
      }

      console.log('Instância deletada com sucesso');

      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar nova instância
    console.log('Comunicando com Evolution API:', { sessionName, agentName });

    const response = await fetch('https://evo.anafood.vip/instance/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
      },
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
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Erro da Evolution API:', response.status, data);
      throw new Error(`Evolution API error: ${JSON.stringify(data)}`);
    }

    console.log('Sessão criada com sucesso na Evolution API:', data);

    // Configurar webhook automaticamente após criação
    try {
      console.log('Configurando webhook para instância:', sessionName);
      
      const webhookResponse = await fetch(`https://evo.anafood.vip/instance/${sessionName}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY,
        },
        body: JSON.stringify({
          webhookEnabled: true,
          webhookEvents: ['MESSAGES_UPSERT'],
          webhookBase64: true
        }),
      });

      if (webhookResponse.ok) {
        console.log('Webhook configurado com sucesso para:', sessionName);
      } else {
        const webhookError = await webhookResponse.json();
        console.error('Erro ao configurar webhook:', webhookError);
      }
    } catch (webhookError) {
      console.error('Falha ao configurar webhook (não crítico):', webhookError);
    }

    // Atualizar Supabase com webhook_url
    try {
      const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        console.log('Atualizando webhook_url no Supabase para:', sessionName);
        
        const webhookUrl = `https://n8n.anafood.vip/webhook/${sessionName}`;
        
        const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_sessions?session_name=eq.${sessionName}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            webhook_url: webhookUrl
          }),
        });

        if (updateResponse.ok) {
          console.log('Webhook URL atualizado no Supabase:', webhookUrl);
        } else {
          const updateError = await updateResponse.text();
          console.error('Erro ao atualizar webhook_url no Supabase:', updateError);
        }
      }
    } catch (supabaseError) {
      console.error('Falha ao atualizar Supabase (não crítico):', supabaseError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data,
        message: 'Sessão criada e configurada com sucesso'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Erro no whatsapp-evolution:', error);
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
