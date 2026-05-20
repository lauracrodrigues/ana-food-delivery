-- v1.0.0 — Alertas de saldo de API (OpenAI, Google, Anthropic, etc)
-- Admin define budget mensal por provider. Cron checa consumo (token_logs).
-- Quando uso ≥ threshold_pct, dispara WhatsApp pro admin via Evolution.

CREATE TABLE IF NOT EXISTS api_billing_alerts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider        text NOT NULL CHECK (provider IN ('openai','google','anthropic','gemini','groq')),
  monthly_budget_usd numeric(10,2) NOT NULL,
  alert_threshold_pct numeric(5,2) NOT NULL DEFAULT 90.0 CHECK (alert_threshold_pct BETWEEN 1 AND 100),
  alert_phone     text NOT NULL,            -- WhatsApp do admin
  alert_instance  text NOT NULL,            -- Evolution instance que envia (Mais Sistem)
  enabled         boolean NOT NULL DEFAULT true,
  last_alerted_at timestamptz,              -- evita spam: alerta máx 1x/dia
  last_usage_pct  numeric(5,2) DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider)
);

COMMENT ON TABLE api_billing_alerts IS 'Configuração de alerta de saldo por provider IA';
COMMENT ON COLUMN api_billing_alerts.alert_instance IS 'Instância Evolution usada para enviar alerta (ex: Mais Sistem)';

-- Realtime + RLS super_admin
ALTER PUBLICATION supabase_realtime ADD TABLE api_billing_alerts;
ALTER TABLE api_billing_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admin_all_billing_alerts" ON api_billing_alerts;
CREATE POLICY "super_admin_all_billing_alerts" ON api_billing_alerts FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin')
  );

-- Index pra cron worker
CREATE INDEX IF NOT EXISTS idx_billing_alerts_enabled ON api_billing_alerts(enabled) WHERE enabled = true;
