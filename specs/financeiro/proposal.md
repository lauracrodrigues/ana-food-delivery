# Spec: Financeiro

## Status: 🚧 PARCIALMENTE IMPLEMENTADO

## O que já existe
- Caixa (abertura/fechamento/movimentações) — ✅
- Billing/Assinatura Stripe — ✅
- Relatório básico no dashboard — ✅

## O que falta

### 1. Relatórios Financeiros Completos
- Faturamento por período (dia, semana, mês, custom)
- Comparativo com período anterior
- Faturamento por forma de pagamento
- Ticket médio por período
- Exportação PDF/Excel

### 2. DRE Simplificado
- Receita bruta
- Descontos e cancelamentos
- Taxa delivery (cobrada da empresa)
- Resultado líquido

### 3. Contas a Pagar/Receber (v2)
- Registro de despesas fixas
- Integração com caixa diário

## Banco de Dados Planejado

```sql
-- Despesas/Custos (v2)
CREATE TABLE expenses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL,
  category    TEXT,  -- 'insumos', 'aluguel', 'funcionarios', 'outros'
  description TEXT NOT NULL,
  amount      NUMERIC NOT NULL,
  date        DATE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

## O que usar do existente

- `orders` — faturamento por pedido (total, tipo de pagamento)
- `cash_movements` — movimentações de caixa
- `cash_registers` — abertura/fechamento com saldos

## Prioridade
Alta — relatórios financeiros são requisito crítico para tomada de decisão.
