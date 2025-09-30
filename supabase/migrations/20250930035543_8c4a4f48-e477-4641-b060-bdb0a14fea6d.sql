-- Update the default value for visible_columns in store_settings
-- All columns should be visible by default except 'cancelado' (cancelled)
ALTER TABLE store_settings 
ALTER COLUMN visible_columns 
SET DEFAULT '{"pending": true, "preparing": true, "ready": true, "delivering": true, "completed": true, "cancelled": false}'::jsonb;