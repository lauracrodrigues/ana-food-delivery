-- Criar tabela de planos
CREATE TABLE public.plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL,
  features JSONB,
  max_products INTEGER,
  max_orders_per_month INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inserir planos padrão
INSERT INTO public.plans (name, description, price, features, max_products, max_orders_per_month) VALUES
('Básico', 'Ideal para pequenos negócios', 29.90, '["Até 50 produtos", "100 pedidos/mês", "Suporte por email", "Relatórios básicos"]', 50, 100),
('Profissional', 'Para negócios em crescimento', 79.90, '["Até 200 produtos", "500 pedidos/mês", "Suporte prioritário", "Relatórios avançados", "Múltiplos usuários"]', 200, 500),
('Enterprise', 'Solução completa', 199.90, '["Produtos ilimitados", "Pedidos ilimitados", "Suporte 24/7", "API completa", "Relatórios personalizados", "White label"]', NULL, NULL);

-- Adicionar colunas faltantes na tabela companies
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.plans(id),
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial',
ADD COLUMN IF NOT EXISTS fantasy_name TEXT,
ADD COLUMN IF NOT EXISTS segment TEXT,
ADD COLUMN IF NOT EXISTS email TEXT;

-- Adicionar campo company_id na tabela profiles se não existir
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Criar tabela de cupons
CREATE TABLE public.coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed', 'free_days')),
  discount_value NUMERIC(10, 2) NOT NULL,
  valid_until TIMESTAMP WITH TIME ZONE,
  max_uses INTEGER,
  uses_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de uso de cupons
CREATE TABLE public.coupon_uses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_id UUID NOT NULL REFERENCES public.coupons(id),
  company_id UUID NOT NULL REFERENCES public.companies(id),
  used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(coupon_id, company_id)
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_uses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Políticas para plans (todos podem ver)
CREATE POLICY "Planos são públicos" ON public.plans FOR SELECT USING (true);

-- Políticas para companies
CREATE POLICY "Empresas podem ver seus próprios dados" ON public.companies 
FOR SELECT USING (
  owner_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'master_admin')
);

CREATE POLICY "Master admin pode ver todas empresas" ON public.companies 
FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'master_admin')
);

CREATE POLICY "Usuários podem criar empresas" ON public.companies 
FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Donos podem atualizar suas empresas" ON public.companies 
FOR UPDATE USING (owner_id = auth.uid());

-- Políticas para products
CREATE POLICY "Produtos da empresa são visíveis" ON public.products 
FOR SELECT USING (
  company_id IN (
    SELECT id FROM companies WHERE owner_id = auth.uid()
    UNION
    SELECT company_id FROM profiles WHERE profiles.id = auth.uid()
  ) OR
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'master_admin')
);

CREATE POLICY "Usuários da empresa podem gerenciar produtos" ON public.products 
FOR ALL USING (
  company_id IN (
    SELECT id FROM companies WHERE owner_id = auth.uid()
    UNION
    SELECT company_id FROM profiles WHERE profiles.id = auth.uid()
  ) OR
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'master_admin')
);

-- Políticas para categories
CREATE POLICY "Categorias da empresa são visíveis" ON public.categories 
FOR SELECT USING (
  company_id IN (
    SELECT id FROM companies WHERE owner_id = auth.uid()
    UNION
    SELECT company_id FROM profiles WHERE profiles.id = auth.uid()
  ) OR
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'master_admin')
);

CREATE POLICY "Usuários da empresa podem gerenciar categorias" ON public.categories 
FOR ALL USING (
  company_id IN (
    SELECT id FROM companies WHERE owner_id = auth.uid()
    UNION
    SELECT company_id FROM profiles WHERE profiles.id = auth.uid()
  ) OR
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'master_admin')
);

-- Políticas para orders
CREATE POLICY "Pedidos da empresa são visíveis" ON public.orders 
FOR SELECT USING (
  company_id IN (
    SELECT id FROM companies WHERE owner_id = auth.uid()
    UNION
    SELECT company_id FROM profiles WHERE profiles.id = auth.uid()
  ) OR
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'master_admin')
);

CREATE POLICY "Usuários da empresa podem gerenciar pedidos" ON public.orders 
FOR ALL USING (
  company_id IN (
    SELECT id FROM companies WHERE owner_id = auth.uid()
    UNION
    SELECT company_id FROM profiles WHERE profiles.id = auth.uid()
  ) OR
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'master_admin')
);

-- Políticas para coupons
CREATE POLICY "Master admin pode gerenciar cupons" ON public.coupons 
FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'master_admin')
);

CREATE POLICY "Empresas podem ver cupons válidos" ON public.coupons 
FOR SELECT USING (
  (valid_until IS NULL OR valid_until > now()) AND
  (max_uses IS NULL OR uses_count < max_uses)
);

-- Políticas para coupon_uses
CREATE POLICY "Master admin pode ver usos de cupons" ON public.coupon_uses 
FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'master_admin')
);

CREATE POLICY "Empresas podem ver seus próprios usos" ON public.coupon_uses 
FOR SELECT USING (
  company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())
);

-- Trigger atualizado para handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', COALESCE(new.raw_user_meta_data->>'role', 'company_staff'))
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

-- Criar trigger se não existir
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Função para setup inicial da empresa (atualizada)
CREATE OR REPLACE FUNCTION public.handle_new_company_setup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Define trial de 7 dias
  UPDATE public.companies
  SET trial_ends_at = now() + interval '7 days'
  WHERE id = NEW.id AND trial_ends_at IS NULL;

  -- Define o criador como admin da empresa
  UPDATE public.profiles
  SET company_id = NEW.id, role = 'company_admin'
  WHERE id = NEW.owner_id;

  -- Cria categorias iniciais
  INSERT INTO public.categories (company_id, name)
  VALUES 
    (NEW.id, 'Pratos Principais'),
    (NEW.id, 'Bebidas'),
    (NEW.id, 'Sobremesas');

  -- Cria produtos de exemplo
  INSERT INTO public.products (company_id, category_id, name, price, description)
  SELECT 
    NEW.id,
    c.id,
    CASE 
      WHEN c.name = 'Pratos Principais' THEN 'Prato do Dia'
      WHEN c.name = 'Bebidas' THEN 'Refrigerante 2L'
      WHEN c.name = 'Sobremesas' THEN 'Pudim Caseiro'
    END,
    CASE 
      WHEN c.name = 'Pratos Principais' THEN 29.90
      WHEN c.name = 'Bebidas' THEN 8.00
      WHEN c.name = 'Sobremesas' THEN 12.00
    END,
    CASE 
      WHEN c.name = 'Pratos Principais' THEN 'Delicioso prato preparado diariamente'
      WHEN c.name = 'Bebidas' THEN 'Refrigerante gelado 2 litros'
      WHEN c.name = 'Sobremesas' THEN 'Sobremesa caseira deliciosa'
    END
  FROM public.categories c
  WHERE c.company_id = NEW.id;

  RETURN NEW;
END;
$$;

-- Criar trigger para setup da empresa
DROP TRIGGER IF EXISTS on_company_created ON public.companies;
CREATE TRIGGER on_company_created
  AFTER INSERT ON public.companies
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_company_setup();