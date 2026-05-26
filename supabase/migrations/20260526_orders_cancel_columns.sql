-- v1.0.0 — Garante colunas de cancelamento em orders
-- Idempotente: usa IF NOT EXISTS. Roda antes de cancel_order_any_status.sql.
-- Motivo: RPC cancel_order_by_customer escreve nessas cols. Sem elas → SQL error.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cancellation_reason text;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

-- cancelled_by como TEXT (não UUID) — armazena 'customer' | 'store' | 'system' | 'timeout'
-- Coerente com order_cancellation_feedback.cancelled_by
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cancelled_by text
  CHECK (cancelled_by IS NULL OR cancelled_by IN ('customer', 'store', 'system', 'timeout'));

COMMENT ON COLUMN public.orders.cancellation_reason IS
  'Motivo do cancelamento (texto livre + label do motivo pré-definido).';

COMMENT ON COLUMN public.orders.cancelled_at IS
  'Timestamp do cancelamento.';

COMMENT ON COLUMN public.orders.cancelled_by IS
  'Quem cancelou: customer (cliente via cardápio), store (operador), system (auto), timeout (não confirmado a tempo).';

-- Index pra relatórios de cancelamento
CREATE INDEX IF NOT EXISTS idx_orders_cancelled_at
  ON public.orders (company_id, cancelled_at DESC)
  WHERE cancelled_at IS NOT NULL;
