# Padrões de Código — AnaFood

## Versionamento de Arquivos

**Obrigatório** — todo arquivo modificado deve ter versão no topo:
```typescript
// NomeArquivo.tsx — v1.2.0
// ou
// NomeArquivo.tsx — v2.0.0
```

## React Query — queryKey

Sempre inclui `company_id` ou `user_id` para evitar cache cross-tenant:
```typescript
// CERTO
queryKey: ["orders", companyId]
queryKey: ["store-settings", profile?.company_id]
queryKey: ["user-preferences"] // user_id implícito via auth

// ERRADO
queryKey: ["orders"] // cache compartilhado entre tenants
```

## Mutations com Optimistic Update

Padrão para operações que precisam de feedback imediato:
```typescript
const mutation = useMutation({
  mutationFn: saveToServer,
  onMutate: async (newData) => {
    await queryClient.cancelQueries({ queryKey });
    const previous = queryClient.getQueryData(queryKey);
    queryClient.setQueryData(queryKey, (old) => ({ ...old, ...newData }));
    return { previous };
  },
  onError: (_, __, ctx) => {
    if (ctx?.previous) queryClient.setQueryData(queryKey, ctx.previous);
  },
  onSettled: () => queryClient.invalidateQueries({ queryKey }),
});
```

## Hooks Customizados

- Prefixo `use` obrigatório
- Responsabilidade única por hook
- Retornar objeto nomeado (não array para hooks com múltiplos valores)
```typescript
// CERTO
const { preferences, savePreference, isLoading } = useUserPreferences();

// EVITAR para múltiplos valores
const [prefs, save, loading] = useUserPreferences();
```

## TypeScript

- Interfaces para shapes de dados (`interface Order {}`)
- Types para unions/aliases (`type OrderStatus = 'pending' | 'preparing'`)
- Nunca `any` em código novo — usar `unknown` + type guard se necessário
- Tipos gerados do Supabase em `src/integrations/supabase/types.ts` — não duplicar

## Componentes

- Componente de página: max ~200 LOC
- Componente de UI: max ~150 LOC
- Props tipadas sempre (interface ou inline type)
- Evitar prop drilling >2 níveis — usar hook ou context

## Mapeamento camelCase ↔ snake_case

Frontend usa camelCase, banco usa snake_case:
```typescript
// Map de conversão em Edge Functions
function toDbFields(settings: Record<string, any>) {
  const map = {
    storeOpen: 'store_open',
    autoAccept: 'auto_accept',
    soundEnabled: 'sound_enabled',
    // ...
  };
  // ...
}
```

## Error Handling

- **Edge Functions**: sempre retornar `{ error: string }` + status code correto
- **Frontend**: toast de erro via `useToast()` + log no console (Sentry em produção)
- **Não silenciar erros**: evitar `try/catch` vazio

## Comentários

Somente quando o "por quê" não é óbvio:
```typescript
// Bug: req.json() consome o stream — ler apenas uma vez e reutilizar a variável
const body = await req.json();

// NÃO escrever:
// Busca as configurações do usuário
const settings = await fetchSettings(); // óbvio pelo nome
```

## Supabase Upsert

Preferir `upsert` sobre `insert/update` separados quando a chave de conflito é conhecida:
```typescript
await supabase
  .from("store_settings")
  .upsert({ company_id, ...data }, { onConflict: 'company_id' });
```

## Realtime Cleanup

Sempre limpar subscription ao desmontar:
```typescript
useEffect(() => {
  const channel = supabase.channel(`orders:${companyId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `company_id=eq.${companyId}` }, handler)
    .subscribe();

  return () => { supabase.removeChannel(channel); }; // OBRIGATÓRIO
}, [companyId]);
```
