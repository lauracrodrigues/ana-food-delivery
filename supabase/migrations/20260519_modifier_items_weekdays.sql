-- v1.0.0 — Disponibilidade por dia da semana em modifier_items
-- NULL ou array vazio = disponível todos os dias (compat)
-- Array com dias = disponível apenas nesses dias

ALTER TABLE modifier_items
  ADD COLUMN IF NOT EXISTS available_weekdays text[];

-- RPC atualizada: filtra itens pelo dia da semana atual (timezone server-side)
-- Mantém compat: items com NULL/[] aparecem sempre
CREATE OR REPLACE FUNCTION get_product_with_modifiers(p_product_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_today text;
BEGIN
  -- Dia da semana atual em inglês lowercase (igual ao formato em products.available_weekdays)
  v_today := lower(to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'FMday'));
  -- "fmday" retorna "monday", "tuesday", etc.

  SELECT jsonb_build_object(
    'product', to_jsonb(p),
    'groups', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id',          mg.id,
          'name',        mg.name,
          'display_type',mg.display_type,
          'min_select',  COALESCE(pmg.min_override, mg.min_select),
          'max_select',  COALESCE(pmg.max_override, mg.max_select),
          'is_required', mg.is_required OR COALESCE(pmg.min_override, mg.min_select) > 0,
          'sort_order',  pmg.sort_order,
          'items', COALESCE((
            SELECT jsonb_agg(to_jsonb(mi) ORDER BY mi.sort_order, mi.name)
              FROM modifier_items mi
             WHERE mi.group_id = mg.id
               AND mi.available = true
               -- Filtro weekday: NULL ou array vazio = todos dias; senão tem que conter hoje
               AND (mi.available_weekdays IS NULL
                    OR cardinality(mi.available_weekdays) = 0
                    OR v_today = ANY(mi.available_weekdays))
          ), '[]'::jsonb)
        ) ORDER BY pmg.sort_order
      )
      FROM product_modifier_groups pmg
      JOIN modifier_groups mg ON mg.id = pmg.group_id
      WHERE pmg.product_id = p.id
    ), '[]'::jsonb)
  )
  INTO v_result
  FROM products p
  WHERE p.id = p_product_id;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_product_with_modifiers(uuid) TO authenticated, anon;

CREATE INDEX IF NOT EXISTS idx_modifier_items_weekdays
  ON modifier_items USING GIN (available_weekdays);

COMMENT ON COLUMN modifier_items.available_weekdays IS
  'Dias da semana em que o item está disponível (monday, tuesday, ...). NULL/[] = todos dias.';
