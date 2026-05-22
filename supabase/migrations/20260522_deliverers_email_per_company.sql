-- v1.0.0 — Email unique por COMPANY (multi-tenant), não global
-- Antes: deliverers_email_unique era partial unique em (email) — bloqueava email
--        em TODAS as empresas. Errado pra SaaS multi-tenant.
-- Agora: cada empresa pode cadastrar mesmo email (ex: mesmo entregador em 2 lojas).

BEGIN;

DROP INDEX IF EXISTS deliverers_email_unique;

CREATE UNIQUE INDEX deliverers_email_company_unique
  ON public.deliverers (company_id, email)
  WHERE email IS NOT NULL;

COMMIT;
