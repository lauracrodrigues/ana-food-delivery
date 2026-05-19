-- v1.0.0 — super_admin pode atualizar companies (módulos, status, etc)
-- Bug: AdminDashboard salvava modules_enabled sem erro mas sem efeito
-- porque RLS só permitia owner_id ou company_admin atualizar.

DROP POLICY IF EXISTS "Only admins can update companies" ON public.companies;

CREATE POLICY "Admins and super_admin can update companies"
  ON public.companies
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR owner_id = auth.uid()
    OR has_company_role(auth.uid(), id, 'company_admin'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR owner_id = auth.uid()
    OR has_company_role(auth.uid(), id, 'company_admin'::app_role)
  );

COMMENT ON POLICY "Admins and super_admin can update companies" ON public.companies IS
  'Super admin (AnaFood Master) + owner da empresa + company_admin podem atualizar dados.';
