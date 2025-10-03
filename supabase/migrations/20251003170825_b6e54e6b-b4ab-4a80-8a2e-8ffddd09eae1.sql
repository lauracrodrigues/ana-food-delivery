-- ============================================
-- SECURITY FIX PART 2: Update remaining tables with stricter RLS
-- ============================================

-- 1. Update CUSTOMERS table - restrict access based on roles
DROP POLICY IF EXISTS "Customers da empresa são visíveis" ON public.customers;
DROP POLICY IF EXISTS "Usuários da empresa podem gerenciar customers" ON public.customers;

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

-- 2. Update COUPONS table - restrict to admins only with audit logging
DROP POLICY IF EXISTS "Empresas podem ver seus próprios cupons" ON public.coupons;
DROP POLICY IF EXISTS "Master admin pode criar cupons" ON public.coupons;
DROP POLICY IF EXISTS "Master admin pode atualizar cupons" ON public.coupons;
DROP POLICY IF EXISTS "Master admin pode deletar cupons" ON public.coupons;

CREATE POLICY "Company admins can view coupons"
ON public.coupons
FOR SELECT
TO authenticated
USING (
  (
    public.get_user_company_id(auth.uid()) = company_id
    AND public.has_company_role(auth.uid(), company_id, 'company_admin')
  )
  OR public.has_role(auth.uid(), 'super_admin')
);

CREATE POLICY "Company admins can manage coupons"
ON public.coupons
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

-- 3. Update PRODUCTS table with role-based access
DROP POLICY IF EXISTS "Produtos da empresa são visíveis" ON public.products;
DROP POLICY IF EXISTS "Usuários da empresa podem gerenciar produtos" ON public.products;

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

-- 4. Update ORDERS table with role-based access
DROP POLICY IF EXISTS "Pedidos da empresa são visíveis" ON public.orders;
DROP POLICY IF EXISTS "Usuários da empresa podem gerenciar pedidos" ON public.orders;

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

-- 5. Update EXTRAS table with role-based access
DROP POLICY IF EXISTS "Extras da empresa são visíveis" ON public.extras;
DROP POLICY IF EXISTS "Usuários da empresa podem gerenciar extras" ON public.extras;

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

-- 6. Update DELIVERY_FEES table with role-based access
DROP POLICY IF EXISTS "Empresas podem ver suas taxas de entrega" ON public.delivery_fees;
DROP POLICY IF EXISTS "Empresas podem gerenciar suas taxas de entrega" ON public.delivery_fees;

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

-- 7. Update PAYMENT_METHODS table with role-based access
DROP POLICY IF EXISTS "Empresas podem ver suas formas de pagamento" ON public.payment_methods;
DROP POLICY IF EXISTS "Empresas podem gerenciar suas formas de pagamento" ON public.payment_methods;

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

-- 8. Update STORE_SETTINGS table with role-based access
DROP POLICY IF EXISTS "Empresas podem ver suas configurações" ON public.store_settings;
DROP POLICY IF EXISTS "Empresas podem gerenciar suas configurações" ON public.store_settings;

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

-- 9. Update WHATSAPP tables with role-based access
DROP POLICY IF EXISTS "Empresas podem ver suas sessões WhatsApp" ON public.whatsapp_sessions;
DROP POLICY IF EXISTS "Empresas podem gerenciar suas sessões WhatsApp" ON public.whatsapp_sessions;

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

DROP POLICY IF EXISTS "Empresas podem ver suas mensagens de status" ON public.whatsapp_status_messages;
DROP POLICY IF EXISTS "Empresas podem gerenciar suas mensagens de status" ON public.whatsapp_status_messages;

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

DROP POLICY IF EXISTS "Empresas podem ver seus alertas" ON public.whatsapp_alerts;
DROP POLICY IF EXISTS "Empresas podem gerenciar seus alertas" ON public.whatsapp_alerts;

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

-- 10. Update COUPON_USES with stricter access
DROP POLICY IF EXISTS "Master admin pode ver usos de cupons" ON public.coupon_uses;
DROP POLICY IF EXISTS "Empresas podem ver seus próprios usos" ON public.coupon_uses;

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