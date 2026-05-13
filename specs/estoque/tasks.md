# Tasks: Estoque — v1.0.0

## Implementado ✅

- [x] Tabelas no banco: `ingredients`, `recipes`, `stock_movements` (migration aplicada 2026-05-11)
- [x] RLS por `company_id` nas 3 tabelas
- [x] Trigger `deduct_stock_on_order` — baixa automática ao mover pedido para `preparing`, repõe ao cancelar
- [x] `products.track_stock` column adicionada
- [x] Página `/estoque` com 3 abas: Ingredientes | Receitas | Movimentações
- [x] CRUD de ingredientes (nome, unidade, estoque, mínimo, custo unitário)
- [x] Entrada manual de estoque (compra / ajuste absoluto)
- [x] Alertas visuais: badge laranja (abaixo do mínimo), badge vermelho (zerado)
- [x] Ficha técnica por produto (RecipeEditor): associa ingredientes + quantidades
- [x] Histórico de movimentações (últimas 100): tipo, ingrediente, quantidade, motivo
- [x] Atalho de entrada rápida (ícone PackagePlus direto na linha do ingrediente)
- [x] Navegação: grupo "Produtos" no sidebar com Lista, Categorias e Estoque

## Pendente / Backlog

- [ ] Bloquear produto automaticamente quando ingrediente chega a zero (auto toggle `on_off`)
- [ ] Alerta Realtime no dashboard quando estoque abaixo do mínimo
- [ ] Relatório de custo por pedido (CMV — Custo de Mercadoria Vendida)
- [ ] Inventário de contagem (ajuste em lote de todos os ingredientes)
- [ ] Filtro de movimentações por ingrediente / período
- [ ] Exportar movimentações CSV
