-- ========================================
-- FASE 1: CORREÇÕES CRÍTICAS DE SEGURANÇA
-- ========================================

-- 1.1: Garantir apenas 1 role por usuário/empresa
ALTER TABLE user_roles 
  DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key,
  ADD CONSTRAINT user_roles_user_id_company_unique 
  UNIQUE (user_id, company_id);

-- 1.2: View restrita para staff (empresas)
CREATE OR REPLACE VIEW companies_staff_view AS
SELECT 
  id, 
  name, 
  fantasy_name, 
  is_active, 
  logo_url, 
  banner_url, 
  description, 
  schedule
FROM companies;

-- RLS para view de empresas (staff)
CREATE POLICY "Staff can view company basic info"
ON companies FOR SELECT
TO authenticated
USING (
  get_user_company_id(auth.uid()) = id 
  AND has_company_role(auth.uid(), id, 'company_staff'::app_role)
  AND NOT has_company_role(auth.uid(), id, 'company_admin'::app_role)
);

-- 1.3: View restrita para staff (clientes)
CREATE OR REPLACE VIEW customers_staff_view AS
SELECT 
  id, 
  name, 
  phone, 
  company_id,
  created_at,
  updated_at
FROM customers;

-- RLS para view de clientes (staff)
CREATE POLICY "Staff can view customer basic info only"
ON customers FOR SELECT
TO authenticated
USING (
  get_user_company_id(auth.uid()) = company_id 
  AND has_company_role(auth.uid(), company_id, 'company_staff'::app_role)
  AND NOT has_company_role(auth.uid(), company_id, 'company_admin'::app_role)
);

-- ========================================
-- FASE 2: PROTEÇÃO DE LOGS DE AUDITORIA
-- ========================================

-- 2.1: Impedir UPDATE em logs
DROP POLICY IF EXISTS "Audit logs are immutable" ON audit_logs;
CREATE POLICY "Audit logs are immutable"
ON audit_logs FOR UPDATE
TO authenticated
USING (false);

-- 2.2: Impedir DELETE em logs
DROP POLICY IF EXISTS "Audit logs cannot be deleted" ON audit_logs;
CREATE POLICY "Audit logs cannot be deleted"
ON audit_logs FOR DELETE
TO authenticated
USING (false);

-- 2.3: Apenas INSERT via função
DROP POLICY IF EXISTS "Audit logs via function only" ON audit_logs;
CREATE POLICY "Audit logs via function only"
ON audit_logs FOR INSERT
TO authenticated
WITH CHECK (false);

-- 2.4: Garantir que a função pode bypassar a política
ALTER FUNCTION log_audit_event SECURITY DEFINER;

-- ========================================
-- FASE 3: LIMPEZA DE POLÍTICAS REDUNDANTES
-- ========================================

-- 3.1: Remover políticas duplicadas em profiles
DROP POLICY IF EXISTS "Usuários podem ver próprio perfil" ON profiles;
DROP POLICY IF EXISTS "Utilizadores podem ler o seu próprio perfil." ON profiles;
DROP POLICY IF EXISTS "Utilizadores podem ver o seu próprio perfil." ON profiles;

-- 3.2: Manter apenas uma política clara
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);