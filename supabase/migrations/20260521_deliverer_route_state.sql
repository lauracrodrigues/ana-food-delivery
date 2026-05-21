-- v1.0.0 — Estado de rota do entregador (lock pra evitar acumular pedidos durante rota ativa)

-- Status da rota do entregador
ALTER TABLE deliverers ADD COLUMN IF NOT EXISTS route_status text NOT NULL DEFAULT 'idle'
  CHECK (route_status IN ('idle','collecting','on_route'));
ALTER TABLE deliverers ADD COLUMN IF NOT EXISTS route_started_at timestamptz;

-- Index pra busca rápida
CREATE INDEX IF NOT EXISTS idx_deliverers_route_status ON deliverers(route_status) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_orders_available ON orders(company_id, status) WHERE status IN ('preparing','ready') AND deliverer_id IS NULL;

COMMENT ON COLUMN deliverers.route_status IS 'idle=sem rota, collecting=pegando pedidos sem sair, on_route=rota iniciada (lock)';
