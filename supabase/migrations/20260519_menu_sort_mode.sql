-- v1.0.0 — Ordenação configurável do cardápio público

ALTER TABLE store_settings
  ADD COLUMN IF NOT EXISTS menu_sort_mode text NOT NULL DEFAULT 'manual'
  CHECK (menu_sort_mode IN ('manual','alphabetical','price_asc','price_desc','newest'));

COMMENT ON COLUMN store_settings.menu_sort_mode IS
  'Ordem dos produtos no cardápio público: manual (display_order), alphabetical (name), price_asc/desc, newest (created_at desc)';
