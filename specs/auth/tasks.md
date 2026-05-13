# Tasks: Auth

## Implementado ✅

- [x] Login com email/senha (Supabase Auth)
- [x] Cadastro de empresa + usuário admin
- [x] Tabela profiles com company_id
- [x] Tabela user_roles com hierarquia de roles
- [x] ProtectedRoute por role
- [x] Hook useUserRole com cache
- [x] RLS em todas as tabelas principais
- [x] Column preferences JSONB em profiles (migration 2026-05-11)
- [x] Auth callback route

## Pendente / Backlog

- [ ] Login social (Google OAuth)
- [ ] Convite de usuário por email (sem precisar criar conta)
- [ ] Reset de senha com template customizado da marca
- [ ] 2FA (TOTP)
- [ ] Audit log de login (IP, dispositivo, hora)
- [ ] Sessão expirar após inatividade configurável
