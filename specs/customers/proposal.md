# Spec: Customers (Clientes)

## Problema
Empresas precisam visualizar e gerenciar sua base de clientes, histórico de pedidos e métricas de fidelidade.

## Objetivo
Lista de clientes com busca, filtros, histórico de pedidos por cliente, métricas RFM (Recência, Frequência, Monetário).

## Escopo

### In Scope
- Lista de clientes da empresa (por company_id)
- Busca por nome ou telefone
- Sheet de histórico de pedidos por cliente
- Métricas: total pedidos, total gasto, ticket médio
- Memória de preferências do cliente (vinda do bot WhatsApp)

### Out of Scope
- CRM completo (segmentos, campanhas)
- Exportação de base de clientes

## Referências
- `src/pages/Customers.tsx`
- `src/components/customers/CustomerOrderHistory.tsx`
- Backend: `GET /v1/customers/:phone/orders`
- Tabela `customers` — preferences JSONB + pending_order + last_order_data
