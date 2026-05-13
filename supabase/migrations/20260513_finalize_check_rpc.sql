-- RPC transacional para fechar comanda no PDV.
-- Substitui as múltiplas chamadas sequenciais do PaymentDialog por uma única
-- operação atômica — se qualquer etapa falhar, tudo é revertido.
CREATE OR REPLACE FUNCTION finalize_check(
  p_check_id        uuid,
  p_items           jsonb,
  p_payments        jsonb,
  p_subtotal        numeric,
  p_service_percent numeric,
  p_service_amount  numeric,
  p_discount_amount numeric,
  p_total_amount    numeric,
  p_paid_amount     numeric,
  p_closed_by       uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Inserir itens
  INSERT INTO check_items
  SELECT * FROM jsonb_populate_recordset(null::check_items, p_items);

  -- 2. Atualizar totais da comanda
  UPDATE checks SET
    subtotal         = p_subtotal,
    service_percent  = p_service_percent,
    service_amount   = p_service_amount,
    discount_amount  = p_discount_amount,
    total_amount     = p_total_amount
  WHERE id = p_check_id;

  -- 3. Inserir pagamentos
  INSERT INTO check_payments
  SELECT * FROM jsonb_populate_recordset(null::check_payments, p_payments);

  -- 4. Fechar comanda
  UPDATE checks SET
    paid_amount = p_paid_amount,
    status      = 'closed',
    closed_at   = now(),
    closed_by   = p_closed_by,
    paid_at     = now()
  WHERE id = p_check_id;

  -- Se qualquer UPDATE/INSERT falhar, toda a transação é revertida automaticamente
END;
$$;

-- Garante que apenas usuários autenticados podem chamar
REVOKE ALL ON FUNCTION finalize_check FROM PUBLIC;
GRANT EXECUTE ON FUNCTION finalize_check TO authenticated;
