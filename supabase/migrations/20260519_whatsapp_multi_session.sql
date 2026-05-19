-- v1.0.0 — Multi-sessão WhatsApp (failover Caribe + volume splitting)
-- Permite 1 empresa ter N instâncias Evolution conectadas

-- 1. Coluna is_primary: marca qual session é usada por padrão pra envios
ALTER TABLE whatsapp_config
  ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT true;

-- 2. Coluna display_name: apelido amigável ("Loja Principal", "Backup Centro")
ALTER TABLE whatsapp_config
  ADD COLUMN IF NOT EXISTS display_name text;

-- 3. Unique parcial: só 1 primary por (company_id, config_type='session')
-- Garante invariante: SEMPRE existe exatamente 1 sessão primária ativa
CREATE UNIQUE INDEX IF NOT EXISTS uniq_whatsapp_primary_session
  ON whatsapp_config (company_id)
  WHERE config_type = 'session' AND is_primary = true AND is_active = true;

-- 4. Índice pra lookup ordenado (primary first, then most recently updated)
CREATE INDEX IF NOT EXISTS idx_whatsapp_session_lookup
  ON whatsapp_config (company_id, is_primary DESC, updated_at DESC)
  WHERE config_type = 'session' AND is_active = true;

-- 5. RPC pra trocar primária (rebalanceia constraint)
-- Marca todas as outras como is_primary=false antes de promover a escolhida
CREATE OR REPLACE FUNCTION set_primary_whatsapp_session(p_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
BEGIN
  SELECT company_id INTO v_company_id
    FROM whatsapp_config WHERE id = p_session_id AND config_type = 'session';

  IF v_company_id IS NULL THEN
    RETURN jsonb_build_object('error', 'session_not_found');
  END IF;

  -- Demove todas as primárias atuais da empresa
  UPDATE whatsapp_config
     SET is_primary = false, updated_at = now()
   WHERE company_id = v_company_id AND config_type = 'session' AND is_primary = true;

  -- Promove a escolhida (também marca como ativa)
  UPDATE whatsapp_config
     SET is_primary = true, is_active = true, updated_at = now()
   WHERE id = p_session_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION set_primary_whatsapp_session(uuid) TO authenticated;

COMMENT ON COLUMN whatsapp_config.is_primary IS
  'Sessão padrão pra envios outbound. Failover: 2ª primária quando 1ª desconecta.';
COMMENT ON COLUMN whatsapp_config.display_name IS
  'Apelido amigável (ex: "Principal", "Backup"). Mostrado no painel.';
