-- v1.0.0 — Fix RLS de orders pra entregador multi-loja
-- Bug: policies "view own orders" e "transfer own orders" tinham LIMIT 1
-- no subquery (SELECT id FROM deliverers WHERE email = auth.email() LIMIT 1).
-- Quando entregador atende 2+ empresas (mesmo email), só 1 deliverer.id era
-- retornado (random). Pedidos do outro id ficavam invisíveis no app.
-- Fix: remove LIMIT, retorna todos deliverer.id do mesmo email.

DROP POLICY IF EXISTS "Deliverers can view own orders" ON public.orders;
CREATE POLICY "Deliverers can view own orders"
  ON public.orders
  FOR SELECT
  USING (
    deliverer_id IN (
      SELECT id FROM public.deliverers
      WHERE email::text = auth.email()
    )
  );

DROP POLICY IF EXISTS "Deliverers can transfer own orders" ON public.orders;
CREATE POLICY "Deliverers can transfer own orders"
  ON public.orders
  FOR UPDATE
  USING (
    deliverer_id IN (
      SELECT id FROM public.deliverers
      WHERE email::text = auth.email()
    )
  );
