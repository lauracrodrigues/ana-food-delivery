-- v1.0.0 — RPC cancel_order_by_customer
-- Permite cliente (anônimo via cardápio público) cancelar pedido em status
-- inicial (pending/confirmed). Bloqueia se já preparando/entregando/entregue.
-- SECURITY DEFINER bypassa RLS, mas valida regras antes.

CREATE OR REPLACE FUNCTION public.cancel_order_by_customer(
  p_order_id  uuid,
  p_reason    text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
BEGIN
  -- Trim + validação reason
  p_reason := COALESCE(NULLIF(trim(p_reason), ''), 'Sem motivo informado');

  -- Busca pedido
  SELECT id, status, company_id, order_number
    INTO v_order
    FROM orders
   WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'order_not_found');
  END IF;

  -- Só pode cancelar nos status iniciais
  IF v_order.status NOT IN ('pending', 'confirmed') THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'cannot_cancel',
      'message', 'Pedido já está sendo preparado ou foi finalizado',
      'current_status', v_order.status
    );
  END IF;

  -- Atualiza
  UPDATE orders SET
    status              = 'cancelled',
    cancellation_reason = p_reason,
    cancelled_by        = 'customer',
    cancelled_at        = NOW(),
    updated_at          = NOW()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'ok', true,
    'order_id', p_order_id,
    'order_number', v_order.order_number
  );
END;
$$;

-- Permite execução por qualquer um (anon + authenticated) — segurança via SECURITY DEFINER
GRANT EXECUTE ON FUNCTION public.cancel_order_by_customer(uuid, text) TO anon, authenticated;

COMMENT ON FUNCTION public.cancel_order_by_customer IS 'Cancela pedido do cliente via cardápio. Valida status, bloqueia se já em preparo.';
