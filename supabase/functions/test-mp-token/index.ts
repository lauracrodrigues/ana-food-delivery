// Edge Function: test-mp-token
// POST { access_token } → valida token na API do MP server-side (evita CORS)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { access_token } = await req.json();
    if (!access_token) return json({ error: 'access_token obrigatório' }, 400);

    const res = await fetch('https://api.mercadopago.com/v1/payment_methods', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!res.ok) return json({ valid: false, error: 'Token inválido ou sem permissão' }, 200);

    return json({ valid: true }, 200);
  } catch (err: any) {
    return json({ valid: false, error: err?.message ?? 'Erro interno' }, 200);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
