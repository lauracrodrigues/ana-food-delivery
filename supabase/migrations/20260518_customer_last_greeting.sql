-- v1.0.0 — Coluna last_greeting_at: evita resaudar cliente no mesmo dia
-- Quando sessão Redis expira mid-day, bot não deve mandar saudação completa
-- novamente (incomoda + aumenta volume = risco spam flag).

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS last_greeting_at timestamptz;

-- Index pra lookup rápido (company_id + phone já tem unique normalmente)
CREATE INDEX IF NOT EXISTS idx_customers_last_greeting
  ON customers (company_id, phone, last_greeting_at);

COMMENT ON COLUMN customers.last_greeting_at IS
  'Timestamp da última saudação completa enviada. Bot pula saudação se >= today.';
