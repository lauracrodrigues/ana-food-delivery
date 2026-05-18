-- v1.0.0 — Camada Caixa (FASE 3)
-- Aditiva. Suporta múltiplas aberturas/fechamentos/dia.
-- Comunicação: faturar_movimento (FASE 2) consulta fin_caixa.status='aberto'

-- ════════════════════════════════════════════════════════════════
-- 1. fin_caixa — sessão de caixa (abertura → fechamento)
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.fin_caixa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  -- Operador (auth user) responsável
  aberto_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  fechado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  operador_nome TEXT,
  -- Valores
  valor_inicial NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (valor_inicial >= 0),
  valor_contado NUMERIC(12,2), -- preenchido no fechamento
  valor_sistema NUMERIC(12,2), -- esperado calculado
  quebra NUMERIC(12,2),         -- contado - sistema (negativo = falta dinheiro)
  -- Status: aberto | fechado | reaberto
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'fechado')),
  -- Timestamps
  aberto_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  fechado_em TIMESTAMPTZ,
  observacoes TEXT,
  -- Idempotência: 1 caixa aberto por company (constraint via partial unique index abaixo)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Só 1 caixa 'aberto' por company (evita 2 aberturas paralelas)
CREATE UNIQUE INDEX IF NOT EXISTS idx_fin_caixa_unique_aberto
  ON fin_caixa(company_id) WHERE status = 'aberto';

CREATE INDEX IF NOT EXISTS idx_fin_caixa_company_data
  ON fin_caixa(company_id, aberto_em DESC);

ALTER TABLE fin_caixa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin gerencia caixa" ON fin_caixa FOR ALL USING (
  company_id IN (
    SELECT id FROM companies WHERE owner_id = auth.uid()
    UNION SELECT company_id FROM user_roles WHERE user_id = auth.uid() AND company_id IS NOT NULL
  )
);

-- ════════════════════════════════════════════════════════════════
-- 2. fin_caixa_movimentos — entradas/saídas do caixa
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.fin_caixa_movimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caixa_id uuid NOT NULL REFERENCES fin_caixa(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  -- Tipo: venda_dinheiro (auto via faturar), suprimento, sangria_despesa, sangria_cofre
  tipo TEXT NOT NULL CHECK (tipo IN ('venda_dinheiro', 'suprimento', 'sangria_despesa', 'sangria_cofre', 'ajuste')),
  valor NUMERIC(12,2) NOT NULL CHECK (valor > 0),
  -- Sinal: +1 entrada, -1 saída
  sinal INT NOT NULL CHECK (sinal IN (-1, 1)),
  motivo TEXT,
  -- Vínculos opcionais
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  -- Operador
  registrado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fin_caixa_mov_caixa ON fin_caixa_movimentos(caixa_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fin_caixa_mov_company ON fin_caixa_movimentos(company_id, created_at DESC);

ALTER TABLE fin_caixa_movimentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin vê movimentos caixa" ON fin_caixa_movimentos FOR ALL USING (
  company_id IN (
    SELECT id FROM companies WHERE owner_id = auth.uid()
    UNION SELECT company_id FROM user_roles WHERE user_id = auth.uid() AND company_id IS NOT NULL
  )
);

-- ════════════════════════════════════════════════════════════════
-- 3. RPC: abrir_caixa
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.abrir_caixa(
  p_company_id uuid,
  p_valor_inicial NUMERIC DEFAULT 0,
  p_operador_nome TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_caixa_id uuid;
  v_aberto_existe BOOLEAN;
BEGIN
  IF p_company_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'company_id obrigatório');
  END IF;

  -- Verifica caixa aberto existente
  SELECT EXISTS (SELECT 1 FROM fin_caixa WHERE company_id = p_company_id AND status = 'aberto')
  INTO v_aberto_existe;

  IF v_aberto_existe THEN
    RETURN jsonb_build_object('success', false, 'error', 'caixa_ja_aberto',
      'message', 'Existe caixa aberto. Feche o atual antes de abrir novo.');
  END IF;

  INSERT INTO fin_caixa (company_id, valor_inicial, operador_nome, aberto_por)
  VALUES (p_company_id, p_valor_inicial, p_operador_nome, auth.uid())
  RETURNING id INTO v_caixa_id;

  RETURN jsonb_build_object('success', true, 'caixa_id', v_caixa_id, 'valor_inicial', p_valor_inicial);
END;
$$;
GRANT EXECUTE ON FUNCTION public.abrir_caixa(uuid, numeric, text) TO authenticated, service_role;

-- ════════════════════════════════════════════════════════════════
-- 4. RPC: registrar_movimento_caixa
-- Suprimento, sangria (despesa/cofre), ajuste
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.registrar_movimento_caixa(
  p_company_id uuid,
  p_tipo TEXT,
  p_valor NUMERIC,
  p_motivo TEXT DEFAULT NULL,
  p_order_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_caixa_id uuid;
  v_sinal INT;
  v_mov_id uuid;
BEGIN
  IF p_tipo NOT IN ('venda_dinheiro', 'suprimento', 'sangria_despesa', 'sangria_cofre', 'ajuste') THEN
    RETURN jsonb_build_object('success', false, 'error', 'tipo_invalido');
  END IF;

  -- Sinal: entrada = +1, saída = -1
  v_sinal := CASE
    WHEN p_tipo IN ('venda_dinheiro', 'suprimento') THEN 1
    WHEN p_tipo IN ('sangria_despesa', 'sangria_cofre') THEN -1
    ELSE 1
  END;

  -- Pega caixa aberto atual
  SELECT id INTO v_caixa_id FROM fin_caixa
  WHERE company_id = p_company_id AND status = 'aberto' LIMIT 1;

  IF v_caixa_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'caixa_fechado',
      'message', 'Abra o caixa antes de registrar movimentos');
  END IF;

  INSERT INTO fin_caixa_movimentos (caixa_id, company_id, tipo, valor, sinal, motivo, order_id, registrado_por)
  VALUES (v_caixa_id, p_company_id, p_tipo, p_valor, v_sinal, p_motivo, p_order_id, auth.uid())
  RETURNING id INTO v_mov_id;

  -- TODO FASE 4: criar fin_lancamento espelhando o movimento
  RETURN jsonb_build_object('success', true, 'movimento_id', v_mov_id, 'caixa_id', v_caixa_id);
END;
$$;
GRANT EXECUTE ON FUNCTION public.registrar_movimento_caixa(uuid, text, numeric, text, uuid) TO authenticated, service_role;

-- ════════════════════════════════════════════════════════════════
-- 5. RPC: fechar_caixa — calcula quebra
-- valor_sistema = valor_inicial + (entradas - saídas)
-- quebra = valor_contado - valor_sistema
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fechar_caixa(
  p_caixa_id uuid,
  p_valor_contado NUMERIC
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_caixa RECORD;
  v_total_entradas NUMERIC(12,2);
  v_total_saidas NUMERIC(12,2);
  v_valor_sistema NUMERIC(12,2);
  v_quebra NUMERIC(12,2);
BEGIN
  SELECT * INTO v_caixa FROM fin_caixa WHERE id = p_caixa_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'caixa não encontrado');
  END IF;
  IF v_caixa.status = 'fechado' THEN
    RETURN jsonb_build_object('success', false, 'error', 'caixa já fechado');
  END IF;

  -- Agrega entradas/saídas
  SELECT
    COALESCE(SUM(CASE WHEN sinal = 1 THEN valor ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN sinal = -1 THEN valor ELSE 0 END), 0)
  INTO v_total_entradas, v_total_saidas
  FROM fin_caixa_movimentos WHERE caixa_id = p_caixa_id;

  v_valor_sistema := v_caixa.valor_inicial + v_total_entradas - v_total_saidas;
  v_quebra := p_valor_contado - v_valor_sistema;

  UPDATE fin_caixa SET
    status = 'fechado',
    valor_contado = p_valor_contado,
    valor_sistema = v_valor_sistema,
    quebra = v_quebra,
    fechado_em = now(),
    fechado_por = auth.uid()
  WHERE id = p_caixa_id;

  RETURN jsonb_build_object(
    'success', true,
    'caixa_id', p_caixa_id,
    'valor_inicial', v_caixa.valor_inicial,
    'total_entradas', v_total_entradas,
    'total_saidas', v_total_saidas,
    'valor_sistema', v_valor_sistema,
    'valor_contado', p_valor_contado,
    'quebra', v_quebra,
    -- Indicador visual
    'quebra_status', CASE
      WHEN v_quebra = 0 THEN 'ok'
      WHEN v_quebra > 0 THEN 'sobra'
      ELSE 'falta'
    END
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.fechar_caixa(uuid, numeric) TO authenticated, service_role;

-- ════════════════════════════════════════════════════════════════
-- 6. RPC: get_caixa_atual — retorna caixa aberto + resumo movimentos
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_caixa_atual(p_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_caixa RECORD;
  v_movimentos jsonb;
  v_total_entradas NUMERIC(12,2);
  v_total_saidas NUMERIC(12,2);
BEGIN
  SELECT * INTO v_caixa FROM fin_caixa
  WHERE company_id = p_company_id AND status = 'aberto' LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('aberto', false);
  END IF;

  SELECT
    COALESCE(SUM(CASE WHEN sinal = 1 THEN valor ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN sinal = -1 THEN valor ELSE 0 END), 0),
    COALESCE(jsonb_agg(jsonb_build_object(
      'id', id, 'tipo', tipo, 'valor', valor, 'sinal', sinal, 'motivo', motivo, 'created_at', created_at
    ) ORDER BY created_at DESC), '[]'::jsonb)
  INTO v_total_entradas, v_total_saidas, v_movimentos
  FROM fin_caixa_movimentos WHERE caixa_id = v_caixa.id;

  RETURN jsonb_build_object(
    'aberto', true,
    'caixa_id', v_caixa.id,
    'aberto_em', v_caixa.aberto_em,
    'operador', v_caixa.operador_nome,
    'valor_inicial', v_caixa.valor_inicial,
    'total_entradas', v_total_entradas,
    'total_saidas', v_total_saidas,
    'saldo_esperado', v_caixa.valor_inicial + v_total_entradas - v_total_saidas,
    'movimentos', v_movimentos
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_caixa_atual(uuid) TO authenticated, service_role;

-- ════════════════════════════════════════════════════════════════
-- 7. TRIGGER: ao faturar pedido dinheiro+balcao, registra venda_dinheiro auto no caixa
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.trg_registra_venda_dinheiro()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_caixa_id uuid;
BEGIN
  -- Só atua quando stage muda pra faturado + dinheiro físico
  IF NEW.stage = 'faturado'
     AND (OLD.stage IS DISTINCT FROM NEW.stage)
     AND NEW.origin = 'balcao'
     AND NEW.payment_method IN ('dinheiro', 'cash')
  THEN
    SELECT id INTO v_caixa_id FROM fin_caixa
    WHERE company_id = NEW.company_id AND status = 'aberto' LIMIT 1;

    IF v_caixa_id IS NOT NULL THEN
      INSERT INTO fin_caixa_movimentos (caixa_id, company_id, tipo, valor, sinal, motivo, order_id)
      VALUES (v_caixa_id, NEW.company_id, 'venda_dinheiro', NEW.total, 1,
              'Venda balcão #' || COALESCE(NEW.order_number::text, ''), NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_caixa_venda ON orders;
CREATE TRIGGER trg_orders_caixa_venda
  AFTER UPDATE OF stage ON orders
  FOR EACH ROW EXECUTE FUNCTION trg_registra_venda_dinheiro();
