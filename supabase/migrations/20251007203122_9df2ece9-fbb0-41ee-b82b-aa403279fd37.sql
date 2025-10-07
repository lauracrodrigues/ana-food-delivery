-- Adicionar campo webhook_url na tabela whatsapp_sessions
ALTER TABLE public.whatsapp_sessions 
ADD COLUMN webhook_url text;