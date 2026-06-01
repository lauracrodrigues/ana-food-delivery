-- ════════════════════════════════════════════════════════════════════
-- Ecossistema Ana Food — Fase 1.1
-- Schema base: WhatsApp adapter flag + scheduled orders + electron telemetry
-- ════════════════════════════════════════════════════════════════════

-- 1. WhatsApp backend flag (D1: adapter pattern)
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS whatsapp_backend text NOT NULL DEFAULT 'injection'
    CHECK (whatsapp_backend IN ('injection', 'cloud_api', 'evolution')),
  ADD COLUMN IF NOT EXISTS cloud_api_token text,
  ADD COLUMN IF NOT EXISTS cloud_api_phone_id text,
  ADD COLUMN IF NOT EXISTS cloud_api_business_id text;

COMMENT ON COLUMN public.companies.whatsapp_backend IS
  'injection=WhatsApp Web (Electron), cloud_api=Meta Cloud API, evolution=legacy';

-- 2. Orders: cobertura noturna + source
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS scheduled_for timestamptz,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'whatsapp'
    CHECK (source IN ('whatsapp', 'cardapio_publico', 'pdv', 'electron'));

CREATE INDEX IF NOT EXISTS orders_scheduled_for_idx
  ON public.orders (scheduled_for) WHERE scheduled_for IS NOT NULL;

CREATE INDEX IF NOT EXISTS orders_source_company_idx
  ON public.orders (company_id, source, created_at DESC);

-- 3. Electron terminals (registro + heartbeat)
CREATE TABLE IF NOT EXISTS public.electron_terminals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  terminal_name text NOT NULL,
  version text,
  os text,
  hostname text,
  last_heartbeat_at timestamptz,
  online boolean DEFAULT false,
  registered_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS electron_terminals_company_idx
  ON public.electron_terminals (company_id);
CREATE INDEX IF NOT EXISTS electron_terminals_heartbeat_idx
  ON public.electron_terminals (last_heartbeat_at DESC);

-- 4. Electron metrics (time-series telemetria)
CREATE TABLE IF NOT EXISTS public.electron_metrics (
  id bigserial PRIMARY KEY,
  terminal_id uuid REFERENCES public.electron_terminals(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  ts timestamptz DEFAULT now(),
  queue_depth int DEFAULT 0,
  outbox_size int DEFAULT 0,
  outbox_dlq_size int DEFAULT 0,
  online boolean,
  socket_uptime_s int,
  msg_sent_count int DEFAULT 0,
  msg_failed_count int DEFAULT 0,
  msg_inbound_count int DEFAULT 0,
  cpu_pct numeric(5,2),
  mem_mb numeric(8,2)
);

CREATE INDEX IF NOT EXISTS electron_metrics_company_ts_idx
  ON public.electron_metrics (company_id, ts DESC);

-- Lifecycle: cleanup metrics > 30d
-- (criar cron Ana-Food worker depois)

-- 5. WhatsApp messages: dedup + audit cross-backend
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  msg_id text PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  from_jid text,
  to_jid text,
  body text,
  media_url text,
  type text DEFAULT 'text',
  sent_via text CHECK (sent_via IN ('injection', 'cloud_api', 'evolution')),
  status text DEFAULT 'received',
  error_msg text,
  created_at timestamptz DEFAULT now(),
  delivered_at timestamptz,
  read_at timestamptz
);

CREATE INDEX IF NOT EXISTS whatsapp_messages_company_created_idx
  ON public.whatsapp_messages (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS whatsapp_messages_status_idx
  ON public.whatsapp_messages (company_id, status, created_at DESC);

-- 6. Backup snapshots metadata (D — disaster recovery)
CREATE TABLE IF NOT EXISTS public.terminal_backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  terminal_id uuid NOT NULL REFERENCES public.electron_terminals(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  storage_path text NOT NULL,           -- bucket/company_id/terminal_id/timestamp.sqlite.gz
  size_bytes bigint,
  outbox_count int,
  uploaded_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS terminal_backups_terminal_idx
  ON public.terminal_backups (terminal_id, uploaded_at DESC);

-- 7. RLS policies
ALTER TABLE public.electron_terminals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.electron_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terminal_backups ENABLE ROW LEVEL SECURITY;

-- Policy: users veem só da própria company
CREATE POLICY electron_terminals_company_scope ON public.electron_terminals
  FOR ALL TO authenticated USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY electron_metrics_company_scope ON public.electron_metrics
  FOR ALL TO authenticated USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY whatsapp_messages_company_scope ON public.whatsapp_messages
  FOR ALL TO authenticated USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY terminal_backups_company_scope ON public.terminal_backups
  FOR ALL TO authenticated USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- 8. Storage bucket pra backups (criar via API depois)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('terminal-backups', 'terminal-backups', false);
-- Lifecycle 30d configurar no Dashboard

-- ════════════════════════════════════════════════════════════════════
-- Done. Migrations Fase 1.1
-- ════════════════════════════════════════════════════════════════════
