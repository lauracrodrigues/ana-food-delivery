-- v1.0.0 — Camada Financeira Aprofundada (FASE 4)
-- Plano de contas, lançamentos, títulos, transferências, DRE, Fluxo Caixa
-- Aditiva: telas atuais (Financeiro/Despesas/DRE) lerão dessa base sem quebra

-- ════════════════════════════════════════════════════════════════
-- 1. fin_contas — onde o dinheiro está
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.fin_contas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('caixa', 'cofre', 'banco', 'carteira', 'cartao_credito')),
  -- Banco específico
  banco TEXT,
  agencia TEXT,
  conta_num TEXT,
  -- Saldo atual (atualizado por triggers)
  saldo NUMERIC(14,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false, -- conta padrão pra lançamentos
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fin_contas_company ON fin_contas(company_id, is_active);

ALTER TABLE fin_contas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin gerencia contas" ON fin_contas FOR ALL USING (
  company_id IN (
    SELECT id FROM companies WHERE owner_id = auth.uid()
    UNION SELECT company_id FROM user_roles WHERE user_id = auth.uid() AND company_id IS NOT NULL
  )
);

-- ════════════════════════════════════════════════════════════════
-- 2. fin_categorias — plano de contas gerencial hierárquico
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.fin_categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES fin_categorias(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('receita', 'despesa')),
  -- Código contábil opcional
  codigo TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_system BOOLEAN NOT NULL DEFAULT false, -- categoria criada por seed (não pode ser deletada)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fin_cat_company ON fin_categorias(company_id, tipo, is_active);
CREATE INDEX IF NOT EXISTS idx_fin_cat_parent ON fin_categorias(parent_id);

ALTER TABLE fin_categorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin gerencia categorias" ON fin_categorias FOR ALL USING (
  company_id IN (
    SELECT id FROM companies WHERE owner_id = auth.uid()
    UNION SELECT company_id FROM user_roles WHERE user_id = auth.uid() AND company_id IS NOT NULL
  )
);

-- ════════════════════════════════════════════════════════════════
-- 3. fin_lancamentos — núcleo financeiro
-- conta + categoria + valor + data_competencia + data_caixa
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.fin_lancamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  conta_id uuid NOT NULL REFERENCES fin_contas(id) ON DELETE RESTRICT,
  categoria_id uuid REFERENCES fin_categorias(id) ON DELETE SET NULL,
  -- Movimento
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  valor NUMERIC(14,2) NOT NULL CHECK (valor > 0),
  descricao TEXT,
  -- Regime competência (quando ocorreu o fato) x caixa (quando o dinheiro mexeu)
  data_competencia DATE NOT NULL,
  data_caixa DATE,
  -- Origem do lançamento (rastreabilidade)
  origem TEXT NOT NULL DEFAULT 'manual'
    CHECK (origem IN ('manual', 'movimento', 'titulo', 'sangria', 'suprimento', 'transferencia', 'baixa_titulo')),
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  titulo_id uuid, -- FK pra fin_titulos (defined later)
  -- Operador
  registrado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fin_lanc_company_data ON fin_lancamentos(company_id, data_competencia DESC);
CREATE INDEX IF NOT EXISTS idx_fin_lanc_company_caixa ON fin_lancamentos(company_id, data_caixa) WHERE data_caixa IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fin_lanc_categoria ON fin_lancamentos(categoria_id, tipo);
CREATE INDEX IF NOT EXISTS idx_fin_lanc_origem ON fin_lancamentos(origem, order_id);

ALTER TABLE fin_lancamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin gerencia lançamentos" ON fin_lancamentos FOR ALL USING (
  company_id IN (
    SELECT id FROM companies WHERE owner_id = auth.uid()
    UNION SELECT company_id FROM user_roles WHERE user_id = auth.uid() AND company_id IS NOT NULL
  )
);

-- ════════════════════════════════════════════════════════════════
-- 4. fin_titulos — contas a pagar / a receber (FIADO distribuidora)
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.fin_titulos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('pagar', 'receber')),
  -- Cliente (receber) ou fornecedor (pagar)
  cliente_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  fornecedor_id uuid REFERENCES distributors(id) ON DELETE SET NULL,
  contraparte_nome TEXT, -- snapshot caso cliente/fornecedor deletado
  -- Valores
  valor_original NUMERIC(14,2) NOT NULL CHECK (valor_original > 0),
  valor_pago NUMERIC(14,2) NOT NULL DEFAULT 0,
  saldo NUMERIC(14,2) GENERATED ALWAYS AS (valor_original - valor_pago) STORED,
  -- Vencimento
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  data_vencimento DATE NOT NULL,
  data_baixa_completa DATE,
  -- Status: aberto | parcial | pago | cancelado | vencido (computed)
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'parcial', 'pago', 'cancelado')),
  -- Categoria padrão pra lançamento da baixa
  categoria_id uuid REFERENCES fin_categorias(id) ON DELETE SET NULL,
  -- Vínculo origem (pedido fiado, NF-e fornecedor, etc)
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  numero_documento TEXT,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fin_tit_company_tipo ON fin_titulos(company_id, tipo, status);
CREATE INDEX IF NOT EXISTS idx_fin_tit_venc ON fin_titulos(company_id, data_vencimento) WHERE status IN ('aberto', 'parcial');
CREATE INDEX IF NOT EXISTS idx_fin_tit_cliente ON fin_titulos(cliente_id) WHERE cliente_id IS NOT NULL;

-- Agora adiciona FK em fin_lancamentos.titulo_id
ALTER TABLE fin_lancamentos
  ADD CONSTRAINT fk_fin_lanc_titulo FOREIGN KEY (titulo_id) REFERENCES fin_titulos(id) ON DELETE SET NULL;

ALTER TABLE fin_titulos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin gerencia títulos" ON fin_titulos FOR ALL USING (
  company_id IN (
    SELECT id FROM companies WHERE owner_id = auth.uid()
    UNION SELECT company_id FROM user_roles WHERE user_id = auth.uid() AND company_id IS NOT NULL
  )
);

-- ════════════════════════════════════════════════════════════════
-- 5. fin_transferencias — entre contas (sangria caixa→cofre, etc)
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.fin_transferencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  conta_origem_id uuid NOT NULL REFERENCES fin_contas(id) ON DELETE RESTRICT,
  conta_destino_id uuid NOT NULL REFERENCES fin_contas(id) ON DELETE RESTRICT,
  valor NUMERIC(14,2) NOT NULL CHECK (valor > 0),
  data_transferencia DATE NOT NULL DEFAULT CURRENT_DATE,
  descricao TEXT,
  -- Lançamentos espelhados (origem saída, destino entrada)
  lanc_saida_id uuid REFERENCES fin_lancamentos(id) ON DELETE SET NULL,
  lanc_entrada_id uuid REFERENCES fin_lancamentos(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fin_trans_company ON fin_transferencias(company_id, data_transferencia DESC);

ALTER TABLE fin_transferencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin gerencia transferencias" ON fin_transferencias FOR ALL USING (
  company_id IN (
    SELECT id FROM companies WHERE owner_id = auth.uid()
    UNION SELECT company_id FROM user_roles WHERE user_id = auth.uid() AND company_id IS NOT NULL
  )
);

-- ════════════════════════════════════════════════════════════════
-- 6. TRIGGER: atualiza saldo da conta após lançamento
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.trg_atualiza_saldo_conta()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE fin_contas
    SET saldo = saldo + (CASE WHEN NEW.tipo = 'entrada' THEN NEW.valor ELSE -NEW.valor END),
        updated_at = now()
    WHERE id = NEW.conta_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE fin_contas
    SET saldo = saldo - (CASE WHEN OLD.tipo = 'entrada' THEN OLD.valor ELSE -OLD.valor END),
        updated_at = now()
    WHERE id = OLD.conta_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
DROP TRIGGER IF EXISTS trg_fin_lanc_saldo ON fin_lancamentos;
CREATE TRIGGER trg_fin_lanc_saldo
  AFTER INSERT OR DELETE ON fin_lancamentos
  FOR EACH ROW EXECUTE FUNCTION trg_atualiza_saldo_conta();

-- ════════════════════════════════════════════════════════════════
-- 7. SEED categorias padrão por empresa (chamado quando company criada)
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.seed_fin_categorias(p_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_count int;
BEGIN
  -- Skip se já tem
  SELECT count(*) INTO v_count FROM fin_categorias WHERE company_id = p_company_id;
  IF v_count > 0 THEN
    RETURN jsonb_build_object('skipped', true, 'existing', v_count);
  END IF;

  -- RECEITAS
  INSERT INTO fin_categorias (company_id, nome, tipo, codigo, is_system) VALUES
    (p_company_id, 'Venda de Produtos', 'receita', '3.01', true),
    (p_company_id, 'Receita Financeira', 'receita', '3.02', true),
    (p_company_id, 'Outras Receitas', 'receita', '3.99', true);

  -- DESPESAS
  INSERT INTO fin_categorias (company_id, nome, tipo, codigo, is_system) VALUES
    (p_company_id, 'Custo da Mercadoria Vendida', 'despesa', '4.01', true),
    (p_company_id, 'Despesa Operacional', 'despesa', '4.02', true),
    (p_company_id, 'Despesa com Pessoal', 'despesa', '4.03', true),
    (p_company_id, 'Despesa Financeira', 'despesa', '4.04', true),
    (p_company_id, 'Despesa Administrativa', 'despesa', '4.05', true),
    (p_company_id, 'Tributos e Taxas', 'despesa', '4.06', true);

  -- Conta padrão "Caixa Geral" se não existir
  IF NOT EXISTS (SELECT 1 FROM fin_contas WHERE company_id = p_company_id) THEN
    INSERT INTO fin_contas (company_id, nome, tipo, is_default)
    VALUES (p_company_id, 'Caixa Geral', 'caixa', true);
  END IF;

  RETURN jsonb_build_object('success', true, 'seeded', 9);
END;
$$;
GRANT EXECUTE ON FUNCTION public.seed_fin_categorias(uuid) TO authenticated, service_role;

-- ════════════════════════════════════════════════════════════════
-- 8. RPC: baixar_titulo — gera lançamento + atualiza valor_pago
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.baixar_titulo(
  p_titulo_id uuid,
  p_valor NUMERIC,
  p_conta_id uuid,
  p_data_caixa DATE DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_tit RECORD;
  v_lanc_id uuid;
  v_novo_pago NUMERIC;
  v_novo_status TEXT;
BEGIN
  SELECT * INTO v_tit FROM fin_titulos WHERE id = p_titulo_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'título não encontrado');
  END IF;
  IF v_tit.status IN ('pago', 'cancelado') THEN
    RETURN jsonb_build_object('success', false, 'error', 'título já ' || v_tit.status);
  END IF;
  IF p_valor > v_tit.saldo THEN
    RETURN jsonb_build_object('success', false, 'error', 'valor maior que saldo', 'saldo', v_tit.saldo);
  END IF;

  v_novo_pago := v_tit.valor_pago + p_valor;
  v_novo_status := CASE
    WHEN v_novo_pago >= v_tit.valor_original THEN 'pago'
    ELSE 'parcial'
  END;

  -- Cria lançamento (trigger atualiza saldo conta)
  INSERT INTO fin_lancamentos (
    company_id, conta_id, categoria_id,
    tipo, valor, descricao,
    data_competencia, data_caixa,
    origem, titulo_id, registrado_por
  ) VALUES (
    v_tit.company_id, p_conta_id, v_tit.categoria_id,
    CASE WHEN v_tit.tipo = 'receber' THEN 'entrada' ELSE 'saida' END,
    p_valor,
    'Baixa título ' || COALESCE(v_tit.numero_documento, v_tit.id::text),
    p_data_caixa, p_data_caixa,
    'baixa_titulo', p_titulo_id, auth.uid()
  ) RETURNING id INTO v_lanc_id;

  -- Atualiza título
  UPDATE fin_titulos SET
    valor_pago = v_novo_pago,
    status = v_novo_status,
    data_baixa_completa = CASE WHEN v_novo_status = 'pago' THEN p_data_caixa ELSE data_baixa_completa END,
    updated_at = now()
  WHERE id = p_titulo_id;

  RETURN jsonb_build_object(
    'success', true,
    'titulo_id', p_titulo_id,
    'lancamento_id', v_lanc_id,
    'valor_baixado', p_valor,
    'novo_saldo', v_tit.valor_original - v_novo_pago,
    'status', v_novo_status
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.baixar_titulo(uuid, numeric, uuid, date) TO authenticated, service_role;

-- ════════════════════════════════════════════════════════════════
-- 9. RPC: criar_transferencia
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.criar_transferencia(
  p_company_id uuid,
  p_conta_origem uuid,
  p_conta_destino uuid,
  p_valor NUMERIC,
  p_descricao TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_trans_id uuid;
  v_lanc_saida uuid;
  v_lanc_entrada uuid;
BEGIN
  IF p_conta_origem = p_conta_destino THEN
    RETURN jsonb_build_object('success', false, 'error', 'origem e destino iguais');
  END IF;
  IF p_valor <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'valor inválido');
  END IF;

  -- Lançamento saída na origem
  INSERT INTO fin_lancamentos (company_id, conta_id, tipo, valor, descricao, data_competencia, data_caixa, origem)
  VALUES (p_company_id, p_conta_origem, 'saida', p_valor, COALESCE(p_descricao, 'Transferência'), CURRENT_DATE, CURRENT_DATE, 'transferencia')
  RETURNING id INTO v_lanc_saida;

  -- Lançamento entrada no destino
  INSERT INTO fin_lancamentos (company_id, conta_id, tipo, valor, descricao, data_competencia, data_caixa, origem)
  VALUES (p_company_id, p_conta_destino, 'entrada', p_valor, COALESCE(p_descricao, 'Transferência'), CURRENT_DATE, CURRENT_DATE, 'transferencia')
  RETURNING id INTO v_lanc_entrada;

  -- Registra transferência espelhada
  INSERT INTO fin_transferencias (company_id, conta_origem_id, conta_destino_id, valor, descricao, lanc_saida_id, lanc_entrada_id)
  VALUES (p_company_id, p_conta_origem, p_conta_destino, p_valor, p_descricao, v_lanc_saida, v_lanc_entrada)
  RETURNING id INTO v_trans_id;

  RETURN jsonb_build_object('success', true, 'transferencia_id', v_trans_id);
END;
$$;
GRANT EXECUTE ON FUNCTION public.criar_transferencia(uuid, uuid, uuid, numeric, text) TO authenticated, service_role;

-- ════════════════════════════════════════════════════════════════
-- 10. VIEWS DRE + Fluxo Caixa
-- ════════════════════════════════════════════════════════════════

-- DRE — regime competência (data_competencia)
CREATE OR REPLACE VIEW public.v_dre AS
SELECT
  l.company_id,
  date_trunc('month', l.data_competencia) AS mes,
  c.tipo AS tipo_categoria,
  c.nome AS categoria,
  c.codigo,
  c.parent_id,
  SUM(l.valor) AS total
FROM fin_lancamentos l
LEFT JOIN fin_categorias c ON c.id = l.categoria_id
WHERE l.tipo IN ('entrada', 'saida')
GROUP BY l.company_id, date_trunc('month', l.data_competencia), c.tipo, c.nome, c.codigo, c.parent_id;

-- Fluxo Caixa — regime caixa (data_caixa)
CREATE OR REPLACE VIEW public.v_fluxo_caixa AS
SELECT
  l.company_id,
  l.conta_id,
  ct.nome AS conta,
  date_trunc('day', l.data_caixa) AS dia,
  SUM(CASE WHEN l.tipo = 'entrada' THEN l.valor ELSE 0 END) AS entradas,
  SUM(CASE WHEN l.tipo = 'saida' THEN l.valor ELSE 0 END) AS saidas,
  SUM(CASE WHEN l.tipo = 'entrada' THEN l.valor ELSE -l.valor END) AS saldo_dia
FROM fin_lancamentos l
LEFT JOIN fin_contas ct ON ct.id = l.conta_id
WHERE l.data_caixa IS NOT NULL
GROUP BY l.company_id, l.conta_id, ct.nome, date_trunc('day', l.data_caixa);

-- Contas a receber/pagar com status vencido computed
CREATE OR REPLACE VIEW public.v_titulos_abertos AS
SELECT
  t.*,
  CASE
    WHEN t.status IN ('aberto', 'parcial') AND t.data_vencimento < CURRENT_DATE THEN 'vencido'
    ELSE t.status
  END AS status_real,
  CURRENT_DATE - t.data_vencimento AS dias_vencimento
FROM fin_titulos t
WHERE t.status IN ('aberto', 'parcial');

GRANT SELECT ON v_dre, v_fluxo_caixa, v_titulos_abertos TO authenticated;

-- ════════════════════════════════════════════════════════════════
-- 11. Atualiza faturar_movimento pra criar fin_lancamento (receita)
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.faturar_movimento(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_baixa_result JSONB;
  v_caixa_aberto BOOLEAN;
  v_conta_padrao uuid;
  v_categoria_receita uuid;
  v_lanc_id uuid;
BEGIN
  SELECT id, company_id, stage, origin, payment_method, total, status, customer_id, customer_name, order_number, items
  INTO v_order FROM orders WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pedido não encontrado');
  END IF;
  IF v_order.stage = 'faturado' THEN
    RETURN jsonb_build_object('success', true, 'message', 'já faturado');
  END IF;
  IF v_order.stage = 'cancelado' THEN
    RETURN jsonb_build_object('success', false, 'error', 'pedido cancelado');
  END IF;

  -- Decisão B: caixa SE balcao+dinheiro
  IF v_order.origin = 'balcao' AND v_order.payment_method IN ('dinheiro', 'cash') THEN
    SELECT EXISTS (SELECT 1 FROM fin_caixa WHERE company_id = v_order.company_id AND status = 'aberto')
    INTO v_caixa_aberto;
    IF NOT v_caixa_aberto THEN
      RETURN jsonb_build_object('success', false, 'error', 'caixa_fechado',
        'message', 'Pagamento em dinheiro no balcão exige caixa aberto.');
    END IF;
  END IF;

  -- Atualiza stage
  UPDATE orders SET stage = 'faturado', updated_at = now() WHERE id = p_order_id;

  -- Baixa estoque (FASE 1)
  BEGIN
    SELECT baixa_estoque_por_order(p_order_id) INTO v_baixa_result;
  EXCEPTION WHEN OTHERS THEN
    v_baixa_result := jsonb_build_object('warning', SQLERRM);
  END;

  -- Cria lançamento financeiro de receita
  -- Conta padrão da empresa
  SELECT id INTO v_conta_padrao FROM fin_contas
  WHERE company_id = v_order.company_id AND is_active = true
  ORDER BY is_default DESC, created_at ASC LIMIT 1;

  -- Se não tem conta, faz seed automático
  IF v_conta_padrao IS NULL THEN
    PERFORM seed_fin_categorias(v_order.company_id);
    SELECT id INTO v_conta_padrao FROM fin_contas
    WHERE company_id = v_order.company_id AND is_active = true ORDER BY is_default DESC LIMIT 1;
  END IF;

  -- Categoria receita padrão "Venda de Produtos"
  SELECT id INTO v_categoria_receita FROM fin_categorias
  WHERE company_id = v_order.company_id AND tipo = 'receita' AND nome = 'Venda de Produtos' LIMIT 1;

  -- Se pagamento é fiado, cria TÍTULO (não lançamento direto)
  IF v_order.payment_method = 'fiado' THEN
    INSERT INTO fin_titulos (
      company_id, tipo, cliente_id, contraparte_nome, valor_original,
      data_vencimento, categoria_id, order_id, descricao
    ) VALUES (
      v_order.company_id, 'receber', v_order.customer_id, v_order.customer_name, v_order.total,
      CURRENT_DATE + INTERVAL '30 days', v_categoria_receita, p_order_id,
      'Venda fiada #' || COALESCE(v_order.order_number::text, '')
    );
  ELSE
    -- Pagamento à vista: cria lançamento direto
    IF v_conta_padrao IS NOT NULL THEN
      INSERT INTO fin_lancamentos (
        company_id, conta_id, categoria_id, tipo, valor, descricao,
        data_competencia, data_caixa, origem, order_id
      ) VALUES (
        v_order.company_id, v_conta_padrao, v_categoria_receita, 'entrada', v_order.total,
        'Venda #' || COALESCE(v_order.order_number::text, ''),
        CURRENT_DATE, CURRENT_DATE, 'movimento', p_order_id
      ) RETURNING id INTO v_lanc_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'stage', 'faturado',
    'estoque', v_baixa_result,
    'lancamento_id', v_lanc_id,
    'is_fiado', v_order.payment_method = 'fiado'
  );
END;
$$;

-- ════════════════════════════════════════════════════════════════
-- 12. Seed automático pra empresas existentes
-- ════════════════════════════════════════════════════════════════
DO $$
DECLARE c RECORD;
BEGIN
  FOR c IN SELECT id FROM companies WHERE is_active = true LOOP
    PERFORM seed_fin_categorias(c.id);
  END LOOP;
END $$;

-- Trigger pra novas empresas
CREATE OR REPLACE FUNCTION public.trg_seed_fin_on_company_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM seed_fin_categorias(NEW.id);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_companies_seed_fin ON companies;
CREATE TRIGGER trg_companies_seed_fin
  AFTER INSERT ON companies
  FOR EACH ROW EXECUTE FUNCTION trg_seed_fin_on_company_insert();

-- Touch updated_at
CREATE TRIGGER trg_fin_contas_touch BEFORE UPDATE ON fin_contas FOR EACH ROW EXECUTE FUNCTION _touch_updated_at();
CREATE TRIGGER trg_fin_titulos_touch BEFORE UPDATE ON fin_titulos FOR EACH ROW EXECUTE FUNCTION _touch_updated_at();
