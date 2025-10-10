-- Adicionar coluna para configurar o som de notificação
ALTER TABLE store_settings 
ADD COLUMN IF NOT EXISTS notification_sound text DEFAULT 'notification.mp3';