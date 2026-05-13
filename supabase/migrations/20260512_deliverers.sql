-- Migration: cadastro de entregadores e vínculo com pedidos

CREATE TABLE IF NOT EXISTS deliverers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name       VARCHAR(100) NOT NULL,
  phone      VARCHAR(20) NOT NULL,   -- WhatsApp: só dígitos (DDI+DDD+número)
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS deliverers_company_id_idx ON deliverers(company_id);

-- RLS
ALTER TABLE deliverers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can manage deliverers"
  ON deliverers FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Vincula pedido ao entregador que foi designado
ALTER TABLE orders ADD COLUMN IF NOT EXISTS deliverer_id UUID REFERENCES deliverers(id) ON DELETE SET NULL;
