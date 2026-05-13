# Spec: Fidelidade (Loyalty Program)

## Status: ❌ NÃO IMPLEMENTADO

## Problema
Restaurantes querem fidelizar clientes mas não têm ferramenta integrada ao WhatsApp e ao sistema de pedidos.

## Objetivo
Programa de pontos integrado: cliente acumula pontos por compra e resgata como desconto, com visibilidade via WhatsApp.

## Escopo

### In Scope
- Configuração de regra de pontos por empresa (ex: 1 ponto por R$1 gasto)
- Acúmulo automático ao concluir pedido
- Resgate de pontos como desconto no próximo pedido
- Saldo de pontos consultável via WhatsApp (bot)
- Painel do operador: ver saldo do cliente, aplicar resgate manual
- Histórico de pontos por cliente

### Out of Scope (v1)
- Cashback em dinheiro
- Níveis de fidelidade (Bronze, Prata, Ouro)
- Pontos com expiração

## Banco de Dados Planejado

```sql
-- Configuração do programa por empresa
CREATE TABLE loyalty_config (
  company_id       UUID PRIMARY KEY REFERENCES companies(id),
  points_per_real  NUMERIC DEFAULT 1,  -- pontos por R$1
  points_to_redeem INTEGER DEFAULT 100,  -- pontos = R$1 de desconto
  enabled          BOOLEAN DEFAULT false
);

-- Saldo de pontos por cliente
CREATE TABLE loyalty_points (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id),
  balance     INTEGER DEFAULT 0,
  total_earned INTEGER DEFAULT 0,
  total_redeemed INTEGER DEFAULT 0,
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Histórico de transações de pontos
CREATE TABLE loyalty_transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL,
  customer_id   UUID NOT NULL,
  order_id      UUID REFERENCES orders(id),
  type          TEXT NOT NULL,  -- 'earn' | 'redeem'
  points        INTEGER NOT NULL,
  description   TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);
```

## Design Técnico

- Acúmulo: trigger em `orders.status = 'completed'` calcula e insere em `loyalty_transactions`
- Resgate: desconto aplicado no pedido (novo campo `orders.loyalty_discount`)
- WhatsApp bot: tool `consultarPontos()` retorna saldo do cliente
- Expiração: cron job mensal (v2)

## Impacto em Módulos Existentes

- `orders`: campo `loyalty_discount NUMERIC DEFAULT 0`
- `customers`: total de pontos em `customers.loyalty_balance` (desnormalizado para performance)
- `whatsapp bot`: nova tool `consultarPontos` e `resgatar pontos`
- `PDV`: campo de resgate no checkout

## Prioridade
Média — diferencial competitivo, mas não bloqueia operação.
