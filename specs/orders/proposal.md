# Spec: Orders (Pedidos)

## Problema
Restaurantes e marmitarias recebem pedidos via WhatsApp e precisam de visibilidade em tempo real do status de cada pedido, com fluxo de aceite → preparo → entrega/retirada.

## Objetivo
Kanban visual de pedidos com atualização em tempo real, drag-and-drop de status, notificação sonora de novos pedidos, e histórico arquivado.

## Escopo

### In Scope
- Kanban com colunas: Pendente → Preparando → Pronto → Em Entrega → Concluído → Cancelado
- Realtime via Supabase Realtime (WebSocket)
- Notificação sonora configurável por usuário
- Busca por número, nome ou telefone
- Drag and drop entre colunas
- Detalhes do pedido em modal (itens, endereço, pagamento)
- Pedido manual (criado pelo operador)
- Auto-arquivamento de pedidos concluídos >24h (cron job backend)
- Colunas visíveis configuráveis por usuário

### Out of Scope
- Integração com impressora fiscal (NF-e)
- Rastreamento de entregador em mapa

## Stakeholders
- Operadores da loja (atendem pedidos)
- Dono do negócio (visão geral)

## Referências
- `src/components/orders/OrdersKanban.tsx`
- `src/pages/Orders.tsx`
- `supabase/functions/api-orders/`
