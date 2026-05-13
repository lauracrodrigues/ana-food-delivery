# Design: Settings

## Separação de Config

### Config da Empresa (`store_settings` — por company_id)
Compartilhada por TODOS os usuários da mesma empresa:
- `store_open` BOOLEAN
- `auto_accept` BOOLEAN
- `delivery_time` INTEGER (min)
- `pickup_time` INTEGER (min)
- `alert_time` INTEGER (min)
- `debounce_ms` INTEGER
- `order_numbering_mode` ENUM: sequential | daily
- `order_numbering_reset_time` TIME

### Preferências Pessoais (`profiles.preferences` — por user_id)
Cada usuário tem suas próprias preferências, independente:
- `soundEnabled` BOOLEAN
- `notificationSound` STRING (path do arquivo)
- `visibleColumns` JSONB {pending, preparing, ready, delivering, completed, cancelled}
- `autoPrint` BOOLEAN
- `printerSettings` JSONB {caixa, cozinha1, cozinha2, copa_bar}
- `theme` ENUM: light | dark
- `sidebarOpen` BOOLEAN

### Horários de Funcionamento (`companies.schedule` — por company_id)
```json
{
  "monday": { "open": "08:00", "close": "22:00", "closed": false },
  "tuesday": { ... },
  ...
}
```

## Hook de Preferências Pessoais

`useUserPreferences()` — lê/salva em `profiles.preferences` via merge:
- **Optimistic update**: aplica localmente antes de confirmar no servidor
- **Rollback**: reverte em caso de erro
- **Cache**: 5 min via React Query

## Edge Function (`api-settings`)

- `GET /{company_id}` — busca `store_settings`
- `PUT /{company_id}` — salva `store_settings` (upsert por company_id)
- Mapeamento camelCase → snake_case via `toDbFields()`

## Decisões de Design

1. **Split empresa/usuário**: usuários da mesma empresa não devem sobrescrever preferências uns dos outros
2. **JSONB livre em preferences**: flexível para adicionar novos campos sem migration de coluna
3. **Sidebar state em cookie**: `sidebar:state` salvo automaticamente pelo SidebarProvider (shadcn), lido no init via `getSidebarDefaultOpen()`
