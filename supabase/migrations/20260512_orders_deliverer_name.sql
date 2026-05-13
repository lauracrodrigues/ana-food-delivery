-- Adiciona deliverer_name em orders para exibir no card sem join
ALTER TABLE orders ADD COLUMN IF NOT EXISTS deliverer_name VARCHAR(255);
