-- v1.0.0 — Permite excluir produto sem perder histórico do PDV
-- check_items já tem product_name VARCHAR snapshot → product_id pode virar NULL após delete
-- Fix erro 409 ao deletar produto referenciado em check_items

ALTER TABLE check_items
  ALTER COLUMN product_id DROP NOT NULL;

ALTER TABLE check_items
  DROP CONSTRAINT IF EXISTS check_items_product_id_fkey;

ALTER TABLE check_items
  ADD CONSTRAINT check_items_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;
