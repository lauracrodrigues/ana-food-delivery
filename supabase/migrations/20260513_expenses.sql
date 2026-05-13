-- Despesas operacionais por empresa (Fase 3 — Movimentações financeiras)
CREATE TABLE IF NOT EXISTS expenses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  category    TEXT NOT NULL DEFAULT 'outros',
  -- 'insumos', 'aluguel', 'funcionarios', 'marketing', 'servicos', 'impostos', 'outros'
  description TEXT NOT NULL,
  amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  recurrent   BOOLEAN NOT NULL DEFAULT false,  -- se é despesa fixa mensal
  notes       TEXT,
  created_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: empresa só vê suas próprias despesas
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expenses_company_isolation"
  ON expenses FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Índices para queries de relatório
CREATE INDEX IF NOT EXISTS expenses_company_date ON expenses(company_id, date DESC);
CREATE INDEX IF NOT EXISTS expenses_company_category ON expenses(company_id, category);
