-- v1.0.0 — RPC pra cardápio público listar endereços únicos do cliente (extraídos de pedidos antigos)
CREATE OR REPLACE FUNCTION public.get_customer_addresses(
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
  phone_digits := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');

  IF length(phone_digits) < 8 OR p_company_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  -- Endereços distintos dos últimos pedidos, ordenados por uso recente
  SELECT coalesce(jsonb_agg(addr ORDER BY last_used DESC), '[]'::jsonb)
  INTO result
  FROM (
    SELECT
      address AS addr,
      MAX(created_at) AS last_used
    FROM orders
    WHERE company_id = p_company_id
      AND regexp_replace(coalesce(customer_phone, ''), '\D', '', 'g') LIKE '%' || phone_digits || '%'
      AND address IS NOT NULL
      AND length(trim(address)) > 5
    GROUP BY address
    ORDER BY MAX(created_at) DESC
    LIMIT 10
  ) sub;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_customer_addresses(uuid, text) TO anon, authenticated;
