-- v1.0.0 — Ordenação por categoria (cada categoria com seu próprio modo)
-- Substitui store_settings.menu_sort_mode global

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS sort_mode text NOT NULL DEFAULT 'manual'
  CHECK (sort_mode IN ('manual','alphabetical','price_asc','price_desc','newest'));

COMMENT ON COLUMN categories.sort_mode IS
  'Ordem dos produtos DENTRO desta categoria: manual (display_order), alphabetical, price_asc/desc, newest';
