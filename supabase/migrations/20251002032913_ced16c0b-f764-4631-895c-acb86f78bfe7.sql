-- Padronizar os status dos pedidos existentes para inglês
UPDATE public.orders 
SET status = CASE 
  WHEN status = 'novo' THEN 'pending'
  WHEN status = 'pendente' THEN 'pending'
  WHEN status = 'preparando' THEN 'preparing'
  WHEN status = 'pronto' THEN 'ready'
  WHEN status = 'em_entrega' THEN 'delivering'
  WHEN status = 'entregando' THEN 'delivering'
  WHEN status = 'concluido' THEN 'completed'
  WHEN status = 'concluída' THEN 'completed'
  WHEN status = 'cancelado' THEN 'cancelled'
  ELSE status
END
WHERE status IN ('novo', 'pendente', 'preparando', 'pronto', 'em_entrega', 'entregando', 'concluido', 'concluída', 'cancelado');