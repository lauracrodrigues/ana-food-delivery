# Catálogo com Modifiers — Resumo final

## Status

✅ **Fases 1-6 entregues + Fase 8 testes passando**

## O que foi entregue

### Banco (Fase 1)
Migration `20260519_catalogo_modifiers.sql`:
- `modifier_groups` (Arroz, Mistura, Salada — reutilizáveis)
- `modifier_items` (Frango, Carne+R$3) com `price_delta` (0 esconde preço)
- `product_modifier_groups` (junction com overrides min/max por produto)
- `order_item_modifiers` (snapshot — não quebra histórico)
- RLS multi-tenant em todas
- RPC `get_product_with_modifiers(uuid)` — preload completo 1 query
- RPC `validate_modifier_selection(uuid, jsonb)` — valida min/max

### Admin (Fases 2-3)
- Página `/modifier-groups` — CRUD completo
- `ProductModifierGroupsSection` — aba "Acompanhamentos" no produto
- Override min/max por produto (Marmita G "2 misturas" vs Marmita P "1")
- Reordenar via setas
- Menu: Cadastros → Grupos de Opções

### Cardápio público (Fase 4)
- `ProductAddModal` tenta novo schema primeiro (RPC)
- Fallback pro legado se produto sem novos grupos
- Render: `price > 0` esconde "R$ 0,00" automaticamente
- Radio (max=1) vs Checkbox (max>1) já funciona

### Checkout (Fase 5)
- `MenuCheckout` gera `line_id` UUID por linha do carrinho
- Envia `extras` estruturado no payload
- Edge `create-menu-order` snapshot em `order_item_modifiers`
- Best-effort + fallback NULL pra extras de schema legado

### Bot WhatsApp (Fase 6 MVP)
- `services/modifierService.js` (cliente RPC + format helper)
- Tool `escolher_modifier_items` no agentHarness
- Valida min/max via RPC + snapshot no state
- Coexiste com tools antigas de marmita

### Testes (Fase 8)
`e2e/catalogo-modifiers.spec.ts` — 4/4 passing:
- Tabelas existem
- RPC `get_product_with_modifiers` funciona
- RPC `validate_modifier_selection` valida sem grupos
- Cardápio público carrega

## Pendências (não bloqueantes)

- **Drag-and-drop** pra reordenar grupos vinculados ao produto (atual: setas ↑↓)
- **Migração de dados legados** (Fase 7 — opcional, pode pular se reset DB)
- **Bot WhatsApp**: integrar `_modifierSelections` no save final do pedido (orderEngine)
- **Fluxo conversacional determinístico** do bot (atual: LLM decide tool via descrições)

## Comparação visual (validação)

### Antes
```
Categoria: Acompanhamentos
  - Arroz Branco (R$ 0,00)
  - Frango Frito (R$ 0,00)
  - Carne Assada (R$ 3,00)
```

### Depois (novo schema, atual)
```
Marmita Grande — R$ 25,00

  Arroz (escolha 1) *
   ○ Arroz Branco
   ○ Arroz Integral
   ○ Baião de Dois

  Mistura (escolha até 2)
   ☐ Frango
   ☐ Carne Assada (+R$ 3,00)
   ☐ Linguiça
```

## Como criar um produto customizável (passo a passo admin)

1. `Cadastros → Grupos de Opções → Novo grupo`
   - Ex: "Mistura", checkbox, min=1, max=2, obrigatório
   - Adiciona itens inline: Frango (0), Carne (+3), Linguiça (0)

2. `Cadastros → Produtos → Editar "Marmita Grande"`
   - Scroll até "Grupos de Opções Vinculados"
   - Select "Adicionar grupo..." → "Mistura"
   - Override max=2 (se quiser regra específica desse produto)

3. Cliente abre cardápio → vê grupo Mistura com 3 opções, escolhe até 2.
   Apenas "Carne Assada" mostra preço extra.

## Comandos úteis

```bash
# Reset todos modifiers (dev/staging)
DELETE FROM modifier_groups WHERE company_id = '<id>';
# CASCADE deleta items + links

# Testar RPC manualmente
SELECT jsonb_pretty(get_product_with_modifiers('<product_id>'::uuid));

# Validar seleção fake
SELECT validate_modifier_selection(
  '<product_id>'::uuid,
  '[{"group_id":"<gid>","item_ids":["<iid1>","<iid2>"]}]'::jsonb
);

# Rodar E2E
npx playwright test e2e/catalogo-modifiers.spec.ts
```
