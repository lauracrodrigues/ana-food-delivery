-- v1.0.0 — Multi-tenant + desativações (FASE 7)
-- company_type pra simplificar lógica + módulos por flag + helper RPCs

-- ════════════════════════════════════════════════════════════════
-- 1. company_type: delivery | distribuidora | both
-- ════════════════════════════════════════════════════════════════
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS company_type TEXT NOT NULL DEFAULT 'delivery'
  CHECK (company_type IN ('delivery', 'distribuidora', 'both'));

COMMENT ON COLUMN public.companies.company_type IS
  'Tipo da empresa: delivery (bot+cardápio+kanban), distribuidora (sem bot+ pedidos balcão/fiado), both';

-- Garante modules_enabled default seguro pra empresas legadas
UPDATE companies SET modules_enabled = jsonb_build_object(
  'cardapio_digital', true,
  'whatsapp', true,
  'pdv', true,
  'financeiro', true,
  'app_entregador', true,
  'distribuidoras', false
)
WHERE modules_enabled IS NULL OR modules_enabled = '{}'::jsonb;

-- Pra company_type=distribuidora, desativa whatsapp (bot off)
UPDATE companies SET modules_enabled = modules_enabled || jsonb_build_object(
  'whatsapp', false,
  'cardapio_digital', false,
  'distribuidoras', true
)
WHERE company_type = 'distribuidora';

-- ════════════════════════════════════════════════════════════════
-- 2. RPC: is_whatsapp_enabled — usado pelo bot pra decidir processar
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.is_whatsapp_enabled(p_company_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (modules_enabled->>'whatsapp')::boolean,
    true
  ) AND is_active
  FROM companies WHERE id = p_company_id LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.is_whatsapp_enabled(uuid) TO anon, authenticated, service_role;

-- ════════════════════════════════════════════════════════════════
-- 3. RPC: is_module_enabled — genérico (cardapio, pdv, etc)
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.is_module_enabled(p_company_id uuid, p_module TEXT)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (modules_enabled->>p_module)::boolean,
    false
  ) AND is_active
  FROM companies WHERE id = p_company_id LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.is_module_enabled(uuid, text) TO anon, authenticated, service_role;

-- ════════════════════════════════════════════════════════════════
-- 4. RPC: get_titulos_a_vencer — usado por cron alertas
-- Retorna títulos a vencer em N dias OU já vencidos, com phone do cliente
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_titulos_a_vencer(p_dias_antecedencia int DEFAULT 3)
RETURNS TABLE(
  titulo_id uuid,
  company_id uuid,
  cliente_id uuid,
  cliente_nome TEXT,
  cliente_phone TEXT,
  valor_saldo NUMERIC,
  data_vencimento DATE,
  dias_vencimento int,
  is_vencido boolean,
  instance_name TEXT
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    t.id, t.company_id, t.cliente_id, t.contraparte_nome, c.phone,
    t.saldo, t.data_vencimento,
    (CURRENT_DATE - t.data_vencimento)::int AS dias_vencimento,
    t.data_vencimento < CURRENT_DATE AS is_vencido,
    (SELECT wc.session_name FROM whatsapp_config wc
      WHERE wc.company_id = t.company_id AND wc.config_type = 'session' AND wc.is_active = true LIMIT 1)
  FROM fin_titulos t
  LEFT JOIN customers c ON c.id = t.cliente_id
  WHERE t.tipo = 'receber'
    AND t.status IN ('aberto', 'parcial')
    AND t.data_vencimento <= CURRENT_DATE + (p_dias_antecedencia || ' days')::interval
    AND c.phone IS NOT NULL
  ORDER BY t.data_vencimento ASC
  LIMIT 100;
$$;
GRANT EXECUTE ON FUNCTION public.get_titulos_a_vencer(int) TO authenticated, service_role;

-- ════════════════════════════════════════════════════════════════
-- 5. Coluna pra rastrear quando alerta foi enviado (anti-spam)
-- ════════════════════════════════════════════════════════════════
ALTER TABLE public.fin_titulos
  ADD COLUMN IF NOT EXISTS alerta_enviado_em TIMESTAMPTZ;
