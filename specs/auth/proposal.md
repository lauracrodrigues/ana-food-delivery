# Spec: Auth (Autenticação)

## Problema
Sistema multi-tenant onde cada empresa é isolada. Usuários precisam de roles diferentes (admin, staff, super_admin) com permissões distintas.

## Objetivo
Autenticação segura com Supabase Auth, isolamento por company_id via RLS, e controle de acesso por role.

## Escopo

### In Scope
- Login com email/senha
- Cadastro de nova empresa (Registration)
- Row Level Security (RLS) por company_id
- Roles: company_admin, company_staff, super_admin
- Protected routes por role
- Auth callback (OAuth futuro)
- Sessão persistente

### Out of Scope
- Login social (Google, Facebook) — planejado
- SSO corporativo
- 2FA

## Referências
- `src/pages/Login.tsx`
- `src/pages/Registration.tsx`
- `src/components/auth/ProtectedRoute.tsx`
- `src/hooks/use-user-role.ts`
- Supabase: tabelas `profiles`, `user_roles`, `companies`
