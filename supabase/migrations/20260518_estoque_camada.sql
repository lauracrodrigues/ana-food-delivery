-- v1.0.0 — Camada de Estoque (FASE 1)
-- ADITIVA: zero impacto em fluxos existentes (delivery sem controla_lote continua igual)
-- Comunicação por evento: faturar movimento → motor FIFO abate matéria-prima
-- Multi-tenant: tudo com company_id + RLS

-- ════════════════════════════════════════════════════════════════
-- 1. EXTENSÕES no cadastro existente (defaults seguros)
-- ════════════════════════════════════════════════════════════════

-- products.unidade_venda — UN (default) ou KG. Atributo do cadastro do produto.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS unidade_venda TEXT NOT NULL DEFAULT 'UN'
  CHECK (unidade_venda IN ('UN', 'KG'));

COMMENT ON COLUMN public.products.unidade_venda IS
  'UN = unidade contável (default delivery); KG = peso (distribuidora). Define se venda informa quantidade ou peso.';

-- ════════════════════════════════════════════════════════════════
-- 2. estoque_materia_prima — insumos que abatem ao vender
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.estoque_materia_prima (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  unidade_estoque TEXT NOT NULL DEFAULT 'UN' CHECK (unidade_estoque IN ('UN', 'KG', 'L', 'G', 'ML')),
  controla_lote BOOLEAN NOT NULL DEFAULT false,
  -- Saldo direto (quando NÃO controla lote)
  saldo NUMERIC(14,3) NOT NULL DEFAULT 0,
  -- Estoque mínimo pra alerta
  estoque_minimo NUMERIC(14,3),
  -- Custo médio (calculado conforme entradas)
  custo_medio NUMERIC(12,4) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mp_company ON estoque_materia_prima(company_id, is_active);

ALTER TABLE estoque_materia_prima ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin gerencia matéria-prima" ON estoque_materia_prima FOR ALL USING (
  company_id IN (
    SELECT id FROM companies WHERE owner_id = auth.uid()
    UNION SELECT company_id FROM user_roles WHERE user_id = auth.uid() AND company_id IS NOT NULL
  )
);

-- ════════════════════════════════════════════════════════════════
-- 3. estoque_composicao — produto → matéria-prima (ficha técnica)
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.estoque_composicao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  materia_prima_id uuid NOT NULL REFERENCES estoque_materia_prima(id) ON DELETE RESTRICT,
  -- Quantidade de matéria-prima consumida por UNIDADE vendida do produto
  qtd_por_unidade NUMERIC(14,4) NOT NULL CHECK (qtd_por_unidade > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, materia_prima_id)
);
CREATE INDEX IF NOT EXISTS idx_comp_product ON estoque_composicao(product_id);
CREATE INDEX IF NOT EXISTS idx_comp_mp ON estoque_composicao(materia_prima_id);

ALTER TABLE estoque_composicao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin gerencia composição" ON estoque_composicao FOR ALL USING (
  company_id IN (
    SELECT id FROM companies WHERE owner_id = auth.uid()
    UNION SELECT company_id FROM user_roles WHERE user_id = auth.uid() AND company_id IS NOT NULL
  )
);

-- ════════════════════════════════════════════════════════════════
-- 4. estoque_lotes — só se controla_lote
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.estoque_lotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  materia_prima_id uuid NOT NULL REFERENCES estoque_materia_prima(id) ON DELETE RESTRICT,
  -- Identificação do lote
  codigo TEXT,
  fornecedor_id uuid REFERENCES distributors(id) ON DELETE SET NULL,
  fornecedor_nome TEXT, -- snapshot pra histórico
  caminhao TEXT,
  data_recebimento TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Quantidades (em unidade_estoque da matéria-prima)
  qtd_esperada NUMERIC(14,3) NOT NULL CHECK (qtd_esperada > 0),
  qtd_recebida NUMERIC(14,3) NOT NULL CHECK (qtd_recebida >= 0),
  qtd_vendida NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (qtd_vendida >= 0),
  qtd_perda NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (qtd_perda >= 0),
  -- Custo total do lote
  custo_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  -- Status: aberto (consumindo) | esgotado | fechado (não usar mais)
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'esgotado', 'fechado')),
  -- FIFO order — qtd_recebimento ASC pra consumir mais antigo primeiro
  ordem_fifo BIGSERIAL,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lote_company_mp ON estoque_lotes(company_id, materia_prima_id, status, ordem_fifo);

ALTER TABLE estoque_lotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin gerencia lotes" ON estoque_lotes FOR ALL USING (
  company_id IN (
    SELECT id FROM companies WHERE owner_id = auth.uid()
    UNION SELECT company_id FROM user_roles WHERE user_id = auth.uid() AND company_id IS NOT NULL
  )
);

-- ════════════════════════════════════════════════════════════════
-- 5. estoque_movimentos — toda entrada/baixa (rastreabilidade)
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.estoque_movimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  materia_prima_id uuid NOT NULL REFERENCES estoque_materia_prima(id) ON DELETE RESTRICT,
  -- Tipo movimento
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'baixa_venda', 'baixa_perda', 'ajuste_manual')),
  qtd NUMERIC(14,3) NOT NULL,
  -- Vínculos
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  lote_id uuid REFERENCES estoque_lotes(id) ON DELETE SET NULL,
  -- Saldo após (snapshot pra auditoria)
  saldo_apos NUMERIC(14,3),
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mov_company_mp ON estoque_movimentos(company_id, materia_prima_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mov_order ON estoque_movimentos(order_id) WHERE order_id IS NOT NULL;

ALTER TABLE estoque_movimentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin vê movimentos" ON estoque_movimentos FOR SELECT USING (
  company_id IN (
    SELECT id FROM companies WHERE owner_id = auth.uid()
    UNION SELECT company_id FROM user_roles WHERE user_id = auth.uid() AND company_id IS NOT NULL
  )
);

-- ════════════════════════════════════════════════════════════════
-- 6. estoque_lote_alocacoes — qual lote saiu cada parte (rollover FIFO)
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.estoque_lote_alocacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movimento_id uuid NOT NULL REFERENCES estoque_movimentos(id) ON DELETE CASCADE,
  lote_id uuid NOT NULL REFERENCES estoque_lotes(id) ON DELETE RESTRICT,
  qtd NUMERIC(14,3) NOT NULL CHECK (qtd > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_aloc_mov ON estoque_lote_alocacoes(movimento_id);
CREATE INDEX IF NOT EXISTS idx_aloc_lote ON estoque_lote_alocacoes(lote_id);

-- ════════════════════════════════════════════════════════════════
-- 7. estoque_perdas — registro explícito (motivo, data)
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.estoque_perdas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  materia_prima_id uuid NOT NULL REFERENCES estoque_materia_prima(id) ON DELETE RESTRICT,
  lote_id uuid REFERENCES estoque_lotes(id) ON DELETE SET NULL,
  qtd NUMERIC(14,3) NOT NULL CHECK (qtd > 0),
  motivo TEXT NOT NULL,
  data_perda TIMESTAMPTZ NOT NULL DEFAULT now(),
  registrado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_perdas_company ON estoque_perdas(company_id, data_perda DESC);

ALTER TABLE estoque_perdas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin gerencia perdas" ON estoque_perdas FOR ALL USING (
  company_id IN (
    SELECT id FROM companies WHERE owner_id = auth.uid()
    UNION SELECT company_id FROM user_roles WHERE user_id = auth.uid() AND company_id IS NOT NULL
  )
);

-- ════════════════════════════════════════════════════════════════
-- 8. FUNÇÃO: estoque_balanco_lote(lote_id)
-- Retorna esperado x recebido x vendido x perda x diferença
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.estoque_balanco_lote(p_lote_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_lote estoque_lotes%ROWTYPE;
  v_diferenca NUMERIC(14,3);
BEGIN
  SELECT * INTO v_lote FROM estoque_lotes WHERE id = p_lote_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Lote não encontrado');
  END IF;

  -- diferença = recebida - (vendida + perda) = saldo atual no lote
  v_diferenca := v_lote.qtd_recebida - (v_lote.qtd_vendida + v_lote.qtd_perda);

  RETURN jsonb_build_object(
    'lote_id', v_lote.id,
    'codigo', v_lote.codigo,
    'fornecedor', v_lote.fornecedor_nome,
    'caminhao', v_lote.caminhao,
    'esperado', v_lote.qtd_esperada,
    'recebido', v_lote.qtd_recebida,
    'vendido', v_lote.qtd_vendida,
    'perda', v_lote.qtd_perda,
    'saldo_atual', v_diferenca,
    -- Diferença de recebimento (caso 1000 kg a menos)
    'diferenca_recebimento', v_lote.qtd_recebida - v_lote.qtd_esperada,
    'status', v_lote.status,
    'custo_total', v_lote.custo_total,
    'custo_unitario', CASE WHEN v_lote.qtd_recebida > 0 THEN v_lote.custo_total / v_lote.qtd_recebida ELSE 0 END
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.estoque_balanco_lote(uuid) TO authenticated, service_role;

-- ════════════════════════════════════════════════════════════════
-- 9. MOTOR FIFO: baixa_estoque_por_order
-- Chamado pelo evento "movimento_faturado" (FASE 2)
-- Lê composição → abate matéria-prima → rollover de lote se controla_lote
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.baixa_estoque_por_order(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_item JSONB;
  v_qtd_item NUMERIC(14,3);
  v_product_id uuid;
  v_comp RECORD;
  v_mp RECORD;
  v_qtd_total_consumir NUMERIC(14,3);
  v_qtd_restante NUMERIC(14,3);
  v_lote RECORD;
  v_qtd_lote NUMERIC(14,3);
  v_mov_id uuid;
  v_resultado JSONB := '[]'::jsonb;
  v_alocacoes JSONB;
BEGIN
  SELECT id, company_id, items INTO v_order FROM orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order não encontrada');
  END IF;

  -- Itera cada item do pedido
  FOR v_item IN SELECT * FROM jsonb_array_elements(coalesce(v_order.items, '[]'::jsonb))
  LOOP
    v_qtd_item := COALESCE((v_item->>'quantity')::numeric, 1);
    v_product_id := (v_item->>'product_id')::uuid;
    IF v_product_id IS NULL THEN CONTINUE; END IF;

    -- Pra cada matéria-prima na composição do produto
    FOR v_comp IN
      SELECT c.qtd_por_unidade, c.materia_prima_id,
             m.id AS mp_id, m.nome AS mp_nome, m.controla_lote, m.saldo
      FROM estoque_composicao c
      JOIN estoque_materia_prima m ON m.id = c.materia_prima_id
      WHERE c.product_id = v_product_id
        AND c.company_id = v_order.company_id
        AND m.is_active = true
    LOOP
      v_qtd_total_consumir := v_comp.qtd_por_unidade * v_qtd_item;
      v_alocacoes := '[]'::jsonb;

      IF v_comp.controla_lote THEN
        -- ROLLOVER FIFO: consome dos lotes mais antigos primeiro
        v_qtd_restante := v_qtd_total_consumir;

        -- Cria movimento principal (referência pra alocações)
        INSERT INTO estoque_movimentos (company_id, materia_prima_id, tipo, qtd, order_id, saldo_apos)
        VALUES (v_order.company_id, v_comp.mp_id, 'baixa_venda', v_qtd_total_consumir, p_order_id, NULL)
        RETURNING id INTO v_mov_id;

        -- Loop alocação: lotes abertos, FIFO por ordem_fifo
        FOR v_lote IN
          SELECT id, qtd_recebida, qtd_vendida, qtd_perda, codigo
          FROM estoque_lotes
          WHERE materia_prima_id = v_comp.mp_id
            AND company_id = v_order.company_id
            AND status = 'aberto'
          ORDER BY ordem_fifo ASC
        LOOP
          EXIT WHEN v_qtd_restante <= 0;
          v_qtd_lote := LEAST(v_qtd_restante, v_lote.qtd_recebida - v_lote.qtd_vendida - v_lote.qtd_perda);
          IF v_qtd_lote <= 0 THEN CONTINUE; END IF;

          -- Aloca + atualiza lote
          INSERT INTO estoque_lote_alocacoes (movimento_id, lote_id, qtd)
          VALUES (v_mov_id, v_lote.id, v_qtd_lote);

          UPDATE estoque_lotes
          SET qtd_vendida = qtd_vendida + v_qtd_lote,
              status = CASE
                WHEN (qtd_recebida - qtd_vendida - v_qtd_lote - qtd_perda) <= 0 THEN 'esgotado'
                ELSE status
              END,
              updated_at = now()
          WHERE id = v_lote.id;

          v_alocacoes := v_alocacoes || jsonb_build_object(
            'lote_id', v_lote.id, 'codigo', v_lote.codigo, 'qtd', v_qtd_lote
          );
          v_qtd_restante := v_qtd_restante - v_qtd_lote;
        END LOOP;

        -- Faltou estoque? Registra mas alerta (NÃO bloqueia — permissivo)
        IF v_qtd_restante > 0 THEN
          v_alocacoes := v_alocacoes || jsonb_build_object('faltou', v_qtd_restante);
        END IF;

      ELSE
        -- SEM CONTROLE DE LOTE: baixa direta do saldo (caminho atual delivery)
        UPDATE estoque_materia_prima
        SET saldo = saldo - v_qtd_total_consumir, updated_at = now()
        WHERE id = v_comp.mp_id
        RETURNING saldo INTO v_qtd_restante;

        INSERT INTO estoque_movimentos (company_id, materia_prima_id, tipo, qtd, order_id, saldo_apos)
        VALUES (v_order.company_id, v_comp.mp_id, 'baixa_venda', v_qtd_total_consumir, p_order_id, v_qtd_restante);
      END IF;

      v_resultado := v_resultado || jsonb_build_object(
        'materia_prima_id', v_comp.mp_id,
        'nome', v_comp.mp_nome,
        'qtd_baixada', v_qtd_total_consumir,
        'alocacoes', v_alocacoes,
        'controla_lote', v_comp.controla_lote
      );
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'baixas', v_resultado);
END;
$$;
GRANT EXECUTE ON FUNCTION public.baixa_estoque_por_order(uuid) TO authenticated, service_role;

-- ════════════════════════════════════════════════════════════════
-- 10. updated_at triggers (mantém timestamp atualizado)
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public._touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_estoque_mp_updated_at
  BEFORE UPDATE ON estoque_materia_prima
  FOR EACH ROW EXECUTE FUNCTION _touch_updated_at();

CREATE TRIGGER trg_estoque_lotes_updated_at
  BEFORE UPDATE ON estoque_lotes
  FOR EACH ROW EXECUTE FUNCTION _touch_updated_at();
