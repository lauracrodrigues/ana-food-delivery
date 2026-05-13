-- Migration: adiciona email ao entregador + tabela de conclusões locais

-- Email para login do entregador (opcional — se não tiver, usa acesso manual)
ALTER TABLE deliverers ADD COLUMN IF NOT EXISTS email VARCHAR(255);
CREATE UNIQUE INDEX IF NOT EXISTS deliverers_email_unique ON deliverers(email) WHERE email IS NOT NULL;

-- Registro de entregas concluídas sem alterar status do pedido
CREATE TABLE IF NOT EXISTS delivery_completions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  deliverer_id UUID NOT NULL REFERENCES deliverers(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes       TEXT,
  UNIQUE(order_id, deliverer_id)
);

CREATE INDEX IF NOT EXISTS delivery_completions_deliverer_idx ON delivery_completions(deliverer_id);

ALTER TABLE delivery_completions ENABLE ROW LEVEL SECURITY;

-- Entregador lê/insere suas próprias conclusões
CREATE POLICY "Deliverers manage own completions"
  ON delivery_completions FOR ALL
  USING (
    deliverer_id IN (
      SELECT id FROM deliverers WHERE email = auth.email()
    )
  );

-- Empresa lê conclusões dos seus entregadores
CREATE POLICY "Company reads deliverer completions"
  ON delivery_completions FOR SELECT
  USING (
    deliverer_id IN (
      SELECT id FROM deliverers WHERE company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
  );
