# Spec: Distribuidoras / Fornecedores

## Problema
Restaurantes compram ingredientes de múltiplos fornecedores. Não há como rastrear pedidos de compra, custos de entrada e dar baixa automática no estoque ao receber mercadoria.

## Objetivo
Módulo completo de gestão de fornecedores: cadastro, pedidos de compra e recebimento com atualização automática de estoque.

## Fluxo
1. Cadastrar fornecedor (nome, CNPJ, contato, telefone, email)
2. Criar pedido de compra vinculado ao fornecedor
3. Adicionar itens ao pedido (ingredientes ou item livre)
4. Marcar como "enviado" ao fornecedor
5. Ao chegar: marcar como "recebido" → cria stock_movements automaticamente

## Tabelas

- `distributors` — cadastro de fornecedores
- `purchase_orders` — pedidos de compra (draft → ordered → received)
- `purchase_order_items` — itens de cada pedido

## Status
🚧 Implementando
