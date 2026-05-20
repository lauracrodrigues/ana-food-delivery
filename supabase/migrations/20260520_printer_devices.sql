-- v1.0.0 — Agente Ana Food Print: device pairing + jobs
-- Pareamento por código 6 dígitos (sem chaves RSA)

CREATE TABLE IF NOT EXISTS printer_pairing_codes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        char(6) NOT NULL UNIQUE,
  company_id  uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  device_name text,
  expires_at  timestamptz NOT NULL,
  used        boolean NOT NULL DEFAULT false,
  created_by  uuid REFERENCES profiles(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pairing_code ON printer_pairing_codes(code) WHERE used = false;

CREATE TABLE IF NOT EXISTS printer_devices (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  device_token   text NOT NULL UNIQUE,         -- JWT longevidade 1 ano
  device_name    text,
  platform       text,
  hostname       text,
  app_version    text,
  paired_at      timestamptz NOT NULL DEFAULT now(),
  last_seen_at   timestamptz,
  status         text NOT NULL DEFAULT 'offline' CHECK (status IN ('online','offline','error')),
  last_error     text,
  enabled        boolean NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_printer_devices_company ON printer_devices(company_id);

CREATE TABLE IF NOT EXISTS printer_jobs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  device_id     uuid REFERENCES printer_devices(id) ON DELETE SET NULL,
  sector        text NOT NULL CHECK (sector IN ('caixa','cozinha_1','cozinha_2','cozinha_3','copa_bar')),
  payload       jsonb NOT NULL,
  status        text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','done','failed')),
  error         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  sent_at       timestamptz,
  done_at       timestamptz
);

CREATE INDEX IF NOT EXISTS idx_printer_jobs_company_status ON printer_jobs(company_id, status, created_at DESC);

-- RLS
ALTER TABLE printer_pairing_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE printer_devices       ENABLE ROW LEVEL SECURITY;
ALTER TABLE printer_jobs          ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS company_all_pairing ON printer_pairing_codes;
CREATE POLICY company_all_pairing ON printer_pairing_codes FOR ALL
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS company_all_devices ON printer_devices;
CREATE POLICY company_all_devices ON printer_devices FOR ALL
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS company_all_jobs ON printer_jobs;
CREATE POLICY company_all_jobs ON printer_jobs FOR ALL
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE printer_devices;
ALTER PUBLICATION supabase_realtime ADD TABLE printer_jobs;
