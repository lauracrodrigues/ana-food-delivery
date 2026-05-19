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
            table_id, table_number, scheduled_for, referred_by_phone } = body;

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

    // Status inicial:
    // - PIX MP em 'awaiting_payment' (espera confirmação webhook)
    // - Agendado (scheduled_for futuro) em 'scheduled' (entra kanban quando hora chegar)
    // - Resto em 'pending' (entra kanban imediato)
    const isScheduled = scheduled_for && new Date(scheduled_for).getTime() > Date.now() + 60000; // 1min+ no futuro
    const initialStatus = payment_method === 'pix_mp' ? 'awaiting_payment'
      : isScheduled ? 'scheduled'
      : 'pending';

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
      scheduled_for: scheduled_for ?? null,
      referred_by_phone: referred_by_phone ?? null,
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

    // Snapshot dos modifiers escolhidos (Fase 5 catalogo-modifiers)
    // Congela name + price_delta no momento do pedido. Não quebra histórico
    // se admin deletar item depois (modifier_item_id pode virar NULL).
    try {
      const snapshots: Array<Record<string, any>> = [];
      for (const item of (items || [])) {
        const lineId = item.line_id;
        if (!lineId || !Array.isArray(item.extras)) continue;
        for (const extra of item.extras) {
          if (!extra?.id || !extra?.name) continue;
          snapshots.push({
            order_id: order.id,
            order_item_id: lineId,
            modifier_item_id: extra.id, // pode não existir em modifier_items (legado) — FK SET NULL via ON DELETE
            name_snapshot: extra.name,
            price_delta_snapshot: Number(extra.price) || 0,
            quantity: 1,
          });
        }
      }
      if (snapshots.length > 0) {
        // Insere best-effort: se modifier_item_id é de schema legado (não está em modifier_items),
        // FK constraint vai falhar. Usa upsert + ignore on conflict ou fallback sem FK.
        const { error: snapErr } = await supabase
          .from('order_item_modifiers')
          .insert(snapshots);
        if (snapErr) {
          // Provavelmente FK violation pra IDs legados → tenta inserir sem o FK
          const fallback = snapshots.map(s => ({ ...s, modifier_item_id: null }));
          await supabase.from('order_item_modifiers').insert(fallback);
        }
      }
    } catch (snapEx) {
      // Snapshot é best-effort, não bloqueia criação do pedido
      console.warn('Snapshot modifiers falhou (não-bloqueante):', snapEx);
    }

    // Auto-resposta WhatsApp APENAS se pedido já confirmado (não-PIX-MP)
    // Pix MP em awaiting_payment: WhatsApp disparado pelo mp-webhook após confirmar pagamento
    if (initialStatus === 'pending') {
      try {
        await supabase.functions.invoke('orders-status', {
          body: { order_id: order.id, status: 'pending' },
        });
      } catch (e) {
        console.warn('Auto-resposta WhatsApp falhou (não bloqueia pedido):', e);
      }
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
