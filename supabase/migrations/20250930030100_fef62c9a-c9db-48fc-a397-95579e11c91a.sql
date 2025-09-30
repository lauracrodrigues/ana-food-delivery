-- Adicionar coluna de sessão WhatsApp padrão nas configurações da loja
ALTER TABLE public.store_settings 
ADD COLUMN IF NOT EXISTS default_whatsapp_session text;

-- Adicionar comentário para documentação
COMMENT ON COLUMN public.store_settings.default_whatsapp_session IS 'Nome da sessão WhatsApp padrão para testes de envio';