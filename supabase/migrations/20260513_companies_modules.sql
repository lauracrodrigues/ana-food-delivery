-- Módulos habilitados por empresa (admin configura quais recursos cada cliente pode usar)
-- Padrão: todos habilitados (null = usa default)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS modules_enabled JSONB DEFAULT '{
  "cardapio_digital": true,
  "whatsapp": true,
  "pdv": true,
  "financeiro": true,
  "app_entregador": true,
  "distribuidoras": false
}'::jsonb;
