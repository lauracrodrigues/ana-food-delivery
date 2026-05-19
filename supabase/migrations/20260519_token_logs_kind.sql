-- v1.0.0 — Token logs estendidos: tipo de mídia + duração áudio + chars TTS
-- Suporta painel admin IA: text/audio_in/audio_out/image

-- Tipo de chamada
ALTER TABLE token_logs ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'text'
  CHECK (kind IN ('text','audio_in','audio_out','image'));

-- Duração em segundos (whisper transcrição / TTS síntese)
ALTER TABLE token_logs ADD COLUMN IF NOT EXISTS audio_seconds numeric(10,3);

-- Chars enviados (TTS) ou recebidos (whisper output)
ALTER TABLE token_logs ADD COLUMN IF NOT EXISTS char_count integer;

-- Index pro painel: filtros por company + período
CREATE INDEX IF NOT EXISTS idx_token_logs_company_date ON token_logs(company_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_token_logs_kind_date ON token_logs(kind, criado_em DESC);

-- Realtime publication (Supabase)
ALTER PUBLICATION supabase_realtime ADD TABLE token_logs;

-- RLS: só super_admin lê tudo; outros usuários só sua company
ALTER TABLE token_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admin_read_all_token_logs" ON token_logs;
CREATE POLICY "super_admin_read_all_token_logs" ON token_logs FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin')
  );

DROP POLICY IF EXISTS "company_read_own_token_logs" ON token_logs;
CREATE POLICY "company_read_own_token_logs" ON token_logs FOR SELECT
  USING (
    company_id IN (SELECT company_id FROM profiles WHERE profiles.id = auth.uid())
  );
