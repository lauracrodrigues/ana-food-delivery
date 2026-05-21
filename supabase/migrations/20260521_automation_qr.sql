-- v1.0.0 — Automação fluxo pedido + QR code claim por entregador
-- Fase 1+2: regras de auto-avanço de status por timeout
-- Fase 3: token QR seguro em orders pra captura por entregador

-- ───────────────────────────────────────────────────────────────────────────
-- AUTOMAÇÃO DE STATUS
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_automation_rules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  from_status     text NOT NULL,
  to_status       text NOT NULL,
  timeout_minutes integer NOT NULL DEFAULT 5,
  enabled         boolean NOT NULL DEFAULT true,
  conditions      jsonb DEFAULT '{}',          -- ex: { only_if_store_open: true }
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, from_status)
);

CREATE INDEX IF NOT EXISTS idx_auto_rules_company ON order_automation_rules(company_id, enabled);

-- Seed regras default pra cada empresa
INSERT INTO order_automation_rules (company_id, from_status, to_status, timeout_minutes, enabled)
SELECT id, 'pending',   'confirmed', 1, false FROM companies
ON CONFLICT (company_id, from_status) DO NOTHING;
INSERT INTO order_automation_rules (company_id, from_status, to_status, timeout_minutes, enabled)
SELECT id, 'confirmed', 'preparing', 2, false FROM companies
ON CONFLICT (company_id, from_status) DO NOTHING;
INSERT INTO order_automation_rules (company_id, from_status, to_status, timeout_minutes, enabled)
SELECT id, 'preparing', 'ready',    25, false FROM companies
ON CONFLICT (company_id, from_status) DO NOTHING;

ALTER TABLE order_automation_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS company_all_auto_rules ON order_automation_rules;
CREATE POLICY company_all_auto_rules ON order_automation_rules FOR ALL
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- ───────────────────────────────────────────────────────────────────────────
-- QR CODE DE CAPTURA POR ENTREGADOR
-- ───────────────────────────────────────────────────────────────────────────
-- Token único + curto pra exibir em QR (formato: 12 chars base36)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_qr_token text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_pickup_qr_token ON orders(pickup_qr_token) WHERE pickup_qr_token IS NOT NULL;

-- Função gera token seguro (24 chars hex = ~96 bits entropy)
CREATE OR REPLACE FUNCTION gen_pickup_qr_token() RETURNS text AS $$
BEGIN
  RETURN encode(gen_random_bytes(12), 'hex');
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Backfill pedidos existentes sem token
UPDATE orders SET pickup_qr_token = gen_pickup_qr_token()
WHERE pickup_qr_token IS NULL;

-- Trigger: novo pedido recebe token automaticamente
CREATE OR REPLACE FUNCTION set_pickup_qr_token() RETURNS trigger AS $$
BEGIN
  IF NEW.pickup_qr_token IS NULL THEN
    NEW.pickup_qr_token := gen_pickup_qr_token();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_pickup_qr_token ON orders;
CREATE TRIGGER trg_set_pickup_qr_token
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_pickup_qr_token();

-- ───────────────────────────────────────────────────────────────────────────
-- LOG DE AUDITORIA QR CLAIMS (rastrear tentativas suspeitas)
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qr_claim_attempts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token         text NOT NULL,
  order_id      uuid REFERENCES orders(id) ON DELETE SET NULL,
  deliverer_id  uuid,                          -- pode ser null se falhou
  user_id       uuid,                          -- auth.uid() de quem tentou
  company_id    uuid,
  success       boolean NOT NULL,
  error_reason  text,
  ip_address    text,
  user_agent    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_qr_claims_token ON qr_claim_attempts(token, created_at);
CREATE INDEX IF NOT EXISTS idx_qr_claims_user_recent ON qr_claim_attempts(user_id, created_at);

ALTER TABLE qr_claim_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS company_read_qr_attempts ON qr_claim_attempts;
CREATE POLICY company_read_qr_attempts ON qr_claim_attempts FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
