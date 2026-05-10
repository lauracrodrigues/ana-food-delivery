-- Adiciona coluna debounce_ms em store_settings
-- Controla o tempo de buffer de mensagens do bot WhatsApp (padrão 10s)
ALTER TABLE store_settings
  ADD COLUMN IF NOT EXISTS debounce_ms INTEGER NOT NULL DEFAULT 10000;

COMMENT ON COLUMN store_settings.debounce_ms IS
  'Tempo em ms que o bot aguarda por mais mensagens antes de processar (debounce). Padrão: 10000 (10s)';
