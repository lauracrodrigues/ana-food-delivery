# Design: Orders

## Arquitetura

```
Orders (page)
  └── OrdersKanban (component)
        ├── KanbanHeader — filtros, busca, toggle som/colunas, botão pedido manual
        ├── KanbanColumn[] — uma por status
        │     └── OrderCard[] — card drag-and-drop
        ├── OrderDetailsDialog — modal com detalhes completos
        ├── CancelOrderDialog — confirmar cancelamento com motivo
        └── ManualOrderSidebar — 80vw Sheet para criar pedido manual
```

## Banco de Dados

**Tabela `orders`**
- `id` UUID PK
- `company_id` UUID FK → companies (isolamento multi-tenant)
- `order_number` VARCHAR — gerado sequencial ou diário (configurável)
- `status` ENUM: pending | preparing | ready | delivering | completed | cancelled | archived
- `customer_name`, `customer_phone`
- `items` JSONB — array de {product_id, name, price, qty, obs}
- `total` NUMERIC
- `type` ENUM: delivery | pickup | table
- `address` JSONB
- `payment_method` VARCHAR
- `notes` TEXT
- `created_at`, `updated_at`

## Realtime

Supabase Realtime (canal `orders:{companyId}`) escuta INSERT e UPDATE.  
Novos pedidos → disparam som de notificação (se `soundEnabled` = true no user preferences).

## Estado Local

`settings` em `OrdersKanban` combina:
- **Config empresa** (`store_settings`): storeOpen, autoAccept, deliveryTime, pickupTime, alertTime
- **Config usuário** (`profiles.preferences`): soundEnabled, notificationSound, visibleColumns, autoPrint

## Status Flow

```
pending → preparing → ready → delivering → completed → [archived via cron]
                                         → [cancelled]
```

## API

- `GET /api-orders?company_id=X` — lista pedidos ativos
- `PATCH /api-orders` — atualiza status
- `POST /api-orders` — cria pedido (manual ou via bot)
- Auth: JWT (frontend) ou X-API-Token (WhatsApp bot)

## Decisões de Design

1. **Realtime no frontend vs polling**: Escolhido Realtime para UX imediata e sem lag
2. **Configurações por usuário**: som e colunas visíveis em `profiles.preferences` — cada operador tem preferência independente
3. **Auto-arquivamento no backend**: cron job no worker (não no frontend) para garantir execução mesmo sem browser aberto
4. **Order number**: modo sequential ou daily (resetar à meia-noite) — configurável por empresa
