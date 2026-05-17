-- v1.0.0 — Sistema de retenção/limpeza LGPD-aware
-- - retention_policy configurável por empresa
-- - data_cleanup_log audit
-- - RPC cleanup_expired_data (executa limpeza por categoria, suporta dry_run)
-- - RPC anonymize_old_orders
-- - RPC export_customer_data (portabilidade LGPD)
-- - RPC delete_customer_data (direito ao esquecimento)

-- 1. Política de retenção por empresa
ALTER TABLE companies ADD COLUMN IF NOT EXISTS retention_policy jsonb DEFAULT '{
  "msg_history_days": 90,
  "abandoned_state_hours": 24,
  "soft_deleted_grace_days": 30,
  "logs_days": 30,
  "anonymize_orders_after_days": 1825,
  "customer_locations_days": 180,
  "expired_coupons_days": 90,
  "reviews_anonymize_days": 730
}'::jsonb;

-- 2. Audit log
CREATE TABLE IF NOT EXISTS public.data_cleanup_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  table_name text NOT NULL,
  action text NOT NULL,  -- delete | anonymize | export | reset
  rows_affected int NOT NULL DEFAULT 0,
  triggered_by text NOT NULL,  -- cron | manual | api | customer_request
  dry_run boolean DEFAULT false,
  details jsonb,  -- erros, IDs específicos, etc
  executed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cleanup_log_company ON data_cleanup_log(company_id, executed_at DESC);

ALTER TABLE data_cleanup_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin vê audit log" ON data_cleanup_log FOR SELECT USING (
  company_id IN (
    SELECT id FROM companies WHERE owner_id = auth.uid()
    UNION SELECT company_id FROM user_roles WHERE user_id = auth.uid() AND company_id IS NOT NULL
  )
);

-- 3. Coluna soft-delete onde fizer sentido (customers)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- ═════════════════════════════════════════════════════════════
-- RPC PRINCIPAL: cleanup_expired_data
-- ═════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.cleanup_expired_data(
  p_company_id uuid,
  p_dry_run boolean DEFAULT true,
  p_categories text[] DEFAULT NULL  -- NULL = todas; senão filtra
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  policy jsonb;
  result jsonb := '{}'::jsonb;
  v_count int;
  v_msg_days int;
  v_state_hours int;
  v_grace_days int;
  v_logs_days int;
  v_anon_days int;
  v_loc_days int;
  v_coupon_days int;
  v_review_days int;
  inc text;
  -- Helper para incluir categoria ou não
BEGIN
  IF p_company_id IS NULL THEN
    RETURN jsonb_build_object('error', 'company_id obrigatório');
  END IF;

  SELECT retention_policy INTO policy FROM companies WHERE id = p_company_id;
  IF policy IS NULL THEN
    policy := '{}'::jsonb;
  END IF;

  -- Extrai com defaults sãos
  v_msg_days    := COALESCE((policy->>'msg_history_days')::int, 90);
  v_state_hours := COALESCE((policy->>'abandoned_state_hours')::int, 24);
  v_grace_days  := COALESCE((policy->>'soft_deleted_grace_days')::int, 30);
  v_logs_days   := COALESCE((policy->>'logs_days')::int, 30);
  v_anon_days   := COALESCE((policy->>'anonymize_orders_after_days')::int, 1825);
  v_loc_days    := COALESCE((policy->>'customer_locations_days')::int, 180);
  v_coupon_days := COALESCE((policy->>'expired_coupons_days')::int, 90);
  v_review_days := COALESCE((policy->>'reviews_anonymize_days')::int, 730);

  -- Função local pra checar se categoria está incluída
  -- (postgres não tem if() inline, usamos array_contains)

  -- ── 1. msg_history antigos ────────────────────────────────────────
  IF p_categories IS NULL OR 'msg_history' = ANY(p_categories) THEN
    IF p_dry_run THEN
      SELECT count(*) INTO v_count FROM msg_history
      WHERE company_id = p_company_id AND created_at < now() - (v_msg_days || ' days')::interval;
    ELSE
      WITH del AS (
        DELETE FROM msg_history
        WHERE company_id = p_company_id AND created_at < now() - (v_msg_days || ' days')::interval
        RETURNING 1
      ) SELECT count(*) INTO v_count FROM del;
    END IF;
    result := result || jsonb_build_object('msg_history', v_count);
    INSERT INTO data_cleanup_log (company_id, table_name, action, rows_affected, triggered_by, dry_run)
    VALUES (p_company_id, 'msg_history', 'delete', v_count, 'manual', p_dry_run);
  END IF;

  -- ── 2. customers.pending_order abandonado ─────────────────────────
  IF p_categories IS NULL OR 'abandoned_state' = ANY(p_categories) THEN
    IF p_dry_run THEN
      SELECT count(*) INTO v_count FROM customers
      WHERE company_id = p_company_id
        AND pending_order IS NOT NULL AND pending_order::text <> 'null'
        AND updated_at < now() - (v_state_hours || ' hours')::interval;
    ELSE
      WITH upd AS (
        UPDATE customers SET pending_order = NULL, atendimento_lock = false, atendimento_lock_at = NULL
        WHERE company_id = p_company_id
          AND pending_order IS NOT NULL AND pending_order::text <> 'null'
          AND updated_at < now() - (v_state_hours || ' hours')::interval
        RETURNING 1
      ) SELECT count(*) INTO v_count FROM upd;
    END IF;
    result := result || jsonb_build_object('abandoned_state', v_count);
    INSERT INTO data_cleanup_log (company_id, table_name, action, rows_affected, triggered_by, dry_run)
    VALUES (p_company_id, 'customers.pending_order', 'reset', v_count, 'manual', p_dry_run);
  END IF;

  -- ── 3. soft-deleted customers > grace days → hard delete ──────────
  IF p_categories IS NULL OR 'soft_deleted' = ANY(p_categories) THEN
    IF p_dry_run THEN
      SELECT count(*) INTO v_count FROM customers
      WHERE company_id = p_company_id
        AND deleted_at IS NOT NULL
        AND deleted_at < now() - (v_grace_days || ' days')::interval;
    ELSE
      WITH del AS (
        DELETE FROM customers
        WHERE company_id = p_company_id
          AND deleted_at IS NOT NULL
          AND deleted_at < now() - (v_grace_days || ' days')::interval
        RETURNING 1
      ) SELECT count(*) INTO v_count FROM del;
    END IF;
    result := result || jsonb_build_object('soft_deleted', v_count);
    INSERT INTO data_cleanup_log (company_id, table_name, action, rows_affected, triggered_by, dry_run)
    VALUES (p_company_id, 'customers', 'hard_delete', v_count, 'manual', p_dry_run);
  END IF;

  -- ── 4. customer_locations antigos ─────────────────────────────────
  IF p_categories IS NULL OR 'customer_locations' = ANY(p_categories) THEN
    IF p_dry_run THEN
      SELECT count(*) INTO v_count FROM customer_locations
      WHERE company_id = p_company_id AND created_at < now() - (v_loc_days || ' days')::interval;
    ELSE
      WITH del AS (
        DELETE FROM customer_locations
        WHERE company_id = p_company_id AND created_at < now() - (v_loc_days || ' days')::interval
        RETURNING 1
      ) SELECT count(*) INTO v_count FROM del;
    END IF;
    result := result || jsonb_build_object('customer_locations', v_count);
    INSERT INTO data_cleanup_log (company_id, table_name, action, rows_affected, triggered_by, dry_run)
    VALUES (p_company_id, 'customer_locations', 'delete', v_count, 'manual', p_dry_run);
  END IF;

  -- ── 5. Anonimiza orders antigos (preserva métricas, zera PII) ─────
  IF p_categories IS NULL OR 'anonymize_orders' = ANY(p_categories) THEN
    IF p_dry_run THEN
      SELECT count(*) INTO v_count FROM orders
      WHERE company_id = p_company_id
        AND created_at < now() - (v_anon_days || ' days')::interval
        AND customer_name IS NOT NULL AND customer_name <> 'ANONYMOUS';
    ELSE
      WITH upd AS (
        UPDATE orders SET
          customer_name = 'ANONYMOUS',
          customer_phone = NULL,
          address = NULL,
          customer_lat = NULL,
          customer_lng = NULL,
          maps_link = NULL
        WHERE company_id = p_company_id
          AND created_at < now() - (v_anon_days || ' days')::interval
          AND customer_name IS NOT NULL AND customer_name <> 'ANONYMOUS'
        RETURNING 1
      ) SELECT count(*) INTO v_count FROM upd;
    END IF;
    result := result || jsonb_build_object('anonymize_orders', v_count);
    INSERT INTO data_cleanup_log (company_id, table_name, action, rows_affected, triggered_by, dry_run)
    VALUES (p_company_id, 'orders', 'anonymize', v_count, 'manual', p_dry_run);
  END IF;

  -- ── 6. Cupons expirados antigos (move pra logical archived via deactivate) ──
  IF p_categories IS NULL OR 'expired_coupons' = ANY(p_categories) THEN
    IF p_dry_run THEN
      SELECT count(*) INTO v_count FROM coupons
      WHERE company_id = p_company_id
        AND valid_until IS NOT NULL
        AND valid_until < now() - (v_coupon_days || ' days')::interval
        AND is_active = true;
    ELSE
      WITH upd AS (
        UPDATE coupons SET is_active = false
        WHERE company_id = p_company_id
          AND valid_until IS NOT NULL
          AND valid_until < now() - (v_coupon_days || ' days')::interval
          AND is_active = true
        RETURNING 1
      ) SELECT count(*) INTO v_count FROM upd;
    END IF;
    result := result || jsonb_build_object('expired_coupons', v_count);
    INSERT INTO data_cleanup_log (company_id, table_name, action, rows_affected, triggered_by, dry_run)
    VALUES (p_company_id, 'coupons', 'deactivate', v_count, 'manual', p_dry_run);
  END IF;

  -- ── 7. Anonimiza reviews antigas ──────────────────────────────────
  IF p_categories IS NULL OR 'anonymize_reviews' = ANY(p_categories) THEN
    IF p_dry_run THEN
      SELECT count(*) INTO v_count FROM order_reviews
      WHERE company_id = p_company_id
        AND created_at < now() - (v_review_days || ' days')::interval
        AND customer_phone IS NOT NULL;
    ELSE
      WITH upd AS (
        UPDATE order_reviews SET customer_phone = NULL
        WHERE company_id = p_company_id
          AND created_at < now() - (v_review_days || ' days')::interval
          AND customer_phone IS NOT NULL
        RETURNING 1
      ) SELECT count(*) INTO v_count FROM upd;
    END IF;
    result := result || jsonb_build_object('anonymize_reviews', v_count);
    INSERT INTO data_cleanup_log (company_id, table_name, action, rows_affected, triggered_by, dry_run)
    VALUES (p_company_id, 'order_reviews', 'anonymize', v_count, 'manual', p_dry_run);
  END IF;

  result := result || jsonb_build_object(
    'dry_run', p_dry_run,
    'policy_used', policy,
    'executed_at', now()
  );

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_expired_data(uuid, boolean, text[]) TO authenticated, service_role;

-- ═════════════════════════════════════════════════════════════
-- RPC: export_customer_data (LGPD portabilidade)
-- Cliente pede "meus dados" → retorna JSON com tudo
-- ═════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.export_customer_data(
  p_company_id uuid,
  p_phone text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  phone_digits text;
  result jsonb;
BEGIN
  phone_digits := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  IF length(phone_digits) < 8 OR p_company_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Telefone inválido');
  END IF;

  SELECT jsonb_build_object(
    'export_date', now(),
    'customer_phone', phone_digits,
    'company_id', p_company_id,
    'customer_record', (
      SELECT row_to_json(c) FROM customers c
      WHERE c.company_id = p_company_id
        AND regexp_replace(coalesce(c.phone,''), '\D', '', 'g') LIKE '%' || phone_digits || '%'
      LIMIT 1
    ),
    'orders', (
      SELECT coalesce(jsonb_agg(row_to_json(o) ORDER BY o.created_at DESC), '[]'::jsonb)
      FROM orders o
      WHERE o.company_id = p_company_id
        AND regexp_replace(coalesce(o.customer_phone,''), '\D', '', 'g') LIKE '%' || phone_digits || '%'
    ),
    'locations', (
      SELECT coalesce(jsonb_agg(row_to_json(cl)), '[]'::jsonb)
      FROM customer_locations cl
      WHERE cl.company_id = p_company_id
        AND regexp_replace(coalesce(cl.customer_phone,''), '\D', '', 'g') LIKE '%' || phone_digits || '%'
    ),
    'reviews', (
      SELECT coalesce(jsonb_agg(row_to_json(r)), '[]'::jsonb)
      FROM order_reviews r
      WHERE r.company_id = p_company_id
        AND regexp_replace(coalesce(r.customer_phone,''), '\D', '', 'g') LIKE '%' || phone_digits || '%'
    ),
    'loyalty', (
      SELECT row_to_json(lp) FROM loyalty_points lp
      WHERE lp.company_id = p_company_id
        AND regexp_replace(coalesce(lp.customer_phone,''), '\D', '', 'g') = phone_digits
      LIMIT 1
    )
  ) INTO result;

  INSERT INTO data_cleanup_log (company_id, table_name, action, rows_affected, triggered_by, dry_run, details)
  VALUES (p_company_id, 'export', 'export', 1, 'customer_request', false,
          jsonb_build_object('phone_digits', phone_digits));

  RETURN result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.export_customer_data(uuid, text) TO anon, authenticated, service_role;

-- ═════════════════════════════════════════════════════════════
-- RPC: delete_customer_data (LGPD direito ao esquecimento)
-- Cliente pede "apagar meus dados" → soft-delete imediato + hard-delete agendado
-- ═════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.delete_customer_data(
  p_company_id uuid,
  p_phone text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  phone_digits text;
  v_customer_count int;
  v_locations_count int;
  v_msg_count int;
BEGIN
  phone_digits := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  IF length(phone_digits) < 8 OR p_company_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Telefone inválido');
  END IF;

  -- 1. Soft-delete customer record
  WITH upd AS (
    UPDATE customers SET
      deleted_at = now(),
      preferences = '{}'::jsonb,
      pending_order = NULL,
      last_order_data = NULL,
      addresses = '[]'::jsonb
    WHERE company_id = p_company_id
      AND regexp_replace(coalesce(phone,''), '\D', '', 'g') LIKE '%' || phone_digits || '%'
      AND deleted_at IS NULL
    RETURNING 1
  ) SELECT count(*) INTO v_customer_count FROM upd;

  -- 2. Hard-delete customer_locations (sensível: GPS)
  WITH del AS (
    DELETE FROM customer_locations
    WHERE company_id = p_company_id
      AND regexp_replace(coalesce(customer_phone,''), '\D', '', 'g') LIKE '%' || phone_digits || '%'
    RETURNING 1
  ) SELECT count(*) INTO v_locations_count FROM del;

  -- 3. Hard-delete msg_history (conversas)
  WITH del AS (
    DELETE FROM msg_history
    WHERE company_id = p_company_id
      AND regexp_replace(coalesce(phone,''), '\D', '', 'g') LIKE '%' || phone_digits || '%'
    RETURNING 1
  ) SELECT count(*) INTO v_msg_count FROM del;

  -- 4. Anonimiza orders (mantém pra LGPD/fiscal mas sem PII)
  UPDATE orders SET
    customer_name = 'ANONYMOUS',
    customer_phone = NULL,
    address = NULL,
    customer_lat = NULL,
    customer_lng = NULL,
    maps_link = NULL
  WHERE company_id = p_company_id
    AND regexp_replace(coalesce(customer_phone,''), '\D', '', 'g') LIKE '%' || phone_digits || '%';

  -- 5. Audit
  INSERT INTO data_cleanup_log (company_id, table_name, action, rows_affected, triggered_by, dry_run, details)
  VALUES (p_company_id, 'all', 'customer_delete', v_customer_count + v_locations_count + v_msg_count,
          'customer_request', false,
          jsonb_build_object(
            'phone_digits', phone_digits,
            'customer', v_customer_count,
            'locations', v_locations_count,
            'msg_history', v_msg_count
          ));

  RETURN jsonb_build_object(
    'success', true,
    'customer_soft_deleted', v_customer_count,
    'locations_deleted', v_locations_count,
    'msg_history_deleted', v_msg_count,
    'orders_anonymized', true,
    'hard_delete_at', now() + interval '30 days'
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.delete_customer_data(uuid, text) TO anon, authenticated, service_role;
