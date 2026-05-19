-- v1.0.0 — Catálogo com Modifiers (Marmitaria + Customização)
-- Tabelas novas convivem com sistema atual (produtos sem grupos = comportamento atual)

-- ───────────────────────────────────────────────────────────────────────────
-- 1. modifier_groups: agrupam opções (arroz, mistura, salada)
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS modifier_groups (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name         text NOT NULL,
  display_type text NOT NULL DEFAULT 'checkbox'
               CHECK (display_type IN ('radio','checkbox','quantity')),
  min_select   int NOT NULL DEFAULT 0,
  max_select   int NOT NULL DEFAULT 1,
  is_required  boolean NOT NULL DEFAULT false,
  sort_order   int NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mg_minmax_valid CHECK (min_select >= 0 AND max_select >= min_select)
);

CREATE INDEX IF NOT EXISTS idx_modifier_groups_company
  ON modifier_groups (company_id, sort_order);

-- ───────────────────────────────────────────────────────────────────────────
-- 2. modifier_items: itens selecionáveis (arroz branco, frango, carne)
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS modifier_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id     uuid NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
  name         text NOT NULL,
  price_delta  numeric(10,2) NOT NULL DEFAULT 0,
  available    boolean NOT NULL DEFAULT true,
  sort_order   int NOT NULL DEFAULT 0,
  image_url    text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_modifier_items_group
  ON modifier_items (group_id, sort_order);

-- ───────────────────────────────────────────────────────────────────────────
-- 3. product_modifier_groups: junction M2M com override min/max por produto
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_modifier_groups (
  product_id   uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  group_id     uuid NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
  min_override int,
  max_override int,
  sort_order   int NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, group_id),
  CONSTRAINT pmg_override_valid CHECK (
    (min_override IS NULL OR min_override >= 0)
    AND (max_override IS NULL OR max_override >= COALESCE(min_override, 0))
  )
);

CREATE INDEX IF NOT EXISTS idx_pmg_product   ON product_modifier_groups (product_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_pmg_group     ON product_modifier_groups (group_id);

-- ───────────────────────────────────────────────────────────────────────────
-- 4. order_item_modifiers: snapshot do que cliente escolheu (não quebra histórico)
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_item_modifiers (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id              uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_item_id         uuid NOT NULL,  -- FK lógico (orders.items é jsonb hoje, deixar text)
  modifier_item_id      uuid REFERENCES modifier_items(id) ON DELETE SET NULL,
  name_snapshot         text NOT NULL,
  price_delta_snapshot  numeric(10,2) NOT NULL DEFAULT 0,
  quantity              int NOT NULL DEFAULT 1,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_oim_order ON order_item_modifiers (order_id);

-- ───────────────────────────────────────────────────────────────────────────
-- 5. RLS multi-tenant
-- ───────────────────────────────────────────────────────────────────────────
ALTER TABLE modifier_groups          ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifier_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_modifier_groups  ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_item_modifiers     ENABLE ROW LEVEL SECURITY;

-- modifier_groups: empresa só vê os seus
DROP POLICY IF EXISTS mg_select ON modifier_groups;
CREATE POLICY mg_select ON modifier_groups FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
DROP POLICY IF EXISTS mg_modify ON modifier_groups;
CREATE POLICY mg_modify ON modifier_groups FOR ALL
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- modifier_items: herda do group
DROP POLICY IF EXISTS mi_via_group ON modifier_items;
CREATE POLICY mi_via_group ON modifier_items FOR ALL
  USING (group_id IN (SELECT id FROM modifier_groups))
  WITH CHECK (group_id IN (SELECT id FROM modifier_groups));

-- product_modifier_groups: precisa acesso a ambas tabelas
DROP POLICY IF EXISTS pmg_join ON product_modifier_groups;
CREATE POLICY pmg_join ON product_modifier_groups FOR ALL
  USING (
    product_id IN (SELECT id FROM products WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
    AND group_id IN (SELECT id FROM modifier_groups)
  )
  WITH CHECK (
    product_id IN (SELECT id FROM products WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
    AND group_id IN (SELECT id FROM modifier_groups)
  );

-- order_item_modifiers: via orders
DROP POLICY IF EXISTS oim_via_order ON order_item_modifiers;
CREATE POLICY oim_via_order ON order_item_modifiers FOR ALL
  USING (order_id IN (SELECT id FROM orders))
  WITH CHECK (order_id IN (SELECT id FROM orders));

-- ───────────────────────────────────────────────────────────────────────────
-- 6. RPCs
-- ───────────────────────────────────────────────────────────────────────────

-- 6.1 Preload produto + grupos + itens em 1 chamada
CREATE OR REPLACE FUNCTION get_product_with_modifiers(p_product_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'product', to_jsonb(p),
    'groups', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id',          mg.id,
          'name',        mg.name,
          'display_type',mg.display_type,
          -- Aplica overrides do produto se existirem
          'min_select',  COALESCE(pmg.min_override, mg.min_select),
          'max_select',  COALESCE(pmg.max_override, mg.max_select),
          'is_required', mg.is_required OR COALESCE(pmg.min_override, mg.min_select) > 0,
          'sort_order',  pmg.sort_order,
          'items', COALESCE((
            SELECT jsonb_agg(to_jsonb(mi) ORDER BY mi.sort_order, mi.name)
              FROM modifier_items mi
             WHERE mi.group_id = mg.id AND mi.available = true
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

-- 6.2 Validar seleção do cliente (min/max por grupo)
-- Entrada: array de { group_id, item_ids: [...] }
-- Saída: { valid: bool, errors: [...] }
CREATE OR REPLACE FUNCTION validate_modifier_selection(
  p_product_id uuid,
  p_selections jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_errors jsonb := '[]'::jsonb;
  v_group record;
  v_selected_count int;
  v_group_id uuid;
BEGIN
  -- Itera cada grupo associado ao produto
  FOR v_group IN
    SELECT mg.id, mg.name,
           COALESCE(pmg.min_override, mg.min_select) AS min_select,
           COALESCE(pmg.max_override, mg.max_select) AS max_select
      FROM product_modifier_groups pmg
      JOIN modifier_groups mg ON mg.id = pmg.group_id
     WHERE pmg.product_id = p_product_id
  LOOP
    -- Conta itens selecionados pra esse grupo
    SELECT COALESCE(jsonb_array_length(
      (SELECT s->'item_ids' FROM jsonb_array_elements(p_selections) s
        WHERE (s->>'group_id')::uuid = v_group.id)
    ), 0) INTO v_selected_count;

    IF v_selected_count < v_group.min_select THEN
      v_errors := v_errors || jsonb_build_object(
        'group_id', v_group.id, 'group_name', v_group.name,
        'error', 'min_not_met',
        'min_required', v_group.min_select, 'selected', v_selected_count
      );
    ELSIF v_selected_count > v_group.max_select THEN
      v_errors := v_errors || jsonb_build_object(
        'group_id', v_group.id, 'group_name', v_group.name,
        'error', 'max_exceeded',
        'max_allowed', v_group.max_select, 'selected', v_selected_count
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'valid', jsonb_array_length(v_errors) = 0,
    'errors', v_errors
  );
END;
$$;

GRANT EXECUTE ON FUNCTION validate_modifier_selection(uuid, jsonb) TO authenticated, anon;

-- ───────────────────────────────────────────────────────────────────────────
-- 7. Trigger updated_at
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION _set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_mg_updated_at ON modifier_groups;
CREATE TRIGGER trg_mg_updated_at BEFORE UPDATE ON modifier_groups
  FOR EACH ROW EXECUTE FUNCTION _set_updated_at();

DROP TRIGGER IF EXISTS trg_mi_updated_at ON modifier_items;
CREATE TRIGGER trg_mi_updated_at BEFORE UPDATE ON modifier_items
  FOR EACH ROW EXECUTE FUNCTION _set_updated_at();

COMMENT ON TABLE modifier_groups IS 'Grupos de opções pra produtos (arroz, mistura, salada). Reutilizáveis entre produtos.';
COMMENT ON TABLE modifier_items IS 'Itens selecionáveis dentro de um grupo. price_delta=0 esconde preço na UI.';
COMMENT ON TABLE product_modifier_groups IS 'Junction M2M produto↔grupo com overrides de min/max.';
COMMENT ON TABLE order_item_modifiers IS 'Snapshot do que cliente escolheu (não quebra histórico).';
