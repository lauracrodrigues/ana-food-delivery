// Edge Function: create-pix-payment
// POST { order_id, company_id, customer_name, customer_email?, total }
// Busca credenciais MP da empresa, cria pagamento PIX na API do MP
// Salva QR code na order e retorna dados para o frontend exibir

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MP_API = 'https://api.mercadopago.com';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { order_id, company_id, customer_name, customer_email, total } = await req.json();

    if (!order_id || !company_id || !total) {
      return json({ error: 'order_id, company_id e total são obrigatórios' }, 400);
    }

    // Busca credenciais MP ativas da empresa
    const { data: integration, error: intError } = await supabase
      .from('payment_integrations')
      .select('access_token, sandbox_mode')
      .eq('company_id', company_id)
      .eq('gateway', 'mercadopago')
      .eq('is_active', true)
      .single();

    if (intError || !integration) {
      return json({ error: 'Mercado Pago não configurado para esta empresa' }, 404);
    }

    const token = integration.access_token;

    // Monta payer — MP exige email válido; usa fallback se não informado
    const payerEmail = customer_email ?? `pedido_${order_id.slice(0, 8)}@anafood.vip`;
    const [firstName, ...rest] = (customer_name ?? 'Cliente').split(' ');
    const lastName = rest.join(' ') || 'AnaFood';

    // Cria pagamento PIX na API do Mercado Pago
    const mpRes = await fetch(`${MP_API}/v1/payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': order_id, // garante idempotência
      },
      body: JSON.stringify({
        transaction_amount: Number(total),
        description: `Pedido AnaFood #${order_id.slice(-6).toUpperCase()}`,
        payment_method_id: 'pix',
        payer: {
          email: payerEmail,
          first_name: firstName,
          last_name: lastName,
        },
        date_of_expiration: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // expira em 30min
        notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mp-webhook`,
        metadata: { order_id, company_id },
      }),
    });

    const mpData = await mpRes.json();

    if (!mpRes.ok) {
      console.error('MP API error:', JSON.stringify(mpData));
      return json({ error: mpData.message ?? 'Erro ao criar pagamento no Mercado Pago' }, 502);
    }

    const qrCode       = mpData.point_of_interaction?.transaction_data?.qr_code ?? null;
    const qrCodeBase64 = mpData.point_of_interaction?.transaction_data?.qr_code_base64 ?? null;
    const expiresAt    = mpData.date_of_expiration ?? null;
    const paymentId    = String(mpData.id);

    // Salva dados do PIX na order para polling posterior
    await supabase
      .from('orders')
      .update({
        payment_gateway:       'mercadopago',
        payment_external_id:   paymentId,
        payment_status:        'pending',
        payment_qr_code:       qrCode,
        payment_qr_code_base64: qrCodeBase64,
        payment_expires_at:    expiresAt,
      })
      .eq('id', order_id);

    return json({ payment_id: paymentId, qr_code: qrCode, qr_code_base64: qrCodeBase64, expires_at: expiresAt });

  } catch (err: any) {
    console.error('create-pix-payment error:', err);
    return json({ error: err?.message ?? 'Erro interno' }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
