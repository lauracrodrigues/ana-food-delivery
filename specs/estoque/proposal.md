# Spec: Estoque (Inventory)

## Status: ❌ NÃO IMPLEMENTADO

## Problema
Restaurantes precisam controlar ingredientes e insumos para evitar vender produtos indisponíveis e para planejar compras.

## Objetivo
Módulo de controle de estoque integrado ao cardápio: baixa automática ao confirmar pedido, alertas de mínimo, e gestão de fornecedores.

## Escopo

### In Scope
- Cadastro de ingredientes/insumos
- Receitas: produto → ingredientes necessários (quantidade)
- Baixa automática ao confirmar pedido (database trigger ou Edge Function)
- Alerta quando estoque < mínimo configurado
- Bloquear produto automaticamente quando ingrediente zerado
- Entrada manual de estoque (compras)
- Histórico de movimentações

### Out of Scope (v1)
- Gestão de fornecedores com cotação
- Inventário físico com código de barras
- Integração com NF-e de compras

## Banco de Dados Planejado

```sql
-- Ingredientes/insumos
CREATE TABLE ingredients (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id),
  name        TEXT NOT NULL,
  unit        TEXT NOT NULL,  -- kg, g, L, ml, un
  stock       NUMERIC DEFAULT 0,
  min_stock   NUMERIC DEFAULT 0,  -- alerta abaixo deste valor
  cost_price  NUMERIC,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Receitas (produto → ingredientes)
CREATE TABLE recipes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL,
  product_id    UUID NOT NULL REFERENCES products(id),
  ingredient_id UUID NOT NULL REFERENCES ingredients(id),
  quantity      NUMERIC NOT NULL  -- quantidade usada por unidade do produto
);

-- Movimentações de estoque
CREATE TABLE stock_movements (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id),
  type          TEXT NOT NULL,  -- 'in' (compra) | 'out' (venda) | 'adjustment'
  quantity      NUMERIC NOT NULL,
  reason        TEXT,
  order_id      UUID REFERENCES orders(id),
  created_at    TIMESTAMPTZ DEFAULT now()
);
```

## Design Técnico

- Baixa de estoque: trigger PostgreSQL em `orders.status = 'preparing'`
- Alerta: check após baixa, emite evento Realtime se `stock < min_stock`
- Produto indisponível: `products.available = false` quando `stock = 0`
- Recovery: ao cancelar pedido, repor estoque via trigger

## Impacto em Módulos Existentes

- `products`: adicionar flag `track_stock BOOLEAN DEFAULT false`
- `orders`: trigger de baixa ao mudar status para `preparing`
- `whatsapp bot`: verificar disponibilidade antes de oferecer produto

## Prioridade
Alta — bloqueia crescimento para segmentos de confeitaria e produção.
