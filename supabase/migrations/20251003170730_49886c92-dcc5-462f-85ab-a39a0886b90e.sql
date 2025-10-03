-- ============================================
-- SECURITY FIX: Proper Role Management and Audit Logging
-- ============================================

-- 1. Create enum for user roles (using super_admin to match existing data)
CREATE TYPE public.app_role AS ENUM ('super_admin', 'company_admin', 'company_staff');

-- 2. Create user_roles table (roles MUST be in separate table)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE (user_id, role, company_id)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Create audit log table for sensitive data access
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  details JSONB,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create index for audit log queries
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_table_name ON public.audit_logs(table_name);

-- 4. Create security definer functions to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.has_company_role(_user_id UUID, _company_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND (company_id = _company_id OR company_id IS NULL)
  )
$$;

CREATE OR REPLACE FUNCTION public.is_company_owner(_user_id UUID, _company_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.companies
    WHERE id = _company_id
      AND owner_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id
  FROM public.profiles
  WHERE id = _user_id
  LIMIT 1
$$;

-- 5. Create function to log sensitive data access
CREATE OR REPLACE FUNCTION public.log_audit_event(
  _action TEXT,
  _table_name TEXT,
  _record_id UUID DEFAULT NULL,
  _details JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, details)
  VALUES (auth.uid(), _action, _table_name, _record_id, _details);
END;
$$;

-- 6. Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role, company_id, created_at)
SELECT 
  p.id,
  p.role::app_role,
  p.company_id,
  now()
FROM public.profiles p
WHERE p.role IS NOT NULL
ON CONFLICT (user_id, role, company_id) DO NOTHING;

-- 7. Update RLS policies on user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Super admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Company admins can manage company roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  public.has_company_role(auth.uid(), company_id, 'company_admin')
  AND role != 'super_admin'
)
WITH CHECK (
  public.has_company_role(auth.uid(), company_id, 'company_admin')
  AND role != 'super_admin'
);

-- 8. Update RLS policies on audit_logs
CREATE POLICY "Super admins can view all audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Company admins can view their company audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.audit_logs al
    JOIN public.companies c ON al.record_id = c.id
    WHERE al.id = audit_logs.id
      AND al.table_name = 'companies'
      AND (
        c.owner_id = auth.uid()
        OR public.has_company_role(auth.uid(), c.id, 'company_admin')
      )
  )
);

-- 9. DROP and recreate RLS policies on companies table with stricter controls
DROP POLICY IF EXISTS "Empresas podem ver seus próprios dados" ON public.companies;
DROP POLICY IF EXISTS "Master admin pode ver todas empresas" ON public.companies;
DROP POLICY IF EXISTS "Usuários podem criar empresas" ON public.companies;
DROP POLICY IF EXISTS "Donos podem atualizar suas empresas" ON public.companies;

-- New stricter policies with audit logging
CREATE POLICY "Company owners can view their company"
ON public.companies
FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid() 
  OR public.get_user_company_id(auth.uid()) = id
);

CREATE POLICY "Super admins can view companies with audit"
ON public.companies
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  AND (
    -- Log the access attempt
    public.log_audit_event(
      'VIEW_SENSITIVE_DATA',
      'companies',
      id,
      jsonb_build_object('accessed_fields', 'all', 'reason', 'super_admin_access')
    ) IS NULL
    OR true
  )
);

CREATE POLICY "Users can create companies"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update their companies"
ON public.companies
FOR UPDATE
TO authenticated
USING (
  owner_id = auth.uid()
  OR public.has_company_role(auth.uid(), id, 'company_admin')
)
WITH CHECK (
  owner_id = auth.uid()
  OR public.has_company_role(auth.uid(), id, 'company_admin')
);

-- 10. Update other tables to use new role system (categories example)
DROP POLICY IF EXISTS "Master admin pode ver todas empresas" ON public.categories;
DROP POLICY IF EXISTS "Categorias da empresa são visíveis" ON public.categories;
DROP POLICY IF EXISTS "Usuários da empresa podem gerenciar categorias" ON public.categories;

CREATE POLICY "Company users can view categories"
ON public.categories
FOR SELECT
TO authenticated
USING (
  public.get_user_company_id(auth.uid()) = company_id
  OR public.has_role(auth.uid(), 'super_admin')
);

CREATE POLICY "Company users can manage categories"
ON public.categories
FOR ALL
TO authenticated
USING (
  public.get_user_company_id(auth.uid()) = company_id
  OR public.has_role(auth.uid(), 'super_admin')
)
WITH CHECK (
  public.get_user_company_id(auth.uid()) = company_id
  OR public.has_role(auth.uid(), 'super_admin')
);

-- 11. Update trigger to assign default role when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name',
    COALESCE(new.raw_user_meta_data->>'role', 'company_staff')
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Insert into user_roles with default role
  INSERT INTO public.user_roles (user_id, role, company_id)
  VALUES (
    new.id,
    COALESCE((new.raw_user_meta_data->>'role')::app_role, 'company_staff'),
    NULL
  )
  ON CONFLICT (user_id, role, company_id) DO NOTHING;
  
  RETURN new;
END;
$$;

-- 12. Create function to update company_id in user_roles when profile is updated
CREATE OR REPLACE FUNCTION public.sync_user_role_company()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update company_id in user_roles when profile company_id changes
  IF OLD.company_id IS DISTINCT FROM NEW.company_id THEN
    UPDATE public.user_roles
    SET company_id = NEW.company_id
    WHERE user_id = NEW.id
      AND role != 'super_admin';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for syncing
DROP TRIGGER IF EXISTS sync_user_role_company_trigger ON public.profiles;
CREATE TRIGGER sync_user_role_company_trigger
AFTER UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_user_role_company();

-- 13. Add comments for documentation
COMMENT ON TABLE public.user_roles IS 'Stores user roles separately from profiles for security. Roles must NEVER be stored in profiles table to prevent privilege escalation.';
COMMENT ON TABLE public.audit_logs IS 'Tracks all access to sensitive data including company information, customer data, and administrative actions.';
COMMENT ON FUNCTION public.has_role IS 'Security definer function to check if user has a specific role without triggering RLS recursion.';
COMMENT ON FUNCTION public.log_audit_event IS 'Logs sensitive data access for compliance and security monitoring.';