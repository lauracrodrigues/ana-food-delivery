const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, instanceName, remoteJid, message, number } = await req.json();
    const apiKey = Deno.env.get('EVOLUTION_API_KEY');
    const baseUrl = Deno.env.get('EVOLUTION_API_URL') || 'https://evo.anafood.vip';

    if (!apiKey) {
      throw new Error('EVOLUTION_API_KEY not configured');
    }

    if (!instanceName) {
      throw new Error('Missing required parameter: instanceName');
    }

    let url: string;
    let body: Record<string, unknown> = {};

    switch (action) {
      case 'findChats':
        url = `${baseUrl}/chat/findChats/${instanceName}`;
        body = {};
        break;

      case 'findMessages':
        if (!remoteJid) throw new Error('Missing required parameter: remoteJid');
        url = `${baseUrl}/chat/findMessages/${instanceName}`;
        body = {
          where: {
            key: {
              remoteJid,
            },
          },
          limit: 100,
        };
        break;

      case 'sendText':
        if (!number || !message) throw new Error('Missing required parameters: number or message');
        url = `${baseUrl}/message/sendText/${instanceName}`;
        body = {
          number,
          text: message,
          options: {
            delay: 1200,
          },
        };
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log(`[whatsapp-chat] action=${action} url=${url}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[whatsapp-chat] Evolution API error:', data);
      
      if (response.status === 500 || response.status === 502) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'evolution_server_error',
            message: 'Servidor Evolution API indisponível. Tente novamente em alguns instantes.',
          }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(data.message || `Evolution API error: ${response.status}`);
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[whatsapp-chat] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
