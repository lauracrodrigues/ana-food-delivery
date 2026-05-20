-- v1.0.0 — Setores de impressão customizáveis por empresa
-- Cliente pode adicionar setores além dos 5 default (caixa, cozinha_1/2/3, copa_bar)

CREATE TABLE IF NOT EXISTS print_sectors (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  key         text NOT NULL,             -- chave única (snake_case, ex: 'cozinha_4', 'doceria')
  label       text NOT NULL,             -- nome exibido (ex: "Doceria", "Açaí")
  icon        text DEFAULT '🍽️',
  sort_order  integer NOT NULL DEFAULT 0,
  enabled     boolean NOT NULL DEFAULT true,
  is_default  boolean NOT NULL DEFAULT false,   -- se vem dos 5 originais
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, key)
);

CREATE INDEX IF NOT EXISTS idx_print_sectors_company ON print_sectors(company_id, sort_order);

-- Realtime + RLS
ALTER PUBLICATION supabase_realtime ADD TABLE print_sectors;
ALTER TABLE print_sectors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS company_all_print_sectors ON print_sectors;
CREATE POLICY company_all_print_sectors ON print_sectors FOR ALL
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Seed: 5 setores default pra cada empresa existente
INSERT INTO print_sectors (company_id, key, label, icon, sort_order, is_default)
SELECT id, 'caixa',     'Caixa',     '💰', 0, true FROM companies
ON CONFLICT (company_id, key) DO NOTHING;
INSERT INTO print_sectors (company_id, key, label, icon, sort_order, is_default)
SELECT id, 'cozinha_1', 'Cozinha 1', '👨‍🍳', 1, true FROM companies
ON CONFLICT (company_id, key) DO NOTHING;
INSERT INTO print_sectors (company_id, key, label, icon, sort_order, is_default)
SELECT id, 'cozinha_2', 'Cozinha 2', '👩‍🍳', 2, true FROM companies
ON CONFLICT (company_id, key) DO NOTHING;
INSERT INTO print_sectors (company_id, key, label, icon, sort_order, is_default)
SELECT id, 'cozinha_3', 'Cozinha 3', '🧑‍🍳', 3, true FROM companies
ON CONFLICT (company_id, key) DO NOTHING;
INSERT INTO print_sectors (company_id, key, label, icon, sort_order, is_default)
SELECT id, 'copa_bar',  'Copa/Bar',  '🍹', 4, true FROM companies
ON CONFLICT (company_id, key) DO NOTHING;

-- Remove CHECK constraint do printer_jobs.sector pra aceitar setores custom
ALTER TABLE printer_jobs DROP CONSTRAINT IF EXISTS printer_jobs_sector_check;
