// Edge Function: create-menu-order (pública, sem JWT)
// Cria pedido via cardápio digital usando service role — contorna RLS para clientes sem sessão
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body = await req.json();
    const { company_id, customer_name, customer_phone, total, items, type,
            address, payment_method, observations, delivery_fee, estimated_time,
            table_id, table_number } = body;

    if (!company_id || !customer_name || !total) {
      return json({ error: 'company_id, customer_name e total são obrigatórios' }, 400);
    }

    // Valida que a empresa existe e está ativa
    const { data: company } = await supabase
      .from('companies')
      .select('id, is_active')
      .eq('id', company_id)
      .eq('is_active', true)
      .single();

    if (!company) return json({ error: 'Empresa não encontrada ou inativa' }, 404);

    // PIX MP fica em 'awaiting_payment' até webhook confirmar — não aparece no kanban
    const initialStatus = payment_method === 'pix_mp' ? 'awaiting_payment' : 'pending';

    const orderData: Record<string, any> = {
      company_id,
      customer_name,
      customer_phone,
      total,
      items: items ?? [],
      type: type ?? 'delivery',
      address: address ?? null,
      payment_method: payment_method ?? 'dinheiro',
      observations: observations ?? null,
      status: initialStatus,
      source: 'digital_menu',
      delivery_fee: delivery_fee ?? 0,
      estimated_time: estimated_time ?? 30,
    };

    if (table_id) {
      orderData.table_id = table_id;
      orderData.table_number = table_number;
    }

    const { data: order, error } = await supabase
      .from('orders')
      .insert(orderData)
      .select('id')
      .single();

    if (error) {
      console.error('Erro ao criar pedido:', error);
      return json({ error: error.message }, 500);
    }

    // Auto-resposta: dispara orders-status com 'pending' pra mandar WhatsApp de confirmação
    // (template configurado pelo dono em whatsapp_config com config_type='status_message' status='pending')
    try {
      await supabase.functions.invoke('orders-status', {
        body: { order_id: order.id, status: 'pending' },
      });
    } catch (e) {
      console.warn('Auto-resposta WhatsApp falhou (não bloqueia pedido):', e);
    }

    return json({ id: order.id });

  } catch (err: any) {
    console.error('create-menu-order error:', err);
    return json({ error: err?.message ?? 'Erro interno' }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
