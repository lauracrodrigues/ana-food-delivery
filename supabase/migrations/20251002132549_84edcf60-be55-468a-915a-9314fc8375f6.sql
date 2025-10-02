-- Add company_id to coupons table to associate coupons with companies
ALTER TABLE public.coupons 
ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

-- Drop the insecure public SELECT policy
DROP POLICY IF EXISTS "Empresas podem ver cupons válidos" ON public.coupons;

-- Create secure policy: only authenticated users from the same company or master admins can view coupons
CREATE POLICY "Empresas podem ver seus próprios cupons" 
ON public.coupons 
FOR SELECT 
TO authenticated
USING (
  (company_id IN (
    SELECT companies.id
    FROM companies
    WHERE companies.owner_id = auth.uid()
    UNION
    SELECT profiles.company_id
    FROM profiles
    WHERE profiles.id = auth.uid()
  ))
  OR 
  (EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'master_admin'
  ))
);

-- Update INSERT policy to ensure company_id is set
CREATE POLICY "Master admin pode criar cupons"
ON public.coupons
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'master_admin'
  )
);

-- Update the master admin ALL policy to UPDATE and DELETE only
DROP POLICY IF EXISTS "Master admin pode gerenciar cupons" ON public.coupons;

CREATE POLICY "Master admin pode atualizar cupons"
ON public.coupons
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'master_admin'
  )
);

CREATE POLICY "Master admin pode deletar cupons"
ON public.coupons
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'master_admin'
  )
);