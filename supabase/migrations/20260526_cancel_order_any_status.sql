-- v1.1.0 — RPC cancel_order_by_customer
-- Cliente cancela em QUALQUER status ativo (não só pending/confirmed).
-- Motivo: cliente tem razões legítimas pra cancelar mesmo em preparing/ready/delivering.
-- Bloqueia apenas status finais: delivered, cancelled, completed, archived.
-- Retorna flag `late_cancel` (preparing+) pra loja saber que houve perda de produção.

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
  v_late_cancel boolean;
BEGIN
  -- Trim + fallback motivo
  p_reason := COALESCE(NULLIF(trim(p_reason), ''), 'Sem motivo informado');

  -- Busca pedido
  SELECT id, status, company_id, order_number
    INTO v_order
    FROM orders
   WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'order_not_found');
  END IF;

  -- Bloqueia somente status finais (pedido já encerrado)
  IF v_order.status IN ('delivered', 'cancelled', 'completed', 'archived') THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'already_finalized',
      'message', 'Pedido já foi finalizado e não pode mais ser cancelado',
      'current_status', v_order.status
    );
  END IF;

  -- Cancel tardio = status já saiu de pending/confirmed (loja perdeu produção/insumos)
  v_late_cancel := v_order.status NOT IN ('pending', 'confirmed', 'scheduled');

  -- Atualiza pedido
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
    'order_number', v_order.order_number,
    'late_cancel', v_late_cancel,
    'previous_status', v_order.status
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_order_by_customer(uuid, text) TO anon, authenticated;

COMMENT ON FUNCTION public.cancel_order_by_customer IS
  'v1.1.0 — Cliente cancela pedido em qualquer status ativo. Bloqueia só finais. Retorna late_cancel pra loja.';
