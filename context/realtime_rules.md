# Regras de Realtime — AnaFood

## Canais (Namespacing Obrigatório)

**Nunca** criar canal global sem isolamento de tenant:
```typescript
// CERTO — isolado por empresa
const channel = supabase.channel(`orders:${companyId}`);
const channel = supabase.channel(`chat:${companyId}`);

// ERRADO — global, vazamento entre tenants
const channel = supabase.channel('orders');
```

## Filtros RLS

Supabase Realtime respeita RLS. Mas SEMPRE adicionar filtro explícito também:
```typescript
.on('postgres_changes', {
  event: '*',
  schema: 'public',
  table: 'orders',
  filter: `company_id=eq.${companyId}` // filtro explícito + RLS = dupla proteção
}, handler)
```

## Canais Ativos

| Canal | Tabela | Eventos | Consumer |
|-------|--------|---------|----------|
| `orders:{companyId}` | orders | INSERT, UPDATE | OrdersKanban |
| `chat:{companyId}` | msg_history | INSERT | WhatsAppChat |
| `checks:{companyId}` | checks | INSERT, UPDATE | POS Tables |

## Lifecycle

- **Subscribe** no `useEffect` com `companyId` como dependência
- **Unsubscribe** no cleanup (`return () => supabase.removeChannel(channel)`)
- **Re-subscribe** quando `companyId` muda (dependência no useEffect)

```typescript
useEffect(() => {
  if (!companyId) return; // nunca subscrever sem tenant

  const channel = supabase
    .channel(`orders:${companyId}`)
    .on('postgres_changes', { ... }, handler)
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, [companyId]); // re-subscribe se empresa mudar
```

## Notificações Sonoras

- Som disparado SOMENTE em INSERT de pedido novo (status = 'pending')
- Respeita `preferences.soundEnabled` do usuário logado (não config da empresa)
- Arquivo de som pré-carregado via `usePreloadedAudios` para evitar delay
- Debounce de 10s via `store_settings.debounce_ms`

## WhatsApp Chat Realtime

- Subscreve `msg_history` filtrado por `company_id`
- Nova mensagem (`direction = 'inbound'`) → atualiza lista do chat sem reload
- Mensagem enviada (`direction = 'outbound'`) → append otimista, confirma via Realtime

## Gestão de Reconexão

- Supabase SDK reconecta automaticamente em caso de queda
- Ao reconectar, React Query refetch via `queryClient.invalidateQueries`
- Não implementar reconexão manual — confiar no SDK
