-- v1.0.0 — Feedback de cancelamento (empresa analisa motivos pra melhorar)

CREATE TABLE IF NOT EXISTS order_cancellation_feedback (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid REFERENCES orders(id) ON DELETE CASCADE,
  company_id  uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_phone text,
  reason_text text NOT NULL,
  cancelled_by text DEFAULT 'customer' CHECK (cancelled_by IN ('customer','store','timeout','system')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cfb_company_date
  ON order_cancellation_feedback (company_id, created_at DESC);

ALTER TABLE order_cancellation_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cfb_select ON order_cancellation_feedback;
CREATE POLICY cfb_select ON order_cancellation_feedback FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS cfb_all_service ON order_cancellation_feedback;
CREATE POLICY cfb_all_service ON order_cancellation_feedback FOR ALL TO service_role
  USING (true) WITH CHECK (true);

COMMENT ON TABLE order_cancellation_feedback IS
  'Motivos de cancelamento coletados após cliente cancelar pedido. Empresa analisa pra melhorar.';
