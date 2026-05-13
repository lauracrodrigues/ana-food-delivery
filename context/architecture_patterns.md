# Padrões de Arquitetura — AnaFood

## Multi-Tenant (Regra Crítica)

- **Todo acesso ao banco** deve filtrar por `company_id`
- **RLS automático**: Supabase aplica políticas via `auth.uid()` → `profiles.company_id`
- **Nunca** fazer SELECT sem WHERE company_id em queries manuais
- **Toda nova tabela** deve ter `company_id UUID NOT NULL REFERENCES companies(id)`

```sql
-- CERTO
SELECT * FROM orders WHERE company_id = $1;

-- ERRADO — vazamento de tenant
SELECT * FROM orders;
```

## Camadas da Arquitetura

```
UI (React Pages/Components)
    ↓
Hooks (React Query / Custom)
    ↓
API Client (lib/api-client.ts)
    ↓
Edge Functions (Supabase Deno)
    ↓
Database (PostgreSQL + RLS)
```

**Regra**: lógica de negócio fica em Edge Functions, não em componentes React.

## Isolamento de Responsabilidade

| Camada | Responsabilidade |
|--------|-----------------|
| Páginas (`pages/`) | Composição e layout — zero lógica de negócio |
| Componentes (`components/`) | UI reutilizável — recebe props, emite eventos |
| Hooks (`hooks/`) | Estado e side-effects — ponte entre UI e dados |
| `lib/api-client.ts` | Chamadas HTTP centralizadas |
| Edge Functions | Validação, autorização, lógica de negócio |
| DB (triggers/functions) | Integridade de dados, cálculos atômicos |

## Realtime

- Canal sempre com namespace: `orders:{company_id}` — nunca global
- Cleanup obrigatório: `supabase.removeChannel(channel)` no `useEffect` return
- Validar `company_id` antes de subscrever

## Estado

- **Servidor**: React Query — `queryKey` inclui sempre `company_id`
- **Local UI**: `useState` para estado efêmero
- **PDV**: Zustand (`posStore`) — estado complexo de carrinho
- **Preferências pessoais**: `profiles.preferences` via `useUserPreferences`
- **Config empresa**: `store_settings` via React Query

## Modularidade

- Componentes max ~300 linhas — se maior, quebrar
- Hooks separados por domínio
- Sem circular imports
- Regras de negócio nunca duplicadas entre frontend e Edge Function

## Migrations

- Sempre versionadas: `supabase/migrations/YYYYMMDDHHMMSS_descricao.sql`
- `IF NOT EXISTS` obrigatório para idempotência
- `DEFAULT '{}'::jsonb` — não `DEFAULT "{}"` (erro de sintaxe)
- Testar em staging antes de produção
