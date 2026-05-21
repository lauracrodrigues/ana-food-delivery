-- v1.0.0 — Fase 5: ofertas de rota agrupada + backup grupo WhatsApp

-- ── DELIVERY ROUTE OFFERS (cluster automático) ─────────────────────────────
CREATE TABLE IF NOT EXISTS delivery_route_offers (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  order_ids         uuid[] NOT NULL,
  status            text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','accepted','expired','cancelled')),
  center_lat        numeric(10,7),
  center_lng        numeric(10,7),
  total_distance_km numeric(6,2),
  est_duration_min  integer,
  offered_at        timestamptz NOT NULL DEFAULT now(),
  expires_at        timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  accepted_by       uuid REFERENCES deliverers(id),
  accepted_at       timestamptz
);

CREATE INDEX IF NOT EXISTS idx_offers_company_pending ON delivery_route_offers(company_id, status)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_offers_expires ON delivery_route_offers(expires_at) WHERE status = 'pending';

ALTER PUBLICATION supabase_realtime ADD TABLE delivery_route_offers;
ALTER TABLE delivery_route_offers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS company_all_offers ON delivery_route_offers;
CREATE POLICY company_all_offers ON delivery_route_offers FOR ALL
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- ── BACKUP GRUPO WHATSAPP ──────────────────────────────────────────────────
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS wa_delivery_group_jid text;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS wa_delivery_group_enabled boolean DEFAULT false;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS wa_delivery_group_timeout_min integer DEFAULT 5;
COMMENT ON COLUMN store_settings.wa_delivery_group_jid IS 'JID do grupo WhatsApp onde pedidos prontos sem deliverer são postados';
COMMENT ON COLUMN store_settings.wa_delivery_group_timeout_min IS 'Espera X minutos com pedido ready sem deliverer antes de postar no grupo';

-- ── COLUMNS pra lat/lng nos orders (necessário pra cluster) ────────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_lat numeric(10,7);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_lng numeric(10,7);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS wa_group_notified_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_orders_ready_no_deliverer ON orders(company_id, status, created_at)
  WHERE status IN ('preparing','ready') AND deliverer_id IS NULL;
