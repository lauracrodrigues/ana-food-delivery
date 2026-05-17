-- v1.0.0 — Avaliações pós-venda (NPS) — 1 review por pedido
CREATE TABLE IF NOT EXISTS public.order_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_phone text,
  rating int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  food_quality int CHECK (food_quality BETWEEN 1 AND 5), -- sub-rating opcional
  delivery_time int CHECK (delivery_time BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT order_reviews_order_unique UNIQUE (order_id)
);

CREATE INDEX IF NOT EXISTS idx_order_reviews_company ON public.order_reviews(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_reviews_rating ON public.order_reviews(company_id, rating);

ALTER TABLE public.order_reviews ENABLE ROW LEVEL SECURITY;

-- Admin (dono da empresa) vê tudo
CREATE POLICY "Empresa vê suas avaliações" ON public.order_reviews
  FOR SELECT USING (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
      UNION
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

-- RPC pra cliente público criar avaliação (bypass RLS, valida match order+phone)
CREATE OR REPLACE FUNCTION public.submit_order_review(
  p_order_id uuid,
  p_phone text,
  p_rating int,
  p_comment text DEFAULT NULL,
  p_food_quality int DEFAULT NULL,
  p_delivery_time int DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order record;
  phone_digits text;
  v_review_id uuid;
BEGIN
  phone_digits := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');

  IF p_rating < 1 OR p_rating > 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nota deve ser 1-5');
  END IF;

  -- Valida pedido existe + telefone bate
  SELECT id, company_id, customer_phone, status INTO v_order
  FROM orders
  WHERE id = p_order_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pedido não encontrado');
  END IF;

  IF phone_digits != '' AND regexp_replace(coalesce(v_order.customer_phone, ''), '\D', '', 'g') NOT LIKE '%' || phone_digits || '%' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Telefone não confere com o pedido');
  END IF;

  -- Insert ou update (1 review por pedido)
  INSERT INTO order_reviews (order_id, company_id, customer_phone, rating, comment, food_quality, delivery_time)
  VALUES (v_order.id, v_order.company_id, v_order.customer_phone, p_rating, p_comment, p_food_quality, p_delivery_time)
  ON CONFLICT (order_id) DO UPDATE SET
    rating = EXCLUDED.rating,
    comment = EXCLUDED.comment,
    food_quality = EXCLUDED.food_quality,
    delivery_time = EXCLUDED.delivery_time,
    created_at = now()
  RETURNING id INTO v_review_id;

  RETURN jsonb_build_object('success', true, 'review_id', v_review_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_order_review TO anon, authenticated;

-- RPC pra checar se pedido já tem review (cliente vê estado)
CREATE OR REPLACE FUNCTION public.get_order_review(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_review record;
BEGIN
  SELECT rating, comment, food_quality, delivery_time, created_at INTO v_review
  FROM order_reviews WHERE order_id = p_order_id LIMIT 1;

  IF NOT FOUND THEN
    RETURN '{}'::jsonb;
  END IF;

  RETURN jsonb_build_object(
    'rating', v_review.rating,
    'comment', v_review.comment,
    'food_quality', v_review.food_quality,
    'delivery_time', v_review.delivery_time,
    'created_at', v_review.created_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_order_review TO anon, authenticated;

-- RPC pra admin: stats agregadas + lista reviews
CREATE OR REPLACE FUNCTION public.get_company_reviews_stats(p_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stats jsonb;
BEGIN
  -- Auth check: só admin da empresa pode ver
  IF NOT EXISTS (
    SELECT 1 FROM companies WHERE id = p_company_id AND owner_id = auth.uid()
    UNION SELECT 1 FROM company_users WHERE company_id = p_company_id AND user_id = auth.uid()
  ) THEN
    RETURN jsonb_build_object('error', 'unauthorized');
  END IF;

  SELECT jsonb_build_object(
    'total', count(*),
    'avg_rating', round(avg(rating)::numeric, 2),
    'avg_food', round(avg(food_quality)::numeric, 2),
    'avg_delivery', round(avg(delivery_time)::numeric, 2),
    'distribution', (
      SELECT jsonb_object_agg(rating, qty) FROM (
        SELECT rating, count(*) AS qty
        FROM order_reviews WHERE company_id = p_company_id
        GROUP BY rating
      ) d
    )
  ) INTO v_stats
  FROM order_reviews WHERE company_id = p_company_id;

  RETURN v_stats;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_company_reviews_stats TO authenticated;
