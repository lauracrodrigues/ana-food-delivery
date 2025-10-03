-- ============================================
-- SECURITY FIX PART 2: Update remaining tables (fixed)
-- ============================================

-- First, drop ALL existing policies on all tables to start fresh
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT schemaname, tablename, policyname 
              FROM pg_policies 
              WHERE schemaname = 'public' 
              AND tablename IN ('customers', 'products', 'orders', 'extras', 
                               'delivery_fees', 'payment_methods', 'store_settings',
                               'whatsapp_sessions', 'whatsapp_status_messages', 
                               'whatsapp_alerts', 'coupon_uses'))
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON ' || quote_ident(r.schemaname) || '.' || quote_ident(r.tablename);
    END LOOP;
END$$;

-- 1. CUSTOMERS table - restrict access based on roles
CREATE POLICY "Company admins can view all customers"
ON public.customers
FOR SELECT
TO authenticated
USING (
  public.get_user_company_id(auth.uid()) = company_id
  AND (
    public.has_company_role(auth.uid(), company_id, 'company_admin')
    OR public.has_role(auth.uid(), 'super_admin')
  )
);

CREATE POLICY "Company staff can view limited customer data"
ON public.customers
FOR SELECT
TO authenticated
USING (
  public.get_user_company_id(auth.uid()) = company_id
  AND public.has_company_role(auth.uid(), company_id, 'company_staff')
);

CREATE POLICY "Company admins can manage customers"
ON public.customers
FOR ALL
TO authenticated
USING (
  public.get_user_company_id(auth.uid()) = company_id
  AND (
    public.has_company_role(auth.uid(), company_id, 'company_admin')
    OR public.has_role(auth.uid(), 'super_admin')
  )
)
WITH CHECK (
  public.get_user_company_id(auth.uid()) = company_id
  AND (
    public.has_company_role(auth.uid(), company_id, 'company_admin')
    OR public.has_role(auth.uid(), 'super_admin')
  )
);

-- 2. PRODUCTS table
CREATE POLICY "Company users can view products"
ON public.products
FOR SELECT
TO authenticated
USING (
  public.get_user_company_id(auth.uid()) = company_id
  OR public.has_role(auth.uid(), 'super_admin')
);

CREATE POLICY "Company admins can manage products"
ON public.products
FOR ALL
TO authenticated
USING (
  (
    public.get_user_company_id(auth.uid()) = company_id
    AND public.has_company_role(auth.uid(), company_id, 'company_admin')
  )
  OR public.has_role(auth.uid(), 'super_admin')
)
WITH CHECK (
  (
    public.get_user_company_id(auth.uid()) = company_id
    AND public.has_company_role(auth.uid(), company_id, 'company_admin')
  )
  OR public.has_role(auth.uid(), 'super_admin')
);

-- 3. ORDERS table
CREATE POLICY "Company users can view orders"
ON public.orders
FOR SELECT
TO authenticated
USING (
  public.get_user_company_id(auth.uid()) = company_id
  OR public.has_role(auth.uid(), 'super_admin')
);

CREATE POLICY "Company users can manage orders"
ON public.orders
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

-- 4. EXTRAS table
CREATE POLICY "Company users can view extras"
ON public.extras
FOR SELECT
TO authenticated
USING (
  public.get_user_company_id(auth.uid()) = company_id
  OR public.has_role(auth.uid(), 'super_admin')
);

CREATE POLICY "Company admins can manage extras"
ON public.extras
FOR ALL
TO authenticated
USING (
  (
    public.get_user_company_id(auth.uid()) = company_id
    AND public.has_company_role(auth.uid(), company_id, 'company_admin')
  )
  OR public.has_role(auth.uid(), 'super_admin')
)
WITH CHECK (
  (
    public.get_user_company_id(auth.uid()) = company_id
    AND public.has_company_role(auth.uid(), company_id, 'company_admin')
  )
  OR public.has_role(auth.uid(), 'super_admin')
);

-- 5. DELIVERY_FEES table
CREATE POLICY "Company users can view delivery fees"
ON public.delivery_fees
FOR SELECT
TO authenticated
USING (
  public.get_user_company_id(auth.uid()) = company_id
  OR public.has_role(auth.uid(), 'super_admin')
);

CREATE POLICY "Company admins can manage delivery fees"
ON public.delivery_fees
FOR ALL
TO authenticated
USING (
  (
    public.get_user_company_id(auth.uid()) = company_id
    AND public.has_company_role(auth.uid(), company_id, 'company_admin')
  )
  OR public.has_role(auth.uid(), 'super_admin')
)
WITH CHECK (
  (
    public.get_user_company_id(auth.uid()) = company_id
    AND public.has_company_role(auth.uid(), company_id, 'company_admin')
  )
  OR public.has_role(auth.uid(), 'super_admin')
);

-- 6. PAYMENT_METHODS table
CREATE POLICY "Company users can view payment methods"
ON public.payment_methods
FOR SELECT
TO authenticated
USING (
  public.get_user_company_id(auth.uid()) = company_id
  OR public.has_role(auth.uid(), 'super_admin')
);

CREATE POLICY "Company admins can manage payment methods"
ON public.payment_methods
FOR ALL
TO authenticated
USING (
  (
    public.get_user_company_id(auth.uid()) = company_id
    AND public.has_company_role(auth.uid(), company_id, 'company_admin')
  )
  OR public.has_role(auth.uid(), 'super_admin')
)
WITH CHECK (
  (
    public.get_user_company_id(auth.uid()) = company_id
    AND public.has_company_role(auth.uid(), company_id, 'company_admin')
  )
  OR public.has_role(auth.uid(), 'super_admin')
);

-- 7. STORE_SETTINGS table
CREATE POLICY "Company users can view settings"
ON public.store_settings
FOR SELECT
TO authenticated
USING (
  public.get_user_company_id(auth.uid()) = company_id
  OR public.has_role(auth.uid(), 'super_admin')
);

CREATE POLICY "Company admins can manage settings"
ON public.store_settings
FOR ALL
TO authenticated
USING (
  (
    public.get_user_company_id(auth.uid()) = company_id
    AND public.has_company_role(auth.uid(), company_id, 'company_admin')
  )
  OR public.has_role(auth.uid(), 'super_admin')
)
WITH CHECK (
  (
    public.get_user_company_id(auth.uid()) = company_id
    AND public.has_company_role(auth.uid(), company_id, 'company_admin')
  )
  OR public.has_role(auth.uid(), 'super_admin')
);

-- 8. WHATSAPP tables
CREATE POLICY "Company users can view whatsapp sessions"
ON public.whatsapp_sessions
FOR SELECT
TO authenticated
USING (
  public.get_user_company_id(auth.uid()) = company_id
  OR public.has_role(auth.uid(), 'super_admin')
);

CREATE POLICY "Company admins can manage whatsapp sessions"
ON public.whatsapp_sessions
FOR ALL
TO authenticated
USING (
  (
    public.get_user_company_id(auth.uid()) = company_id
    AND public.has_company_role(auth.uid(), company_id, 'company_admin')
  )
  OR public.has_role(auth.uid(), 'super_admin')
)
WITH CHECK (
  (
    public.get_user_company_id(auth.uid()) = company_id
    AND public.has_company_role(auth.uid(), company_id, 'company_admin')
  )
  OR public.has_role(auth.uid(), 'super_admin')
);

CREATE POLICY "Company users can view whatsapp status messages"
ON public.whatsapp_status_messages
FOR SELECT
TO authenticated
USING (
  public.get_user_company_id(auth.uid()) = company_id
  OR public.has_role(auth.uid(), 'super_admin')
);

CREATE POLICY "Company admins can manage whatsapp status messages"
ON public.whatsapp_status_messages
FOR ALL
TO authenticated
USING (
  (
    public.get_user_company_id(auth.uid()) = company_id
    AND public.has_company_role(auth.uid(), company_id, 'company_admin')
  )
  OR public.has_role(auth.uid(), 'super_admin')
)
WITH CHECK (
  (
    public.get_user_company_id(auth.uid()) = company_id
    AND public.has_company_role(auth.uid(), company_id, 'company_admin')
  )
  OR public.has_role(auth.uid(), 'super_admin')
);

CREATE POLICY "Company users can view whatsapp alerts"
ON public.whatsapp_alerts
FOR SELECT
TO authenticated
USING (
  public.get_user_company_id(auth.uid()) = company_id
  OR public.has_role(auth.uid(), 'super_admin')
);

CREATE POLICY "Company users can manage whatsapp alerts"
ON public.whatsapp_alerts
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

-- 9. COUPON_USES table
CREATE POLICY "Company admins can view coupon uses"
ON public.coupon_uses
FOR SELECT
TO authenticated
USING (
  (
    public.get_user_company_id(auth.uid()) = company_id
    AND public.has_company_role(auth.uid(), company_id, 'company_admin')
  )
  OR public.has_role(auth.uid(), 'super_admin')
);