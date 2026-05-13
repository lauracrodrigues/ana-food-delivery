# Spec: Confeitaria

## Status: ❌ NÃO IMPLEMENTADO

## Problema
Confeitarias têm fluxo diferente de restaurantes: produção por encomenda, prazo de preparo longo (dias), personalização complexa (tamanho, sabor, recheio, decoração), e entrega agendada.

## Objetivo
Módulo especializado para confeitarias com encomendas, produção agendada, e personalização de bolos/doces.

## Escopo

### In Scope
- Encomenda com data de entrega
- Personalização em camadas (tamanho → sabor → recheio → cobertura → decoração)
- Calendário de produção
- Status específico: encomendado → produzindo → pronto → entregue
- Pagamento parcial (sinal + restante)
- Ficha técnica (receita + custo)

### Out of Scope
- Delivery automático (confeitaria geralmente tem retirada ou entrega própria)

## Banco de Dados Planejado

```sql
CREATE TABLE orders_confeitaria (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL,
  customer_id     UUID REFERENCES customers(id),
  delivery_date   DATE NOT NULL,  -- data de entrega agendada
  status          TEXT DEFAULT 'ordered',  -- ordered|producing|ready|delivered
  customization   JSONB,  -- {size, flavor, filling, frosting, decoration}
  total           NUMERIC,
  deposit_paid    NUMERIC DEFAULT 0,  -- sinal pago
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

## Impacto

- Módulo paralelo ao de pedidos (não substitui)
- Novo tipo de pedido no kanban: `confeitaria`
- Bot WhatsApp: fluxo diferente para encomendas

## Prioridade
Baixa para o MVP — nicho específico.
