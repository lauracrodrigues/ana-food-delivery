# Design: Auth

## Banco de Dados

**`profiles`** (espelho do auth.users)
- `id` UUID PK = auth.users.id
- `company_id` UUID FK → companies
- `full_name` TEXT
- `role` TEXT (legado, usar user_roles)
- `preferences` JSONB DEFAULT '{}'::jsonb — preferências pessoais

**`user_roles`** (roles por empresa, usuário pode ter múltiplos)
- `user_id` UUID FK → auth.users
- `company_id` UUID FK → companies
- `role` ENUM: company_admin | company_staff | super_admin

**`companies`**
- `id` UUID PK
- `name`, `fantasy_name`, `phone`, `email`
- `address` JSONB
- `schedule` JSONB — horários de funcionamento
- `robot_enabled` BOOLEAN
- `status_messages_enabled` BOOLEAN
- `slug` TEXT UNIQUE — para subdomínio

## RLS (Row Level Security)

Todas as tabelas têm política RLS baseada em `company_id`:
```sql
-- Exemplo: usuário só vê pedidos da sua empresa
USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
```

## Hook de Role

`useUserRole()` — retorna role mais alta do usuário:
- Hierarquia: super_admin > company_admin > company_staff
- Cache 5 min

## ProtectedRoute

```tsx
<ProtectedRoute requiredRole={["company_admin"]}>
  <Users />
</ProtectedRoute>
```
Redireciona para `/` se role insuficiente.

## Decisões de Design

1. **Supabase Auth**: evita implementar JWT/sessions do zero, integra com RLS nativo
2. **user_roles separado de profiles**: permite usuário ter roles em múltiplas empresas (futuro: consultores, suporte)
3. **preferences em profiles**: campo JSONB para preferências UI pessoais, sem tabela extra
