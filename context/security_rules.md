# Regras de Segurança — AnaFood

## Autenticação

- **Supabase Auth** — nunca implementar JWT manual
- JWT expira em 1h — renovação automática via Supabase client
- Sessão persistida em localStorage pelo SDK
- Nunca expor `service_role` key no frontend — somente Edge Functions

## Autorização

### RLS (Row Level Security)
- **Obrigatório** em TODA tabela com dados de tenant
- Política padrão:
```sql
USING (company_id = (
  SELECT company_id FROM profiles WHERE id = auth.uid()
))
```
- `super_admin` usa `security definer` function para bypass controlado

### Roles
```
super_admin  → acessa tudo (SaaS admin)
company_admin → gerencia empresa + usuários
company_staff → opera (pedidos, PDV, chat)
```

### Protected Routes
```tsx
// Rota protegida por role
<ProtectedRoute requiredRole={["company_admin"]}>
  <Users />
</ProtectedRoute>
```

## Edge Functions

- **Nunca confiar em input do cliente** — sempre validar payload
- Rate limit: 100 req/min por IP (implementado)
- Auth hierarchy: JWT > X-API-Token > X-Company-Key (CNPJ/CPF)
- `X-Company-Key` faz lookup no banco — não aceitar company_id direto do header
- CORS: whitelist de origens (não `*` em produção)
- Secrets somente via Supabase Vault (não em código)

## Sanitização

- Inputs de usuário sempre sanitizados antes de query
- Parametrized queries via Supabase SDK (não concatenação de SQL)
- HTML/JSON inputs: validar shape antes de inserir em JSONB
- Phone numbers: normalizar formato antes de salvar

## Webhook Security

- WhatsApp webhook: validar assinatura HMAC do Evolution API
- Stripe webhook: validar `Stripe-Signature` header
- Nunca processar webhook sem validação de assinatura

## Segredos (Secrets)

- **Nunca em código**: OPENAI_KEY, STRIPE_KEY, SUPABASE_SERVICE_ROLE
- Local: variáveis de ambiente (`.env` não comitado)
- Produção: Supabase Vault / environment variables das Edge Functions
- Frontend: somente `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (públicas por design)

## Impressão (QZ Tray)

- Comandos de impressão assinados via `qz-sign` Edge Function
- Chave privada em Supabase Vault, não no cliente
- Nunca expor chave de assinatura no frontend

## Auditoria

- `audit_logs` tabela para mudanças críticas
- Log de mudanças de role de usuário
- Log de abertura/fechamento de caixa
- Log de cancelamento de pedido (com motivo)
