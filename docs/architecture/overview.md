# Arquitetura — AnaFood

## Tipo: Serverless SaaS Multi-Tenant

O sistema usa arquitetura **serverless** baseada em Supabase — sem servidor Node.js dedicado. Toda lógica de backend vive em:
1. **Edge Functions** (Deno) — endpoints HTTP e webhooks
2. **Database Triggers/Functions** (PL/pgSQL) — integridade e automações atômicas
3. **RLS Policies** — autorização a nível de banco

## Diagrama

```
┌─────────────────────────────────────────────────────────┐
│  CLIENTES                                               │
│  Browser (React SPA)  |  WhatsApp (Evolution API)       │
└──────────┬───────────────────────────┬──────────────────┘
           │                           │
           │ HTTPS                     │ WebSocket/Webhook
           ▼                           ▼
┌──────────────────┐          ┌────────────────────┐
│  nginx (proxy)   │          │   Evolution API    │
│  anafood.vip     │          │  evo.anafood.vip   │
└──────────┬───────┘          └─────────┬──────────┘
           │                            │
           ▼                            ▼
┌──────────────────────────────────────────────────────┐
│              SUPABASE EDGE FUNCTIONS                  │
│                                                      │
│  api-orders      api-settings    user-management     │
│  whatsapp-       whatsapp-send   whatsapp-chat        │
│  evolution                                           │
│  qz-sign         check-permission   create-tenant    │
│  orders-status                                       │
└──────────────────────────┬───────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────┐
│              POSTGRESQL (Supabase)                    │
│                                                      │
│  ~45 tabelas  |  RLS Policies  |  Triggers           │
│  43 migrations |  Views         |  Functions         │
└──────────────────────────────────────────────────────┘
```

## Edge Functions

| Função | Método | Propósito |
|--------|--------|-----------|
| `api-orders` | GET, POST, PATCH | CRUD de pedidos + auth dupla (JWT/Token) |
| `api-settings` | GET, PATCH | Config empresa + horários + WhatsApp |
| `whatsapp-evolution` | POST | Proxy para Evolution API |
| `whatsapp-send` | POST | Envia mensagem com validação de número |
| `whatsapp-chat` | POST | Proxy findChats/findMessages |
| `user-management` | POST | CRUD de usuários (admin) |
| `qz-sign` | POST | Assina comandos de impressão |
| `check-permission` | POST | Valida role para recurso |
| `create-tenant` | POST | Onboarding de nova empresa |
| `orders-status` | POST | Webhook de mudança de status |

## Autenticação Flow

```
Login (email+senha)
    ↓
Supabase Auth → JWT (1h TTL, auto-refresh)
    ↓
Frontend: SDK guarda JWT em localStorage
    ↓
Requests: Authorization: Bearer {JWT}
    ↓
Edge Function: supabase.auth.getUser() valida JWT
    ↓
RLS: auth.uid() → company_id via profiles
```

## Deploy

- **Frontend**: `npm run build` → `dist/` servido pelo nginx em anafood.vip
- **Edge Functions**: `supabase functions deploy --project-ref jgdyklzrxygvwuhlnbat`
- **Migrations**: `supabase db push` ou SQL Editor no dashboard Supabase

## Realtime

Supabase Realtime (PostgreSQL LISTEN/NOTIFY via WebSocket):
- Canal por empresa: `orders:{company_id}`
- Filtro RLS aplicado automaticamente
- Frontend subscribes em `useEffect` com cleanup

## Dependency Map

```
pages/Orders.tsx
  → components/orders/OrdersKanban.tsx
      → hooks/useCompanyId
      → hooks/useUserPreferences
      → lib/api-client
      → integrations/supabase/client (Realtime)
      → components/orders/KanbanHeader
      → components/orders/KanbanColumn
      → components/orders/OrderDetailsDialog
      → components/orders/ManualOrderSidebar
```
