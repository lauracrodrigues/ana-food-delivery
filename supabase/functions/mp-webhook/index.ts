// Edge Function: mp-webhook v2.0.0 — validação HMAC obrigatória
// Secret vem de env (MP_WEBHOOK_SECRET) — nunca hardcoded
// Verifica assinatura ANTES de processar (rejeita forjados)
// Defense in depth: ainda consulta API MP com access_token pra confirmar status
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature, x-request-id',
};

const MP_API = 'https://api.mercadopago.com';

// Verifica assinatura HMAC-SHA256 do Mercado Pago.
// Secret obtido via Deno.env (configurado em Supabase Edge Functions secrets).
async function verifySignature(req: Request, body: string): Promise<boolean> {
  const secret = Deno.env.get('MP_WEBHOOK_SECRET');
  if (!secret) {
    console.error('mp-webhook.no_secret_env');
    return false; // sem secret, não confia
  }
  try {
    const xSignature = req.headers.get('x-signature');
    const xRequestId = req.headers.get('x-request-id');
    if (!xSignature) return false;

    // Extrai ts e v1 do header x-signature: "ts=1234,v1=abcdef"
    const parts = Object.fromEntries(xSignature.split(',').map(p => p.split('=')));
    const ts = parts['ts'];
    const v1 = parts['v1'];
    if (!ts || !v1) return false;

    // MP assina: "id:<data.id>;request-date:<ts>;" se tiver x-request-id
    // ou "id:<data.id>;ts:<ts>;"
    const parsed = JSON.parse(body);
    const dataId = parsed?.data?.id ?? '';
    const manifest = xRequestId
      ? `id:${dataId};request-date:${ts};`
      : `id:${dataId};ts:${ts};`;

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );

    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(manifest));
    const expected = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');

    return expected === v1;
  } catch {
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const rawBody = await req.text();

  // SECURITY: rejeita webhook sem assinatura válida do MP
  // Retorna 200 (não 401) pra MP não retentar — apenas loga e ignora
  const signatureOk = await verifySignature(req, rawBody);
  if (!signatureOk) {
    console.warn('mp-webhook.invalid_signature', {
      hasSignature: !!req.headers.get('x-signature'),
      hasRequestId: !!req.headers.get('x-request-id'),
    });
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body = JSON.parse(rawBody);
    console.log('MP webhook recebido (signature OK):', JSON.stringify(body));

    const paymentId = body?.data?.id ?? body?.resource?.split('/').pop();

    if (!paymentId) {
      console.warn('Webhook MP sem payment_id');
      return new Response('ok', { status: 200, headers: corsHeaders });
    }

    // Busca order pelo payment_external_id
    const { data: order } = await supabase
      .from('orders')
      .select('id, status, company_id, payment_status')
      .eq('payment_external_id', String(paymentId))
      .maybeSingle();

    if (!order) {
      console.warn('Order não encontrada para payment_id:', paymentId);
      return new Response('ok', { status: 200, headers: corsHeaders });
    }

    // Busca credenciais MP da empresa
    const { data: integration } = await supabase
      .from('payment_integrations')
      .select('access_token')
      .eq('company_id', order.company_id)
      .eq('gateway', 'mercadopago')
      .eq('is_active', true)
      .single();

    if (!integration) {
      console.warn('Integração MP não encontrada para company:', order.company_id);
      return new Response('ok', { status: 200, headers: corsHeaders });
    }

    // Consulta status real na API MP
    const mpRes = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${integration.access_token}` },
    });

    if (!mpRes.ok) {
      console.error('Erro ao buscar pagamento MP:', paymentId);
      return new Response('ok', { status: 200, headers: corsHeaders });
    }

    const mpPayment = await mpRes.json();
    const mpStatus = mpPayment.status;

    const paymentStatusMap: Record<string, string> = {
      approved:     'approved',
      authorized:   'approved',
      in_process:   'pending',
      pending:      'pending',
      rejected:     'rejected',
      cancelled:    'cancelled',
      refunded:     'refunded',
      charged_back: 'charged_back',
    };
    const newPaymentStatus = paymentStatusMap[mpStatus] ?? 'pending';

    console.log(`Order ${order.id}: MP ${mpStatus} → ${newPaymentStatus}`);

    const updates: Record<string, any> = { payment_status: newPaymentStatus };
    let shouldNotifyWhatsApp = false;
    if (newPaymentStatus === 'approved') {
      // awaiting_payment → pending: entra no kanban pela primeira vez após pagamento confirmado
      if (order.status === 'awaiting_payment') {
        updates.status = 'pending';
        shouldNotifyWhatsApp = true; // dispara WhatsApp só agora (não foi disparado em create-menu-order)
      }
      // pending → confirmed: auto-confirma se já estava no kanban
      else if (order.status === 'pending') updates.status = 'confirmed';
    }

    await supabase.from('orders').update(updates).eq('id', order.id);
    console.log(`Order ${order.id} atualizada:`, updates);

    // Rate limit PIX: resolve attempt (paid/expired/cancelled)
    // Approved → 'paid', cancelled/rejected → 'cancelled' (conta como falha pro contador)
    const attemptStatus = newPaymentStatus === 'approved' ? 'paid'
                        : ['cancelled', 'rejected'].includes(newPaymentStatus) ? 'cancelled'
                        : null;
    if (attemptStatus) {
      try {
        await supabase.rpc('resolve_pix_attempt', { p_order_id: order.id, p_status: attemptStatus });
      } catch (e) {
        console.warn('resolve_pix_attempt falhou:', e);
      }
    }

    // WhatsApp confirmação de pedido criado (delayed até receber pagamento)
    if (shouldNotifyWhatsApp) {
      try {
        await supabase.functions.invoke('orders-status', {
          body: { order_id: order.id, status: 'pending' },
        });
      } catch (e) {
        console.warn('WhatsApp confirmação falhou (não-bloqueante):', e);
      }
    }

    return new Response('ok', { status: 200, headers: corsHeaders });

  } catch (err: any) {
    console.error('mp-webhook error:', err?.message);
    return new Response('ok', { status: 200, headers: corsHeaders });
  }
});
