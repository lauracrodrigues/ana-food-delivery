-- v1.0.0 — RPC pra cardápio público buscar histórico de pedidos do cliente por telefone
-- SECURITY DEFINER bypass RLS — limitado por company_id + phone match
CREATE OR REPLACE FUNCTION public.get_customer_orders(
  p_company_id uuid,
  p_phone text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  phone_digits text;
  result jsonb;
BEGIN
  -- Sanitiza telefone (só dígitos)
  phone_digits := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');

  IF length(phone_digits) < 8 OR p_company_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  -- Retorna últimos 30 pedidos do cliente nesta empresa
  SELECT coalesce(jsonb_agg(o ORDER BY o.created_at DESC), '[]'::jsonb)
  INTO result
  FROM (
    SELECT
      id,
      order_number,
      created_at,
      total,
      items,
      status,
      type,
      customer_phone
    FROM orders
    WHERE company_id = p_company_id
      AND regexp_replace(coalesce(customer_phone, ''), '\D', '', 'g') LIKE '%' || phone_digits || '%'
    ORDER BY created_at DESC
    LIMIT 30
  ) o;

  RETURN result;
END;
$$;

-- Permite anônimo chamar (cardápio público)
GRANT EXECUTE ON FUNCTION public.get_customer_orders(uuid, text) TO anon, authenticated;
