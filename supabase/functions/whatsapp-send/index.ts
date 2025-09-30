const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { instanceName, number, message } = await req.json();
    const apiKey = Deno.env.get('EVOLUTION_API_KEY');

    if (!apiKey) {
      throw new Error('EVOLUTION_API_KEY not configured');
    }

    if (!instanceName || !number || !message) {
      throw new Error('Missing required parameters: instanceName, number, or message');
    }

    console.log(`Sending message via instance: ${instanceName} to number: ${number}`);

    // URL correta da Evolution API
    const evolutionUrl = `https://evo.anafood.vip/message/sendText/${instanceName}`;
    
    console.log(`Sending request to: ${evolutionUrl}`);

    // Enviar mensagem via Evolution API
    const response = await fetch(evolutionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
      body: JSON.stringify({
        number: number,
        text: message,
        options: {
          delay: 1200,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Evolution API error:', data);
      throw new Error(data.message || 'Failed to send message');
    }

    console.log('Message sent successfully:', data);

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in whatsapp-send:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send message' 
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});