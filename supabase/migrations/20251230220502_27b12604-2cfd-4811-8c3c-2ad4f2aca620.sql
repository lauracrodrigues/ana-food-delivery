-- Remove current_step column (não há dependências no frontend)
ALTER TABLE customers DROP COLUMN IF EXISTS current_step;

-- Adicionar coluna pending_order para estado do pedido em andamento
ALTER TABLE customers 
ADD COLUMN pending_order jsonb DEFAULT NULL;

COMMENT ON COLUMN customers.pending_order IS 
'Estado do pedido em andamento. NULL = sem pedido ativo. Estrutura: {started_at, expires_at, items[], delivery{}, payment{}, observations}';

-- Índice parcial para queries de pedidos ativos
CREATE INDEX idx_customers_pending_order_active 
ON customers ((pending_order IS NOT NULL)) 
WHERE pending_order IS NOT NULL;

-- Atualizar trigger para limpar pending_order quando pedido é criado
CREATE OR REPLACE FUNCTION public.update_customer_last_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  items_without_prices jsonb;
BEGIN
  -- Remove preços dos itens, mantém apenas identificação
  SELECT jsonb_agg(
    jsonb_build_object(
      'product_id', item->>'product_id',
      'name', item->>'name',
      'quantity', (item->>'quantity')::int,
      'extras', item->'extras',
      'observations', item->>'observations'
    )
  )
  INTO items_without_prices
  FROM jsonb_array_elements(NEW.items) AS item;

  UPDATE customers 
  SET 
    last_order_id = NEW.id,
    last_order_data = jsonb_build_object(
      'order_number', NEW.order_number,
      'type', NEW.type,
      'payment_method', NEW.payment_method,
      'observations', NEW.observations,
      'items', items_without_prices,
      'delivery_address', jsonb_build_object(
        'address', NEW.address,
        'address_number', NEW.address_number,
        'address_complement', NEW.address_complement,
        'neighborhood', NEW.neighborhood,
        'city', NEW.city,
        'state', NEW.state,
        'zip_code', NEW.zip_code
      )
    ),
    last_order_at = NEW.created_at,
    total_orders = COALESCE(total_orders, 0) + 1,
    -- Limpar pending_order quando pedido é finalizado
    pending_order = NULL
  WHERE phone = NEW.customer_phone 
    AND company_id = NEW.company_id;
  
  RETURN NEW;
END;
$function$;