-- v1.0.0 — Programa de indicações ("indique amigo, ganhe pontos")
-- Quando cliente indica via link ?ref=PHONE, e indicado faz primeiro pedido entregue,
-- referrer ganha pontos automaticamente.

-- Settings na companies (admin configura)
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS referral_reward_points int DEFAULT 100,
  ADD COLUMN IF NOT EXISTS referral_min_order_value numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referral_enabled boolean DEFAULT true;

COMMENT ON COLUMN public.companies.referral_reward_points IS 'Pontos que o referrer ganha quando indicado completa pedido';
COMMENT ON COLUMN public.companies.referral_min_order_value IS 'Pedido mínimo pra valorar a indicação (0 = qualquer pedido)';

-- Tabela de indicações
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  referrer_phone text NOT NULL,  -- quem indicou
  referred_phone text NOT NULL,  -- quem foi indicado
  status text NOT NULL DEFAULT 'pending', -- pending | completed | invalid
  completed_order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  reward_points int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT referrals_unique UNIQUE (company_id, referrer_phone, referred_phone)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(company_id, referrer_phone);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON public.referrals(company_id, referred_phone);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON public.referrals(status);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin vê indicações da empresa" ON public.referrals
  FOR SELECT USING (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
      UNION
      SELECT company_id FROM user_roles WHERE user_id = auth.uid() AND company_id IS NOT NULL
    )
  );

-- Stamp no orders pra rastrear de qual indicação veio (opcional, evita re-trigger)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS referred_by_phone text;

-- RPC: cria indicação pendente quando cliente novo acessa via ?ref
-- Chamado no momento que cliente identifica + faz primeiro pedido com referred_by_phone setado
CREATE OR REPLACE FUNCTION public.create_referral(
  p_company_id uuid,
  p_referrer_phone text,
  p_referred_phone text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referrer_digits text;
  referred_digits text;
  v_existing_orders int;
  v_referral_id uuid;
BEGIN
  referrer_digits := regexp_replace(coalesce(p_referrer_phone, ''), '\D', '', 'g');
  referred_digits := regexp_replace(coalesce(p_referred_phone, ''), '\D', '', 'g');

  -- Validações
  IF length(referrer_digits) < 10 OR length(referred_digits) < 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Telefones inválidos');
  END IF;
  IF referrer_digits = referred_digits THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não pode indicar a si mesmo');
  END IF;

  -- Referred precisa ser cliente novo (sem pedidos anteriores nessa empresa)
  SELECT count(*) INTO v_existing_orders
  FROM orders
  WHERE company_id = p_company_id
    AND regexp_replace(coalesce(customer_phone, ''), '\D', '', 'g') = referred_digits
    AND status NOT IN ('cancelled', 'awaiting_payment');

  IF v_existing_orders > 1 THEN  -- 1 = pedido atual sendo criado
    RETURN jsonb_build_object('success', false, 'error', 'Cliente não é novo');
  END IF;

  -- Insert ou ignora se já existe
  INSERT INTO referrals (company_id, referrer_phone, referred_phone, status)
  VALUES (p_company_id, referrer_digits, referred_digits, 'pending')
  ON CONFLICT (company_id, referrer_phone, referred_phone) DO NOTHING
  RETURNING id INTO v_referral_id;

  RETURN jsonb_build_object('success', true, 'referral_id', v_referral_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_referral TO anon, authenticated, service_role;

-- RPC: completa indicação + dá pontos pro referrer. Chamado por trigger em orders ou manual
CREATE OR REPLACE FUNCTION public.complete_referral(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order record;
  v_referral record;
  v_company record;
  v_referred_digits text;
  v_reward int;
BEGIN
  -- Carrega pedido
  SELECT id, company_id, customer_phone, total, status, referred_by_phone
  INTO v_order FROM orders WHERE id = p_order_id;

  IF NOT FOUND OR v_order.referred_by_phone IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sem indicação ou pedido inexistente');
  END IF;

  v_referred_digits := regexp_replace(coalesce(v_order.customer_phone, ''), '\D', '', 'g');

  -- Carrega config da empresa
  SELECT referral_enabled, referral_reward_points, referral_min_order_value
  INTO v_company FROM companies WHERE id = v_order.company_id;

  IF NOT v_company.referral_enabled THEN
    RETURN jsonb_build_object('success', false, 'error', 'Programa desativado');
  END IF;

  -- Valida pedido mínimo
  IF v_company.referral_min_order_value > 0 AND v_order.total < v_company.referral_min_order_value THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pedido abaixo do mínimo da indicação');
  END IF;

  -- Acha indicação pendente
  SELECT id, referrer_phone, status INTO v_referral
  FROM referrals
  WHERE company_id = v_order.company_id
    AND referred_phone = v_referred_digits
    AND status = 'pending'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Indicação não encontrada');
  END IF;

  v_reward := coalesce(v_company.referral_reward_points, 100);

  -- Marca completada
  UPDATE referrals
  SET status = 'completed', completed_order_id = p_order_id, completed_at = now(), reward_points = v_reward
  WHERE id = v_referral.id;

  -- Adiciona pontos pro referrer (upsert loyalty_points)
  INSERT INTO loyalty_points (company_id, customer_phone, points, total_spent)
  VALUES (v_order.company_id, v_referral.referrer_phone, v_reward, 0)
  ON CONFLICT (company_id, customer_phone) DO UPDATE SET
    points = loyalty_points.points + v_reward,
    updated_at = now();

  -- Log na loyalty_transactions
  INSERT INTO loyalty_transactions (company_id, customer_phone, points, type, description)
  VALUES (v_order.company_id, v_referral.referrer_phone, v_reward, 'referral_reward',
          'Indicação completada — telefone ' || left(v_referred_digits, 4) || '****' || right(v_referred_digits, 2));

  RETURN jsonb_build_object('success', true, 'reward_points', v_reward, 'referrer_phone', v_referral.referrer_phone);
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_referral TO authenticated, service_role;

-- Trigger: quando order status muda pra delivered/completed E tem referred_by_phone → completa indicação
CREATE OR REPLACE FUNCTION public.trg_complete_referral_on_delivered()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF (NEW.status IN ('delivered', 'completed'))
     AND (OLD.status IS DISTINCT FROM NEW.status)
     AND NEW.referred_by_phone IS NOT NULL
  THEN
    PERFORM public.complete_referral(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_complete_referral ON public.orders;
CREATE TRIGGER trg_orders_complete_referral
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_complete_referral_on_delivered();

-- RPC pra cliente público: lista suas indicações + stats
CREATE OR REPLACE FUNCTION public.get_my_referrals(p_company_id uuid, p_phone text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  phone_digits text;
  result jsonb;
BEGIN
  phone_digits := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  IF length(phone_digits) < 10 THEN
    RETURN jsonb_build_object('total', 0, 'completed', 0, 'pending', 0, 'points_earned', 0, 'list', '[]'::jsonb);
  END IF;

  SELECT jsonb_build_object(
    'total', count(*),
    'completed', count(*) FILTER (WHERE status='completed'),
    'pending', count(*) FILTER (WHERE status='pending'),
    'points_earned', coalesce(sum(reward_points) FILTER (WHERE status='completed'), 0),
    'list', coalesce(jsonb_agg(jsonb_build_object(
      'referred_phone', regexp_replace(referred_phone, '(\d{4})\d+(\d{2})', '\1****\2'),
      'status', status,
      'reward_points', reward_points,
      'created_at', created_at,
      'completed_at', completed_at
    ) ORDER BY created_at DESC), '[]'::jsonb)
  ) INTO result
  FROM referrals
  WHERE company_id = p_company_id AND referrer_phone = phone_digits;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_referrals TO anon, authenticated;
