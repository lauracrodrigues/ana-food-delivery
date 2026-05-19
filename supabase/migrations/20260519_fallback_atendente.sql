-- v1.0.0 — Tabela fallback_atendente (alertas pra atendente humano)
-- Bot detecta cliente pedindo ajuda OR insatisfação OR contexto fora-do-escopo.
-- NotificationBell mostra contagem + anima quando há pendentes.

CREATE TABLE IF NOT EXISTS fallback_atendente (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  phone         text NOT NULL,
  motivo        text NOT NULL,
  contexto      text,
  severity      text NOT NULL DEFAULT 'warning'
                CHECK (severity IN ('info','warning','critical')),
  resolvido     boolean NOT NULL DEFAULT false,
  detectado_em  timestamptz NOT NULL DEFAULT now(),
  resolvido_em  timestamptz
);

CREATE INDEX IF NOT EXISTS idx_fa_pending
  ON fallback_atendente (company_id, detectado_em DESC)
  WHERE resolvido = false;

ALTER TABLE fallback_atendente ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fa_select ON fallback_atendente;
CREATE POLICY fa_select ON fallback_atendente FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS fa_update ON fallback_atendente;
CREATE POLICY fa_update ON fallback_atendente FOR UPDATE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS fa_service ON fallback_atendente;
CREATE POLICY fa_service ON fallback_atendente FOR ALL TO service_role
  USING (true) WITH CHECK (true);

COMMENT ON TABLE fallback_atendente IS
  'Alertas que precisam atenção humana: pedido atendente, insatisfação, contexto fora-do-escopo';
