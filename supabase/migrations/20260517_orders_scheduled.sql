-- v1.0.0 — Agendamento de pedido (pré-pedido pra horário futuro)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS scheduled_for timestamptz;

CREATE INDEX IF NOT EXISTS idx_orders_scheduled_for ON public.orders(scheduled_for)
  WHERE scheduled_for IS NOT NULL;

-- Comentário documenta semântica
COMMENT ON COLUMN public.orders.scheduled_for IS
  'Quando o pedido deve ser preparado/entregue. NULL = pedido pra agora. Quando preenchido, status normalmente vira "scheduled" até hora chegar.';

-- RPC pra ativar pedidos agendados cuja hora chegou (move scheduled → pending)
-- Pode ser chamada via pg_cron ou edge function periodicamente
CREATE OR REPLACE FUNCTION public.activate_scheduled_orders()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  UPDATE orders
  SET status = 'pending', updated_at = now()
  WHERE status = 'scheduled'
    AND scheduled_for IS NOT NULL
    AND scheduled_for <= now() + interval '5 minutes'; -- ativa 5min antes pra dar tempo de preparar
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.activate_scheduled_orders() TO authenticated, service_role;
