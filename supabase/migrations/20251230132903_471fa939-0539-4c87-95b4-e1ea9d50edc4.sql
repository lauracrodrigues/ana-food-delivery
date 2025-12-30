-- ============================================
-- FASE 1: Remover tabela sessions (redundante)
-- ============================================
DROP TABLE IF EXISTS public.sessions;

-- ============================================
-- FASE 2: Remover store_settings.delivery_fee
-- ============================================
ALTER TABLE public.store_settings DROP COLUMN IF EXISTS delivery_fee;

-- ============================================
-- FASE 3: Limpar campos não usados em whatsapp_config
-- ============================================
ALTER TABLE public.whatsapp_config DROP COLUMN IF EXISTS connection_status;
ALTER TABLE public.whatsapp_config DROP COLUMN IF EXISTS customer_name;
ALTER TABLE public.whatsapp_config DROP COLUMN IF EXISTS phone;
ALTER TABLE public.whatsapp_config DROP COLUMN IF EXISTS read;

-- ============================================
-- FASE 4: Adicionar campos de endereço estruturado em orders
-- ============================================
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS neighborhood text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS zip_code text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS address_number text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS address_complement text;

-- ============================================
-- FASE 5: Padronizar status para inglês em whatsapp_config
-- ============================================
UPDATE public.whatsapp_config SET status = 'pending' WHERE status = 'pendente';
UPDATE public.whatsapp_config SET status = 'preparing' WHERE status = 'preparando';
UPDATE public.whatsapp_config SET status = 'ready' WHERE status = 'pronto';
UPDATE public.whatsapp_config SET status = 'delivering' WHERE status = 'em_entrega';
UPDATE public.whatsapp_config SET status = 'completed' WHERE status = 'concluido';
UPDATE public.whatsapp_config SET status = 'cancelled' WHERE status = 'cancelado';

-- ============================================
-- FASE 6: Adicionar configuração de numeração de pedidos
-- ============================================
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS order_numbering_mode text DEFAULT 'sequential';
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS order_numbering_reset_time text DEFAULT '00:00';

-- Comentários para documentação
COMMENT ON COLUMN public.store_settings.order_numbering_mode IS 'Modo de numeração: daily (reinicia todo dia) ou sequential (nunca reinicia)';
COMMENT ON COLUMN public.store_settings.order_numbering_reset_time IS 'Hora de reset para modo diário (formato HH:MM)';