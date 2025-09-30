-- Atualizar registros existentes de store_settings para ter os filtros corretos
UPDATE store_settings 
SET visible_columns = '{"pending": true, "preparing": true, "ready": true, "delivering": true, "completed": true, "cancelled": false}'::jsonb
WHERE visible_columns IS NULL 
   OR visible_columns != '{"pending": true, "preparing": true, "ready": true, "delivering": true, "completed": true, "cancelled": false}'::jsonb;