-- Adicionar novas colunas em customers
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS address_number text,
ADD COLUMN IF NOT EXISTS address_complement text,
ADD COLUMN IF NOT EXISTS last_order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS last_order_data jsonb,
ADD COLUMN IF NOT EXISTS last_order_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS total_orders integer DEFAULT 0;

-- Criar função para atualizar último pedido do cliente
CREATE OR REPLACE FUNCTION update_customer_last_order()
RETURNS trigger AS $$
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
    total_orders = COALESCE(total_orders, 0) + 1
  WHERE phone = NEW.customer_phone 
    AND company_id = NEW.company_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_update_customer_last_order ON orders;
CREATE TRIGGER trigger_update_customer_last_order
AFTER INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION update_customer_last_order();

-- Migrar dados existentes
WITH last_orders AS (
  SELECT DISTINCT ON (customer_phone, company_id)
    customer_phone,
    company_id,
    id as last_order_id,
    created_at as last_order_at,
    jsonb_build_object(
      'order_number', order_number,
      'type', type,
      'payment_method', payment_method,
      'observations', observations,
      'items', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'product_id', item->>'product_id',
            'name', item->>'name',
            'quantity', (item->>'quantity')::int,
            'extras', item->'extras',
            'observations', item->>'observations'
          )
        )
        FROM jsonb_array_elements(items) AS item
      ),
      'delivery_address', jsonb_build_object(
        'address', address,
        'address_number', address_number,
        'address_complement', address_complement,
        'neighborhood', neighborhood,
        'city', city,
        'state', state,
        'zip_code', zip_code
      )
    ) as last_order_data
  FROM orders
  WHERE customer_phone IS NOT NULL
  ORDER BY customer_phone, company_id, created_at DESC
),
order_counts AS (
  SELECT customer_phone, company_id, COUNT(*) as total
  FROM orders
  WHERE customer_phone IS NOT NULL
  GROUP BY customer_phone, company_id
)
UPDATE customers c
SET 
  last_order_id = lo.last_order_id,
  last_order_data = lo.last_order_data,
  last_order_at = lo.last_order_at,
  total_orders = oc.total
FROM last_orders lo
JOIN order_counts oc ON lo.customer_phone = oc.customer_phone 
  AND lo.company_id = oc.company_id
WHERE c.phone = lo.customer_phone 
  AND c.company_id = lo.company_id;