-- v1.0.0 — Estado de trabalho do entregador (economia bateria GPS)
-- offline    → GPS off no app
-- available  → loja aberta, sem entrega ativa (GPS network, 3-5min)
-- delivering → entrega em rota (GPS alta acurácia, 30-60s)

-- 1. Campo de status
ALTER TABLE deliverers
  ADD COLUMN IF NOT EXISTS work_status text NOT NULL DEFAULT 'offline';

-- Constraint de valores válidos (drop+recreate idempotente)
ALTER TABLE deliverers DROP CONSTRAINT IF EXISTS deliverers_work_status_check;
ALTER TABLE deliverers ADD CONSTRAINT deliverers_work_status_check
  CHECK (work_status IN ('offline','available','delivering'));

-- Index pra dashboard (filtrar online rápido)
CREATE INDEX IF NOT EXISTS idx_deliverers_work_status
  ON deliverers (company_id, work_status)
  WHERE work_status <> 'offline';

-- 2. RPC unificada: app envia 1 chamada com tudo
-- Server faz validação + throttle ownership (entregador só atualiza ele mesmo)
CREATE OR REPLACE FUNCTION update_deliverer_location(
  p_deliverer_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_work_status text DEFAULT NULL,
  p_battery_level int DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_deliverer record;
  v_should_update boolean := true;
  v_last_lat double precision;
  v_last_lng double precision;
  v_distance_m double precision;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'unauthorized');
  END IF;

  -- Validar ownership: deliverer.user_id = auth.uid()
  SELECT id, lat, lng, work_status, last_location_at
    INTO v_deliverer
    FROM deliverers
   WHERE id = p_deliverer_id
     AND (user_id = v_user_id OR company_id IN (
       SELECT company_id FROM profiles WHERE id = v_user_id
     ));

  IF v_deliverer.id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_found_or_forbidden');
  END IF;

  -- Throttle por distância: se moveu <50m E último update <30s → skip
  IF v_deliverer.lat IS NOT NULL AND v_deliverer.lng IS NOT NULL THEN
    -- Fórmula haversine simplificada (suficiente p/ <100km)
    v_distance_m := 111320 * sqrt(
      power(p_lat - v_deliverer.lat, 2) +
      power((p_lng - v_deliverer.lng) * cos(radians(p_lat)), 2)
    );
    IF v_distance_m < 50
       AND v_deliverer.last_location_at > now() - interval '30 seconds' THEN
      v_should_update := false;
    END IF;
  END IF;

  -- Sempre atualiza work_status (mesmo skipando coords)
  UPDATE deliverers SET
    lat = CASE WHEN v_should_update THEN p_lat ELSE lat END,
    lng = CASE WHEN v_should_update THEN p_lng ELSE lng END,
    last_location_at = CASE WHEN v_should_update THEN now() ELSE last_location_at END,
    work_status = COALESCE(p_work_status, work_status),
    -- battery_level só se a coluna existir (extensão futura)
    updated_at = now()
  WHERE id = p_deliverer_id;

  RETURN jsonb_build_object(
    'ok', true,
    'updated', v_should_update,
    'distance_m', v_distance_m
  );
END;
$$;

GRANT EXECUTE ON FUNCTION update_deliverer_location(uuid, double precision, double precision, text, int) TO authenticated;

-- 3. Cron-style cleanup: marca offline após 30min sem update
-- (chamado pelo pg_cron ou cron PM2 do bot)
CREATE OR REPLACE FUNCTION cleanup_stale_deliverer_locations()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  UPDATE deliverers
     SET lat = NULL,
         lng = NULL,
         work_status = 'offline'
   WHERE work_status <> 'offline'
     AND (last_location_at IS NULL OR last_location_at < now() - interval '30 minutes');

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION cleanup_stale_deliverer_locations() TO authenticated;

COMMENT ON COLUMN deliverers.work_status IS
  'Estado trabalho: offline (GPS off), available (idle, low-power GPS), delivering (rota ativa, high-accuracy)';
COMMENT ON FUNCTION update_deliverer_location IS
  'RPC única do app entregador. Faz ownership-check + throttle 50m/30s no server. Retorna se update foi aplicado.';
