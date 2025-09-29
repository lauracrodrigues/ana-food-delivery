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
    const { sessionName, agentName, agentPrompt } = await req.json();
    const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');

    if (!EVOLUTION_API_KEY) {
      throw new Error('EVOLUTION_API_KEY não configurada');
    }

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

    return new Response(
      JSON.stringify({ 
        success: true, 
        data,
        message: 'Sessão criada com sucesso na Evolution API'
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
