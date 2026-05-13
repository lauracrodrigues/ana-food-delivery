# Padrões Frontend — AnaFood

## Layout Structure

```
App (Router + Providers)
├── DashboardLayoutWrapper (sidebar persistente)
│   ├── DashboardLayout
│   │   ├── AppSidebar (navegação)
│   │   └── <Outlet> (página ativa)
│   └── KanbanLayoutWrapper (fullscreen sem padding)
└── Rotas diretas (Login, PublicMenu, Admin, etc.)
```

## Loading States

- **Full page** (rota lazy): `<SplashScreen />` — logo + barra animada
- **Conteúdo interno** (dentro do layout): `<InlineLoader />` — spinner central
- **Botão/ação**: `isPending` do mutation → `disabled` + `Loader2` no botão

```typescript
// Lazy route
<Suspense fallback={<FullLoadingFallback />}>
  <MinhaPage />
</Suspense>

// Conteúdo de card
if (isLoading) return <InlineLoader message="Carregando pedidos..." />;
```

## Sidebar State

- Estado salvo automaticamente pelo SidebarProvider (cookie `sidebar:state`)
- `getSidebarDefaultOpen()` lê o cookie no init para restaurar estado
- **Nunca** hardcodar `defaultOpen={false}` — anula o cookie salvo

## Theme / Paleta

- `ThemeProvider` controla dark/light via `storageKey="anafood-theme"`
- Paleta de cores: `use-color-palette.ts` + CSS variables em `index.css`
- Tokens de cor: `--primary`, `--secondary`, `--accent`, `--muted`, etc.
- Nunca hardcodar hex — usar tokens `text-primary`, `bg-card`, etc.

## Formulários

- React Hook Form + Zod para validação
- Feedback de erro inline (não toast) para campos do form
- Toast para sucesso/erro de submissão

```typescript
const form = useForm<FormData>({ resolver: zodResolver(schema) });
```

## Responsividade

- Mobile-first com breakpoints Tailwind
- `use-mobile` hook para detecção de mobile
- Sidebar: colapsa em mobile (SidebarProvider comportamento padrão)
- Kanban: scroll horizontal em mobile

## Dialogs e Sheets

- **Dialog**: confirmações, detalhes de item (max 600px)
- **Sheet**: painéis laterais grandes (PDV, pedido manual, histórico de cliente)
  - Largura padrão: `80vw` em desktop, `100vw` em mobile

## Toasts

- **Sucesso**: `toast({ title: "Sucesso", description: "..." })`
- **Erro**: `toast({ title: "Erro", description: "...", variant: "destructive" })`
- Duração padrão: 3s (Sonner default)
- Não usar toast para erros de campo de formulário — usar mensagem inline

## Data Fetching Pattern

```typescript
// Query com company_id no key
const { data, isLoading } = useQuery({
  queryKey: ["recurso", companyId],
  queryFn: () => fetchRecurso(companyId),
  enabled: !!companyId, // nunca buscar sem tenant
  staleTime: 5 * 60 * 1000,
});
```

## Optimistic UI

Priorizar para operações frequentes (ex: toggle de status):
1. `onMutate`: atualiza cache local imediatamente
2. `onError`: reverte se falhar
3. `onSettled`: invalida query para confirmar estado real

## Subdomínio → Menu Público

`getSubdomain()` em App.tsx detecta se é `empresa.anafood.vip`:
- Se sim: renderiza `<PublicMenu>` na raiz sem login
- Se não: renderiza `<Index>` (landing) normalmente
- Domínios ignorados: `www`, `api`, `evo`, `admin`, localhost, IPs
