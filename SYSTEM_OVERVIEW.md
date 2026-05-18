# AnaFood — System Overview

> Plataforma SaaS multi-tenant para delivery, balcão, mesa, WhatsApp e gestão de restaurantes.

## Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                     anafood.vip                         │
│              React SPA (Vite + TypeScript)               │
│         nginx local → /home/claude/ana-food-delivery/dist│
└──────────────────────────┬──────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
   ┌─────────────┐  ┌──────────────┐  ┌─────────────┐
   │  Supabase   │  │Evolution API │  │  QZ Tray    │
   │  (Backend)  │  │ (WhatsApp)   │  │ (Impressora)│
   └──────┬──────┘  └──────────────┘  └─────────────┘
          │
   ┌──────┴──────────────┐
   │   Edge Functions    │ (Deno Runtime)
   │  api-orders         │
   │  api-settings       │
   │  whatsapp-evolution │
   │  whatsapp-send      │
   │  user-management    │
   │  qz-sign            │
   │  check-permission   │
   │  create-tenant      │
   └──────┬──────────────┘
          │
   ┌──────┴──────────────┐
   │   PostgreSQL        │ (via Supabase)
   │   RLS por company_id│
   │   43 migrations     │
   │   ~45 tabelas       │
   └─────────────────────┘
```

## Subdomínios

| Subdomínio | Destino |
|------------|---------|
| `anafood.vip` | Landing page / Painel |
| `api.anafood.vip` | Backend (Node.js → Edge Functions) |
| `evo.anafood.vip` | Evolution API (WhatsApp) |
| `empresa.anafood.vip` | Cardápio digital público da empresa |

## Isolamento Multi-Tenant

- **Coluna**: `company_id UUID` em TODAS as tabelas de negócio
- **RLS**: Políticas Supabase garantem isolamento a nível de banco
- **Auth**: JWT do usuário → `company_id` via `profiles` → filtro automático
- **API externa**: `X-Company-Key` (CNPJ/CPF lookup) + `X-API-Token`

## Módulos do Sistema

### ✅ Implementados

| Módulo | Status | Localização |
|--------|--------|-------------|
| Autenticação | ✅ Produção | pages/Login, Registration, auth/ |
| Kanban de Pedidos | ✅ Produção | pages/Orders, components/orders/ |
| PDV (Ponto de Venda) | ✅ Produção | pages/POS, components/pdv/ |
| Mesas | ✅ Produção | pages/Tables |
| Caixa | ✅ Produção | pages/CashRegister, CashRegisterHistory |
| Cardápio Digital | ✅ Produção | pages/PublicMenu, Menu, MenuManagement |
| Produtos/Categorias | ✅ Produção | pages/Products, Categories, Extras |
| Clientes | ✅ Produção | pages/Customers |
| WhatsApp Bot | ✅ Produção | agentHarness.js, Edge Functions |
| WhatsApp Chat | ✅ Produção | pages/WhatsAppChat |
| Configurações | ✅ Produção | pages/Settings |
| Perfil da Empresa | ✅ Produção | pages/CompanyProfile |
| Usuários/Permissões | ✅ Produção | pages/Users |
| Taxas de Entrega | ✅ Produção | pages/DeliveryFees |
| Métodos de Pagamento | ✅ Produção | pages/PaymentMethods |
| Impressão Térmica | ✅ Produção | lib/qz-tray, print-templates |
| Dashboard Analytics | ✅ Produção | pages/StoreDashboard |
| Admin SaaS | ✅ Produção | pages/AdminDashboard |
| Billing/Assinatura | ✅ Produção | pages/Billing (Stripe) |
| Preferências por usuário | ✅ Produção | hooks/useUserPreferences |

### ❌ Não Implementados (do plano original)

| Módulo | Prioridade | Descrição |
|--------|------------|-----------|
| Estoque | Alta | Controle de ingredientes e insumos |
| Fidelidade | Média | Pontos, cashback, programa de lealdade |
| Automações | Média | Fluxos automáticos além do WhatsApp bot |
| Confeitaria | Baixa | Módulo especializado para confeitarias |
| IA Contextual | Alta | IA além do bot (análise de dados, sugestões) |
| Relatórios Avançados | Alta | BI, exportação, comparativos |

## Fluxo de Pedido (Delivery via WhatsApp)

```
Cliente → WhatsApp → Evolution API → Webhook
                                        ↓
                              agentHarness.js (LLM)
                                        ↓
                            Cria pedido via api-orders
                                        ↓
                            Supabase Realtime → Frontend
                                        ↓
                              Kanban (status: pending)
                                        ↓
                    Operador aceita → status: preparing
                                        ↓
                    WhatsApp-send → notifica cliente
                                        ↓
                         ready → delivering → completed
                                        ↓
                    Auto-arquivo >24h (cron backend)
```

## Fluxo de Pedido (PDV Balcão)

```
Operador → POS UI → posStore (Zustand)
                         ↓
               Seleciona produtos + extras
                         ↓
                   Forma de pagamento
                         ↓
               api-orders (create manual)
                         ↓
             QZ Tray → Impressão automática
                         ↓
               Kanban atualizado via Realtime
```

## Stack Tecnológico

### Frontend
- React 18 + TypeScript 5.8
- Vite 5.4 (build + dev)
- Tailwind CSS 3.4 + shadcn/ui
- React Query (server state + cache)
- Zustand (estado local PDV)
- React Router v6
- Recharts (gráficos)
- @dnd-kit (drag-and-drop kanban)
- Leaflet + OpenStreetMap (mapa de entregadores, mapa de calor, endereços)
- Sentry (error tracking)

### Backend (Serverless)
- Supabase Edge Functions (Deno)
- PostgreSQL + RLS (multi-tenant)
- Supabase Realtime (WebSocket)
- Supabase Auth (JWT)

### Integrações
- Evolution API — gateway WhatsApp
- OpenAI/Anthropic/Gemini/Groq — LLM para bot
- Stripe — pagamentos e assinaturas
- QZ Tray — impressora térmica desktop

## Eventos Realtime

| Canal | Evento | Consumer |
|-------|--------|----------|
| `orders:{company_id}` | INSERT, UPDATE | OrdersKanban → notificação sonora, move card |
| `msg_history:{company_id}` | INSERT | WhatsAppChat → nova mensagem |
| `checks:{company_id}` | INSERT, UPDATE | POS → atualiza comanda |

## Riscos Arquiteturais

| Risco | Severidade | Mitigação |
|-------|-----------|-----------|
| Edge Function cold start | Média | Warm-up periódico |
| RLS mal configurado = vazamento de tenant | Alta | Testes de isolamento |
| LLM cost sem controle | Média | tokenMonitor.js (migration pendente) |
| QZ Tray depende de desktop ativo | Média | Fallback manual |
| req.json() double-consume | Alta | ✅ Corrigido em api-settings |
| Preferências por empresa vs usuário | Alta | ✅ Corrigido com profiles.preferences |

## Padrões Globais

Detalhes em:
- [Padrões de Arquitetura](./context/architecture_patterns.md)
- [Padrões de Código](./context/coding_patterns.md)
- [Regras de Negócio](./context/business_rules.md)
- [Regras de Realtime](./context/realtime_rules.md)
- [Regras de Segurança](./context/security_rules.md)
- [Padrões Frontend](./context/frontend_patterns.md)
