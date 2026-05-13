-- Adiciona flag de mensagens de status de pedido em store_settings
-- (movido de whatsapp_config que não tinha essa coluna, causando erro 400/500)
ALTER TABLE store_settings
  ADD COLUMN IF NOT EXISTS send_status_messages BOOLEAN NOT NULL DEFAULT TRUE;
