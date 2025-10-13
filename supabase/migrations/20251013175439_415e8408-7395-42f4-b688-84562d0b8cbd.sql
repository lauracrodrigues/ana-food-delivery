-- Adicionar coluna 'source' à tabela orders
-- Valores possíveis: 'whatsapp' ou 'digital_menu'

-- Adicionar a coluna como nullable primeiro
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS source TEXT;

-- Atualizar registros existentes sem source
UPDATE public.orders 
SET source = CASE
  WHEN observations LIKE '%WhatsApp%' THEN 'whatsapp'
  ELSE 'digital_menu'
END
WHERE source IS NULL;

-- Adicionar constraint para garantir apenas valores válidos
ALTER TABLE public.orders
DROP CONSTRAINT IF EXISTS orders_source_check;

ALTER TABLE public.orders
ADD CONSTRAINT orders_source_check 
CHECK (source IN ('whatsapp', 'digital_menu'));

-- Tornar a coluna NOT NULL após preencher valores existentes
ALTER TABLE public.orders
ALTER COLUMN source SET NOT NULL;

-- Criar índice para melhorar performance de filtros por source
CREATE INDEX IF NOT EXISTS idx_orders_source ON public.orders(source);

-- Comentário na coluna
COMMENT ON COLUMN public.orders.source IS 'Origem do pedido: whatsapp ou digital_menu';