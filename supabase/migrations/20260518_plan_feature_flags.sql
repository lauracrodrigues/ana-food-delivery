-- v1.0.0 — Feature flags estruturadas por plano
-- Antes: plans.features = array de strings descritivas (marketing-only)
-- Depois: jsonb estruturado pra gating real de UI e backend

-- 1. Garantir que features é jsonb (já é, mas idempotente)
-- 2. Coluna nova "feature_flags" jsonb estruturada
ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS feature_flags jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 3. Popular feature_flags pros 3 planos existentes
-- Básico: PDV + WhatsApp + Financeiro básico, sem extras
UPDATE plans SET feature_flags = jsonb_build_object(
  'modules', jsonb_build_array('pdv','whatsapp','financeiro'),
  'limits',  jsonb_build_object(
    'products',     50,
    'orders_month', 100,
    'deliverers',   2,
    'wa_sessions',  1,
    'users',        2
  ),
  'extras',  jsonb_build_object(
    'tts',           false,
    'distribuidoras',false,
    'app_entregador',true,
    'api_access',    false,
    'white_label',   false,
    'multi_session', false,
    'heatmap',       false,
    'analytics_pro', false
  )
) WHERE name = 'Básico';

-- Profissional: +TTS, +heatmap, +analytics, +more limits
UPDATE plans SET feature_flags = jsonb_build_object(
  'modules', jsonb_build_array('pdv','whatsapp','financeiro','cardapio_digital'),
  'limits',  jsonb_build_object(
    'products',     200,
    'orders_month', 500,
    'deliverers',   5,
    'wa_sessions',  1,
    'users',        5
  ),
  'extras',  jsonb_build_object(
    'tts',           true,
    'distribuidoras',false,
    'app_entregador',true,
    'api_access',    false,
    'white_label',   false,
    'multi_session', false,
    'heatmap',       true,
    'analytics_pro', true
  )
) WHERE name = 'Profissional';

-- Enterprise: tudo liberado, sem limites
UPDATE plans SET feature_flags = jsonb_build_object(
  'modules', jsonb_build_array('pdv','whatsapp','financeiro','cardapio_digital','distribuidoras'),
  'limits',  jsonb_build_object(
    'products',     -1, -- -1 = ilimitado
    'orders_month', -1,
    'deliverers',   -1,
    'wa_sessions',  3,
    'users',        -1
  ),
  'extras',  jsonb_build_object(
    'tts',           true,
    'distribuidoras',true,
    'app_entregador',true,
    'api_access',    true,
    'white_label',   true,
    'multi_session', true,
    'heatmap',       true,
    'analytics_pro', true
  )
) WHERE name = 'Enterprise';

-- 4. RPC pra ler feature flags do plano da empresa (cacheável no client)
CREATE OR REPLACE FUNCTION get_company_plan_features(p_company_id uuid)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(p.feature_flags, '{}'::jsonb)
    FROM companies c
    LEFT JOIN plans p ON p.id = c.plan_id
   WHERE c.id = p_company_id;
$$;

GRANT EXECUTE ON FUNCTION get_company_plan_features(uuid) TO authenticated;

COMMENT ON COLUMN plans.feature_flags IS
  'Structured flags: { modules: [], limits: {...}, extras: {...} }. -1 = unlimited.';
