-- v1.0.0 — Numeração unificada de pedidos (sequencial diário por company)
-- Padrão usado por iFood/Anota AI/Saipos: #001, #002 reseta meia-noite (BRT)
-- Cobre TODAS fontes: WhatsApp, cardápio digital, PDV, app entregador

-- Tabela de sequências (1 row por company+dia)
CREATE TABLE IF NOT EXISTS order_sequences (
  company_id   uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  date_key     date NOT NULL,
  last_number  integer NOT NULL DEFAULT 0,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, date_key)
);

CREATE INDEX IF NOT EXISTS idx_order_sequences_company ON order_sequences(company_id, date_key DESC);

-- Função atomic: incrementa + retorna número
-- Race-safe via UPSERT (PostgreSQL ON CONFLICT)
CREATE OR REPLACE FUNCTION next_order_number(p_company_id uuid)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_date date;
  v_next integer;
BEGIN
  -- Data atual no fuso BRT (America/Sao_Paulo)
  v_date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;

  -- Atomic UPSERT + increment
  INSERT INTO order_sequences (company_id, date_key, last_number)
  VALUES (p_company_id, v_date, 1)
  ON CONFLICT (company_id, date_key)
  DO UPDATE SET last_number = order_sequences.last_number + 1,
                updated_at  = now()
  RETURNING last_number INTO v_next;

  RETURN v_next;
END;
$$;

-- Trigger BEFORE INSERT: preenche order_number SE NULL
-- Não sobrescreve valor explícito (compat)
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := next_order_number(NEW.company_id)::text;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_order_number ON orders;
CREATE TRIGGER trg_set_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_order_number();

-- Backfill da sequência atual: pega max(order_number numérico) de hoje por company
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT company_id,
           MAX(CAST(NULLIF(regexp_replace(order_number, '[^0-9]', '', 'g'), '') AS integer)) AS max_n
    FROM orders
    WHERE order_number IS NOT NULL
      AND (created_at AT TIME ZONE 'America/Sao_Paulo')::date = (now() AT TIME ZONE 'America/Sao_Paulo')::date
    GROUP BY company_id
  LOOP
    INSERT INTO order_sequences (company_id, date_key, last_number)
    VALUES (rec.company_id, (now() AT TIME ZONE 'America/Sao_Paulo')::date, COALESCE(rec.max_n, 0))
    ON CONFLICT (company_id, date_key) DO UPDATE SET last_number = GREATEST(order_sequences.last_number, EXCLUDED.last_number);
  END LOOP;
END $$;

COMMENT ON TABLE order_sequences IS 'Sequência atomic por company+dia (reset 00:00 BRT)';
COMMENT ON FUNCTION next_order_number IS 'Retorna próximo número sequencial diário por company';
