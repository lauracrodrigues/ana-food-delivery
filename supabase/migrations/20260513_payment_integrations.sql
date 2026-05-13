-- Tabela de integrações de pagamento por empresa
CREATE TABLE IF NOT EXISTS payment_integrations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  gateway       TEXT NOT NULL DEFAULT 'mercadopago',
  access_token  TEXT NOT NULL,
  public_key    TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  sandbox_mode  BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, gateway)
);

ALTER TABLE payment_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members manage own payment integrations"
  ON payment_integrations FOR ALL
  USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- Campos de pagamento na tabela orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status       TEXT DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_gateway      TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_external_id  TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_qr_code      TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_qr_code_base64 TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_expires_at   TIMESTAMPTZ;
