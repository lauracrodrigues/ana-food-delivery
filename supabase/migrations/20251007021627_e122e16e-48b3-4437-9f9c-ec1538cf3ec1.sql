-- Add alert_time column to store_settings table
ALTER TABLE store_settings 
ADD COLUMN IF NOT EXISTS alert_time INTEGER DEFAULT 10;

COMMENT ON COLUMN store_settings.alert_time IS 'Tempo em minutos para alertar atraso no pedido';