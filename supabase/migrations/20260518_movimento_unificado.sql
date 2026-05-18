-- v1.0.0 — Movimento unificado (FASE 2)
-- ESTENDE orders com origin + stage. Zero impacto delivery (defaults compatíveis).
-- Comunicação por evento: faturar() → baixa_estoque + título financeiro (gancho FASE 4)

-- ════════════════════════════════════════════════════════════════
-- 1. ESTENDE orders — 2 colunas novas com defaults seguros
-- ════════════════════════════════════════════════════════════════

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS origin TEXT NOT NULL DEFAULT 'online'
  CHECK (origin IN ('online', 'balcao', 'ifood'));

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS stage TEXT NOT NULL DEFAULT 'pedido'
  CHECK (stage IN ('orcamento', 'pedido', 'faturado', 'cancelado'));

COMMENT ON COLUMN public.orders.origin IS
  'Origem da venda: online (cardápio), balcao (PDV físico), ifood (integração marketplace)';

COMMENT ON COLUMN public.orders.stage IS
  'Estágio documento: orcamento (não toca estoque/financeiro), pedido (entrou kanban delivery), faturado (estoque baixado + título gerado), cancelado';

-- Index pra filtros frequentes
CREATE INDEX IF NOT EXISTS idx_orders_stage ON orders(company_id, stage, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_origin ON orders(company_id, origin) WHERE origin <> 'online';

-- ════════════════════════════════════════════════════════════════
-- 2. RPC: faturar_movimento(order_id)
-- Transição pedido → faturado. Emite evento (chama baixa_estoque_por_order).
-- Hook FASE 4 vai adicionar criar fin_titulo.
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.faturar_movimento(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_baixa_result JSONB;
  v_caixa_aberto BOOLEAN;
BEGIN
  SELECT id, company_id, stage, origin, payment_method, total, status
  INTO v_order FROM orders WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pedido não encontrado');
  END IF;

  -- Idempotência: já faturado retorna ok (não duplica)
  IF v_order.stage = 'faturado' THEN
    RETURN jsonb_build_object('success', true, 'message', 'já faturado', 'stage', 'faturado');
  END IF;

  IF v_order.stage = 'cancelado' THEN
    RETURN jsonb_build_object('success', false, 'error', 'pedido cancelado não pode ser faturado');
  END IF;

  -- Decisão B: caixa obrigatório SÓ se origem=balcao + pagamento=dinheiro
  IF v_order.origin = 'balcao' AND v_order.payment_method IN ('dinheiro', 'cash') THEN
    -- Checa se existe caixa aberto pra company hoje (FASE 3 cria tabela fin_caixa)
    -- Se tabela ainda não existe, pula validação (FASE 3 vai consertar)
    BEGIN
      SELECT EXISTS (
        SELECT 1 FROM fin_caixa
        WHERE company_id = v_order.company_id
          AND status = 'aberto'
        LIMIT 1
      ) INTO v_caixa_aberto;

      IF NOT v_caixa_aberto THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'caixa_fechado',
          'message', 'Pagamento em dinheiro no balcão exige caixa aberto. Abra o caixa antes de faturar.'
        );
      END IF;
    EXCEPTION WHEN undefined_table THEN
      -- fin_caixa ainda não existe (FASE 3 pendente) — pula validação
      NULL;
    END;
  END IF;

  -- Atualiza stage → faturado
  UPDATE orders SET stage = 'faturado', updated_at = now() WHERE id = p_order_id;

  -- Evento: baixa estoque (FASE 1)
  BEGIN
    SELECT baixa_estoque_por_order(p_order_id) INTO v_baixa_result;
  EXCEPTION WHEN OTHERS THEN
    -- Falha na baixa não bloqueia faturamento (apenas loga)
    v_baixa_result := jsonb_build_object('warning', SQLERRM);
  END;

  -- Evento: criar título financeiro (FASE 4 — hook pronto pra completar)
  -- Quando fin_titulos existir, INSERT aqui via lookup payment_method → tipo título

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'stage', 'faturado',
    'estoque', v_baixa_result
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.faturar_movimento(uuid) TO authenticated, service_role;

-- ════════════════════════════════════════════════════════════════
-- 3. RPC: converter_orcamento_em_pedido(order_id)
-- Orçamento → Pedido (não fatura, não toca estoque)
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.converter_orcamento_em_pedido(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_stage TEXT;
BEGIN
  SELECT stage INTO v_stage FROM orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pedido não encontrado');
  END IF;
  IF v_stage <> 'orcamento' THEN
    RETURN jsonb_build_object('success', false, 'error', 'só orçamento pode virar pedido', 'stage_atual', v_stage);
  END IF;

  UPDATE orders SET stage = 'pedido', updated_at = now() WHERE id = p_order_id;
  RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'stage', 'pedido');
END;
$$;
GRANT EXECUTE ON FUNCTION public.converter_orcamento_em_pedido(uuid) TO authenticated, service_role;

-- ════════════════════════════════════════════════════════════════
-- 4. RPC: cancelar_movimento(order_id, motivo)
-- Cancela em qualquer stage (orcamento/pedido/faturado)
-- Faturado: reverte estoque (futuro — não implementado v1)
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.cancelar_movimento(p_order_id uuid, p_motivo TEXT DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_stage TEXT;
BEGIN
  SELECT stage INTO v_stage FROM orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pedido não encontrado');
  END IF;
  IF v_stage = 'cancelado' THEN
    RETURN jsonb_build_object('success', true, 'message', 'já cancelado');
  END IF;

  UPDATE orders SET
    stage = 'cancelado',
    status = 'cancelled',
    cancellation_reason = COALESCE(p_motivo, cancellation_reason),
    cancelled_at = COALESCE(cancelled_at, now()),
    updated_at = now()
  WHERE id = p_order_id;

  -- TODO v2: se stage anterior='faturado', reverter estoque + cancelar título
  RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'stage', 'cancelado');
END;
$$;
GRANT EXECUTE ON FUNCTION public.cancelar_movimento(uuid, text) TO authenticated, service_role;

-- ════════════════════════════════════════════════════════════════
-- 5. VIEWS pra simplificar queries do frontend
-- ════════════════════════════════════════════════════════════════

-- Pedidos ativos do kanban (delivery atual): só stage='pedido' + não cancelados
CREATE OR REPLACE VIEW public.v_pedidos_ativos AS
SELECT o.*, c.fantasy_name AS company_name
FROM orders o
LEFT JOIN companies c ON c.id = o.company_id
WHERE o.stage = 'pedido' AND o.status NOT IN ('cancelled', 'archived');

-- Orçamentos (não entram no kanban)
CREATE OR REPLACE VIEW public.v_orcamentos AS
SELECT o.*, c.fantasy_name AS company_name
FROM orders o
LEFT JOIN companies c ON c.id = o.company_id
WHERE o.stage = 'orcamento';

-- Faturamento (pra DRE — só faturados contam receita)
CREATE OR REPLACE VIEW public.v_movimentos_faturados AS
SELECT o.*, c.fantasy_name AS company_name
FROM orders o
LEFT JOIN companies c ON c.id = o.company_id
WHERE o.stage = 'faturado';

COMMENT ON VIEW v_pedidos_ativos IS 'Kanban delivery — pedidos em execução (não cancelados/arquivados/orçamento)';
COMMENT ON VIEW v_orcamentos IS 'Orçamentos pendentes de conversão em pedido';
COMMENT ON VIEW v_movimentos_faturados IS 'Vendas confirmadas (receita real) — usado em DRE FASE 4';
