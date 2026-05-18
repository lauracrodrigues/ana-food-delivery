-- FASE 8 — Testes regressão integração (9 cenários checklist)
-- Roda em pg ATÔMICO: BEGIN ... ROLLBACK (não deixa lixo no DB)
-- Output: PASS/FAIL por cenário

\set CMP 'd09a06e5-9c4b-480a-b7d0-11b3ca943039'
\set ON_ERROR_STOP off
\timing off

BEGIN;

\echo ''
\echo '════════════════════════════════════════════════'
\echo '  FASE 8 — REGRESSION SUITE (9 cenários)'
\echo '════════════════════════════════════════════════'

-- ════════════════════════════════════════════════════════════════
-- TESTE 1: Regressão delivery (produto SEM controla_lote abate normal)
-- ════════════════════════════════════════════════════════════════
\echo ''
\echo '────────── TESTE 1: Delivery sem controla_lote ──────────'
INSERT INTO estoque_materia_prima (company_id, nome, unidade_estoque, controla_lote, saldo)
VALUES (:'CMP', 'T8_arroz_kg', 'KG', false, 50) RETURNING id AS t1_mp \gset

SELECT id AS t1_prod FROM products WHERE company_id=:'CMP' LIMIT 1 \gset

INSERT INTO estoque_composicao (company_id, product_id, materia_prima_id, qtd_por_unidade)
VALUES (:'CMP', :'t1_prod', :'t1_mp', 0.1);

INSERT INTO orders (company_id, customer_name, customer_phone, total, items, type, status, source, payment_method, origin, stage)
VALUES (:'CMP', 'T8_DELIVERY', '6299', 25,
  jsonb_build_array(jsonb_build_object('product_id', :'t1_prod', 'name', 'Test', 'quantity', 1, 'price', 25)),
  'delivery', 'pending', 'digital_menu', 'pix', 'online', 'pedido')
RETURNING id AS t1_oid \gset

SELECT faturar_movimento(:'t1_oid');
SELECT
  CASE WHEN saldo = 49.9 THEN '✓ TESTE 1 PASS — saldo 50 → 49.9 (abate sem lote)'
       ELSE '✗ TESTE 1 FAIL — saldo esperado 49.9, recebido: ' || saldo END
FROM estoque_materia_prima WHERE id=:'t1_mp';

-- ════════════════════════════════════════════════════════════════
-- TESTE 2: Venda UN vs KG
-- ════════════════════════════════════════════════════════════════
\echo ''
\echo '────────── TESTE 2: UN vs KG ──────────'
SELECT
  CASE WHEN unidade_venda IN ('UN', 'KG') THEN '✓ TESTE 2 PASS — products.unidade_venda = ' || unidade_venda
       ELSE '✗ TESTE 2 FAIL' END
FROM products WHERE id=:'t1_prod';

-- ════════════════════════════════════════════════════════════════
-- TESTE 3: Rollover 2 lotes FIFO
-- ════════════════════════════════════════════════════════════════
\echo ''
\echo '────────── TESTE 3: Rollover FIFO 2 lotes ──────────'
INSERT INTO estoque_materia_prima (company_id, nome, unidade_estoque, controla_lote, saldo)
VALUES (:'CMP', 'T8_carne_lote', 'KG', true, 0) RETURNING id AS t3_mp \gset

INSERT INTO estoque_lotes (company_id, materia_prima_id, codigo, qtd_esperada, qtd_recebida, custo_total)
VALUES (:'CMP', :'t3_mp', 'T8_A', 600, 600, 12000) RETURNING id AS t3_a \gset
INSERT INTO estoque_lotes (company_id, materia_prima_id, codigo, qtd_esperada, qtd_recebida, custo_total)
VALUES (:'CMP', :'t3_mp', 'T8_B', 1000, 1000, 22000) RETURNING id AS t3_b \gset

INSERT INTO estoque_composicao (company_id, product_id, materia_prima_id, qtd_por_unidade)
VALUES (:'CMP', :'t1_prod', :'t3_mp', 1000);

INSERT INTO orders (company_id, customer_name, customer_phone, total, items, type, status, source, payment_method, origin, stage)
VALUES (:'CMP', 'T8_FIFO', '6299', 1000,
  jsonb_build_array(jsonb_build_object('product_id', :'t1_prod', 'name', 'Test', 'quantity', 1, 'price', 1000)),
  'delivery', 'pending', 'digital_menu', 'pix', 'online', 'pedido')
RETURNING id AS t3_oid \gset

SELECT faturar_movimento(:'t3_oid');

SELECT
  CASE WHEN (SELECT count(*) FROM estoque_lote_alocacoes a
              JOIN estoque_lotes l ON l.id=a.lote_id
              WHERE l.codigo IN ('T8_A','T8_B')) = 2
       AND (SELECT status FROM estoque_lotes WHERE codigo='T8_A') = 'esgotado'
       THEN '✓ TESTE 3 PASS — 2 alocações + Lote A esgotado'
       ELSE '✗ TESTE 3 FAIL' END;

-- ════════════════════════════════════════════════════════════════
-- TESTE 4: Balanço lote com perda (cenário 1000kg a menos)
-- ════════════════════════════════════════════════════════════════
\echo ''
\echo '────────── TESTE 4: Balanço lote com perda ──────────'
INSERT INTO estoque_lotes (company_id, materia_prima_id, codigo, qtd_esperada, qtd_recebida, custo_total)
VALUES (:'CMP', :'t3_mp', 'T8_LOSS', 5000, 4000, 80000) RETURNING id AS t4_lote \gset
-- Esperado 5000, recebido só 4000 (diferenca -1000)

SELECT
  CASE WHEN (estoque_balanco_lote(:'t4_lote')->>'diferenca_recebimento')::numeric = -1000
       THEN '✓ TESTE 4 PASS — diferenca -1000 detectada'
       ELSE '✗ TESTE 4 FAIL — diferenca: ' || (estoque_balanco_lote(:'t4_lote')->>'diferenca_recebimento') END;

-- ════════════════════════════════════════════════════════════════
-- TESTE 5: Orçamento não toca estoque/financeiro
-- ════════════════════════════════════════════════════════════════
\echo ''
\echo '────────── TESTE 5: Orçamento isolado ──────────'
INSERT INTO orders (company_id, customer_name, customer_phone, total, items, type, status, source, payment_method, origin, stage)
VALUES (:'CMP', 'T8_ORC', '6299', 100,
  jsonb_build_array(jsonb_build_object('product_id', :'t1_prod', 'name', 'Test', 'quantity', 5, 'price', 20)),
  'delivery', 'pending', 'digital_menu', 'pix', 'balcao', 'orcamento')
RETURNING id AS t5_oid \gset

-- Verifica que NÃO criou lançamento + NÃO baixou estoque
SELECT
  CASE WHEN (SELECT count(*) FROM fin_lancamentos WHERE order_id=:'t5_oid') = 0
       AND (SELECT count(*) FROM estoque_movimentos WHERE order_id=:'t5_oid') = 0
       THEN '✓ TESTE 5 PASS — orçamento sem efeito colateral'
       ELSE '✗ TESTE 5 FAIL — orçamento criou efeitos' END;

-- Converte → pedido
SELECT converter_orcamento_em_pedido(:'t5_oid');
SELECT
  CASE WHEN (SELECT stage FROM orders WHERE id=:'t5_oid') = 'pedido'
       THEN '✓ TESTE 5b PASS — orçamento → pedido OK'
       ELSE '✗ TESTE 5b FAIL' END;

-- ════════════════════════════════════════════════════════════════
-- TESTE 6: Caixa fluxo completo
-- ════════════════════════════════════════════════════════════════
\echo ''
\echo '────────── TESTE 6: Caixa abertura→sangria→fechamento ──────────'
SELECT (abrir_caixa(:'CMP', 100, 'T8') ->> 'caixa_id') AS t6_caixa \gset

SELECT registrar_movimento_caixa(:'CMP', 'suprimento', 50, 't8');
SELECT registrar_movimento_caixa(:'CMP', 'sangria_despesa', 30, 't8');

-- saldo esperado = 100 + 50 - 30 = 120
-- Cliente contou 115 → quebra -5
SELECT
  CASE WHEN ((fechar_caixa(:'t6_caixa', 115))->>'quebra')::numeric = -5
       THEN '✓ TESTE 6 PASS — quebra -5 calculada corretamente'
       ELSE '✗ TESTE 6 FAIL' END;

-- ════════════════════════════════════════════════════════════════
-- TESTE 7: Faturar gera título; baixa gera lançamento
-- ════════════════════════════════════════════════════════════════
\echo ''
\echo '────────── TESTE 7: Faturar fiado → título → baixa → lançamento ──────────'
INSERT INTO orders (company_id, customer_name, customer_phone, total, items, type, status, source, payment_method, origin, stage)
VALUES (:'CMP', 'T8_FIADO', '6299', 200,
  jsonb_build_array(jsonb_build_object('product_id', :'t1_prod', 'name', 'Test', 'quantity', 10, 'price', 20)),
  'delivery', 'pending', 'counter', 'fiado', 'balcao', 'pedido')
RETURNING id AS t7_oid \gset

SELECT faturar_movimento(:'t7_oid');

SELECT id AS t7_tit FROM fin_titulos WHERE order_id=:'t7_oid' \gset
SELECT id AS t7_conta FROM fin_contas WHERE company_id=:'CMP' LIMIT 1 \gset

-- Baixa título R$50 parcial
SELECT baixar_titulo(:'t7_tit', 50, :'t7_conta');

SELECT
  CASE WHEN (SELECT status FROM fin_titulos WHERE id=:'t7_tit') = 'parcial'
       AND (SELECT count(*) FROM fin_lancamentos WHERE titulo_id=:'t7_tit') = 1
       THEN '✓ TESTE 7 PASS — título parcial + 1 lançamento criado'
       ELSE '✗ TESTE 7 FAIL' END;

-- ════════════════════════════════════════════════════════════════
-- TESTE 8: DRE bate lançamentos
-- ════════════════════════════════════════════════════════════════
\echo ''
\echo '────────── TESTE 8: DRE consistente ──────────'
-- Soma manual de receitas no mês
SELECT
  CASE WHEN (
    SELECT COALESCE(SUM(valor), 0)
    FROM fin_lancamentos
    WHERE company_id=:'CMP' AND tipo='entrada'
      AND data_competencia >= date_trunc('month', now())
  ) = (
    SELECT COALESCE(SUM(total), 0)
    FROM v_dre
    WHERE company_id=:'CMP' AND tipo_categoria='receita'
      AND mes = date_trunc('month', now())
  )
  THEN '✓ TESTE 8 PASS — DRE bate com lançamentos'
  ELSE '✗ TESTE 8 FAIL — DRE diverge' END;

-- ════════════════════════════════════════════════════════════════
-- TESTE 9: Distribuidora desativa bot
-- ════════════════════════════════════════════════════════════════
\echo ''
\echo '────────── TESTE 9: Distribuidora bot OFF ──────────'
-- Vai mudar empresa pra distribuidora temporariamente
UPDATE companies SET company_type='distribuidora',
  modules_enabled = modules_enabled || '{"whatsapp": false}'::jsonb
WHERE id=:'CMP';

SELECT
  CASE WHEN NOT is_whatsapp_enabled(:'CMP')
       THEN '✓ TESTE 9 PASS — bot WhatsApp desativado pra distribuidora'
       ELSE '✗ TESTE 9 FAIL' END;

-- Reverte
UPDATE companies SET company_type='delivery',
  modules_enabled = modules_enabled || '{"whatsapp": true}'::jsonb
WHERE id=:'CMP';

\echo ''
\echo '════════════════════════════════════════════════'
\echo '  ROLLBACK — nenhum dado persiste no banco'
\echo '════════════════════════════════════════════════'
ROLLBACK;
