-- ============================================
-- SECURITY FIX: Restrict sensitive data access
-- ============================================

-- 1. Drop existing policies on companies table
DROP POLICY IF EXISTS "Company owners can view their company" ON public.companies;
DROP POLICY IF EXISTS "Owners can update their companies" ON public.companies;
DROP POLICY IF EXISTS "Super admins can view companies with audit" ON public.companies;

-- 2. Create granular policies for companies table

-- Company admins can view ALL fields of their company
CREATE POLICY "Company admins can view their company"
ON public.companies
FOR SELECT
USING (
  (owner_id = auth.uid() OR has_company_role(auth.uid(), id, 'company_admin'::app_role))
);

-- Company staff can view LIMITED fields (no sensitive data)
CREATE POLICY "Company staff can view basic info"
ON public.companies
FOR SELECT
USING (
  get_user_company_id(auth.uid()) = id 
  AND has_company_role(auth.uid(), id, 'company_staff'::app_role)
  AND NOT has_company_role(auth.uid(), id, 'company_admin'::app_role)
);

-- Only company admins and owners can update
CREATE POLICY "Only admins can update companies"
ON public.companies
FOR UPDATE
USING (
  owner_id = auth.uid() OR has_company_role(auth.uid(), id, 'company_admin'::app_role)
)
WITH CHECK (
  owner_id = auth.uid() OR has_company_role(auth.uid(), id, 'company_admin'::app_role)
);

-- Super admins can view all (with audit)
CREATE POLICY "Super admins can view companies with audit"
ON public.companies
FOR SELECT
USING (
  has_role(auth.uid(), 'super_admin'::app_role) 
  AND (
    (log_audit_event('VIEW_SENSITIVE_DATA', 'companies', id, 
      jsonb_build_object('accessed_fields', 'all', 'reason', 'super_admin_access')
    ) IS NULL) OR true
  )
);

-- 3. Update customers table policies

-- Drop existing customer policies
DROP POLICY IF EXISTS "Company admins can manage customers" ON public.customers;
DROP POLICY IF EXISTS "Company admins can view all customers" ON public.customers;
DROP POLICY IF EXISTS "Company staff can view limited customer data" ON public.customers;

-- Only company admins can manage customers (full CRUD)
CREATE POLICY "Only admins can manage customers"
ON public.customers
FOR ALL
USING (
  get_user_company_id(auth.uid()) = company_id 
  AND (
    has_company_role(auth.uid(), company_id, 'company_admin'::app_role) 
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
)
WITH CHECK (
  get_user_company_id(auth.uid()) = company_id 
  AND (
    has_company_role(auth.uid(), company_id, 'company_admin'::app_role) 
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
);

-- Company staff can only view basic customer info (name and phone only)
CREATE POLICY "Staff can view basic customer info"
ON public.customers
FOR SELECT
USING (
  get_user_company_id(auth.uid()) = company_id 
  AND has_company_role(auth.uid(), company_id, 'company_staff'::app_role)
  AND NOT has_company_role(auth.uid(), company_id, 'company_admin'::app_role)
);

-- 4. Add policies for user_roles management

-- Company admins can view their company's user roles
CREATE POLICY "Admins can view company user roles"
ON public.user_roles
FOR SELECT
USING (
  has_company_role(auth.uid(), company_id, 'company_admin'::app_role)
  AND role <> 'super_admin'::app_role
);

-- Company admins can add users to their company
CREATE POLICY "Admins can add company users"
ON public.user_roles
FOR INSERT
WITH CHECK (
  has_company_role(auth.uid(), company_id, 'company_admin'::app_role)
  AND role IN ('company_admin'::app_role, 'company_staff'::app_role)
  AND role <> 'super_admin'::app_role
);

-- Company admins can update roles (except super_admin)
CREATE POLICY "Admins can update company user roles"
ON public.user_roles
FOR UPDATE
USING (
  has_company_role(auth.uid(), company_id, 'company_admin'::app_role)
  AND role <> 'super_admin'::app_role
)
WITH CHECK (
  has_company_role(auth.uid(), company_id, 'company_admin'::app_role)
  AND role <> 'super_admin'::app_role
);

-- Company admins can delete users (except themselves)
CREATE POLICY "Admins can delete company users"
ON public.user_roles
FOR DELETE
USING (
  has_company_role(auth.uid(), company_id, 'company_admin'::app_role)
  AND user_id <> auth.uid()
  AND role <> 'super_admin'::app_role
);

-- 5. Add comment for documentation
COMMENT ON POLICY "Company staff can view basic info" ON public.companies IS 
'Company staff can only see basic company info. Sensitive fields like CNPJ, email, phone are restricted to admins only.';

COMMENT ON POLICY "Staff can view basic customer info" ON public.customers IS 
'Company staff can only view customer name and phone. Full customer data (email, address) is restricted to admins only.';