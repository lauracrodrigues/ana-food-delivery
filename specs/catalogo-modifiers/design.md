# Design: Catálogo com Modifiers

## Modelo de dados

```
products  (já existe)
  ├─ id, name, price, category_id, image_url, description
  └─ N:M com modifier_groups via product_modifier_groups

modifier_groups (NOVO)
  ├─ id uuid PK
  ├─ company_id uuid FK
  ├─ name text                    ("Arroz", "Mistura", "Saladas")
  ├─ display_type text            ('radio' | 'checkbox' | 'quantity')
  ├─ min_select int DEFAULT 0
  ├─ max_select int DEFAULT 1
  ├─ is_required boolean          (atalho pra min>=1)
  ├─ sort_order int
  └─ created_at, updated_at

modifier_items (NOVO)
  ├─ id uuid PK
  ├─ group_id uuid FK ON DELETE CASCADE
  ├─ name text                    ("Arroz Branco", "Frango")
  ├─ price_delta numeric DEFAULT 0   ← 0 = sem preço extra na UI
  ├─ available boolean DEFAULT true
  ├─ sort_order int
  ├─ image_url text NULL
  └─ created_at, updated_at

product_modifier_groups (NOVO — junction M2M)
  ├─ product_id uuid FK ON DELETE CASCADE
  ├─ group_id uuid FK ON DELETE CASCADE
  ├─ min_override int NULL        (sobrescreve group.min_select)
  ├─ max_override int NULL        (sobrescreve group.max_select)
  ├─ sort_order int
  └─ PK (product_id, group_id)

order_item_modifiers (NOVO)
  ├─ id uuid PK
  ├─ order_id uuid FK
  ├─ order_item_id uuid FK
  ├─ modifier_item_id uuid FK
  ├─ name_snapshot text           (congelado ao criar pedido)
  ├─ price_delta_snapshot numeric
  ├─ quantity int DEFAULT 1
  └─ created_at
```

## RPCs

- `get_product_with_modifiers(p_product_id uuid)` → jsonb com produto +
  todos grupos + itens (preload completo, 1 chamada)
- `validate_modifier_selection(p_product_id, p_selections jsonb)` → boolean
  + erro detalhado (min/max violado)

## RLS (multi-tenant)

```sql
ALTER TABLE modifier_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY mg_company_isolation ON modifier_groups
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

ALTER TABLE modifier_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY mi_via_group ON modifier_items
  USING (group_id IN (SELECT id FROM modifier_groups));
-- product_modifier_groups herda RLS via products + modifier_groups
```

## UI/UX admin

### Página `/modifier-groups`
- Tabela: nome, tipo, min/max, qtd itens, ações
- Modal "Criar grupo": form + adicionar items inline
- Cada item: nome + price_delta (default 0, opcional)

### Aba "Acompanhamentos" no produto (`/products/:id/edit`)
- Lista de grupos disponíveis da empresa (left)
- Drag pra associar (right) — define sort_order
- Cada grupo associado: input override min/max + remove

## UI/UX cliente (PublicMenu)

```
┌─────────────────────────────┐
│ Marmita Grande      R$ 25,00│
├─────────────────────────────┤
│ Arroz (escolha 1) *         │  ← required
│ ○ Arroz Branco              │
│ ○ Arroz Integral            │
│ ○ Baião de Dois             │
│                             │
│ Mistura (escolha até 2)     │
│ ☐ Frango                    │  ← price_delta=0 → sem R$
│ ☐ Carne Assada    (+R$ 3,00)│  ← price_delta>0 → mostra
│ ☐ Linguiça                  │
└─────────────────────────────┘
Total: R$ 28,00 (1 mistura com adicional)
[ Adicionar ao carrinho ]
```

Renderização:
- `display_type='radio'` → input radio
- `display_type='checkbox'` → input checkbox
- `display_type='quantity'` → input number 0..max
- Itens com `price_delta === 0` → não renderiza preço
- Total atualiza em tempo real

## Bot WhatsApp

`cardapioService.getCardapio()` passa a retornar:
```
{
  produtos_principais: [...],   // só os "main"
  grupos: { [product_id]: [groups...] }
}
```

`stateMachine`/agentHarness ganha tool `escolher_modifiers(product_id, selections)`.
Validação via RPC antes de confirmar.

Fluxo conversacional:
1. Cliente: "Quero Marmita Grande"
2. Bot: lista grupos restantes "Você quer com arroz: branco, integral ou baião?"
3. Cliente: "branco"
4. Bot grava selection + pergunta próximo grupo
5. Quando todos os grupos required estão preenchidos, mostra resumo

## Estratégia de migração

- Tabelas novas convivem com sistema atual
- Produto sem grupos vinculados → fluxo antigo (sem quebrar)
- Produto com grupos → fluxo novo automaticamente
- Migração de dados é **opcional** (script separado)

## Trade-offs

| Decisão | Por quê |
|---------|---------|
| Snapshot em order_item_modifiers | Não quebra histórico se admin deletar item depois |
| min/max override por produto | Marmita G pode ter "2 misturas", Marmita P "1 mistura" usando mesmo grupo |
| display_type separado de max_select | UX clara: radio vs checkbox visual mesmo que tecnicamente max=1 |
| price_delta numeric (não int centavos) | Consistência com products.price (já é numeric) |
| Grupos = company-scoped (não global) | Cada restaurante define seus próprios; sem catálogo "compartilhado" |
