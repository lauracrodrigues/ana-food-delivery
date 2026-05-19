# Tasks: Catálogo com Modifiers

## Fase 1 — Backend / banco
- [ ] Migration `20260519_catalogo_modifiers.sql`
  - [ ] Tabelas modifier_groups, modifier_items, product_modifier_groups, order_item_modifiers
  - [ ] RLS multi-tenant
  - [ ] Indexes
  - [ ] RPC get_product_with_modifiers
  - [ ] RPC validate_modifier_selection

## Fase 2 — Admin: CRUD modifier_groups
- [x] Página `/modifier-groups`
- [x] Hook useModifierGroups + useModifierItems (inline na page, sem extrair)
- [x] Modal criar/editar grupo + itens inline
- [ ] Reordenação drag-and-drop (futuro)

## Fase 3 — Admin: aba Acompanhamentos no produto
- [ ] Componente ProductModifierGroups
- [ ] Drag-and-drop pra associar
- [ ] Inputs override min/max por produto
- [ ] Sort order

## Fase 4 — PublicMenu cliente
- [ ] Componente ProductModifierSelector
- [ ] Estado de seleção + validação min/max
- [ ] Cálculo total dinâmico (price + Σ deltas selecionados)
- [ ] Render condicional de preço (esconde R$ 0,00)

## Fase 5 — Checkout
- [ ] Snapshot em order_item_modifiers ao criar pedido
- [ ] Persistir name/price_delta congelados

## Fase 6 — Bot WhatsApp
- [ ] cardapioService retorna grupos
- [ ] stateMachine: tool escolher_modifiers
- [ ] Fluxo conversacional pergunta cada grupo na ordem

## Fase 7 — Migração de dados (opcional)
- [ ] Script identificar produtos-acompanhamento legados
- [ ] Converter em modifier_items
- [ ] Soft-delete originais

## Fase 8 — Testes + docs
- [ ] Playwright E2E: criar grupo, associar a produto, pedir do cardápio
- [ ] Snapshot validation: pedido após delete de item ainda mostra correto
- [ ] Atualizar specs/orders/tasks com link
