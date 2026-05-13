# Spec: Dashboard

## Problema
Donos de negócio precisam de visão rápida do desempenho: pedidos do dia, faturamento, clientes novos.

## Objetivo
Dashboard com métricas em tempo real e gráficos de tendência para tomada de decisão.

## Escopo

### In Scope
- Pedidos do dia (total, por status)
- Faturamento do dia e semana
- Ticket médio
- Clientes novos vs recorrentes
- Gráfico de pedidos por hora/dia
- Produtos mais vendidos

### Out of Scope
- BI avançado / exportação de relatórios
- Comparação com períodos anteriores (planejado)

## Referências
- `src/pages/StoreDashboard.tsx`
- Recharts para gráficos
