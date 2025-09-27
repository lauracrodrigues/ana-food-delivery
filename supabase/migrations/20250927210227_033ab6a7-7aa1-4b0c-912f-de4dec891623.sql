-- Create customers table
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Customers da empresa são visíveis" 
ON public.customers 
FOR SELECT 
USING ((company_id IN ( SELECT companies.id
  FROM companies
  WHERE (companies.owner_id = auth.uid())
UNION
 SELECT profiles.company_id
  FROM profiles
  WHERE (profiles.id = auth.uid()))) OR (EXISTS ( SELECT 1
  FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'master_admin'::text)))));

CREATE POLICY "Usuários da empresa podem gerenciar customers" 
ON public.customers 
FOR ALL 
USING ((company_id IN ( SELECT companies.id
  FROM companies
  WHERE (companies.owner_id = auth.uid())
UNION
 SELECT profiles.company_id
  FROM profiles
  WHERE (profiles.id = auth.uid()))) OR (EXISTS ( SELECT 1
  FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'master_admin'::text)))));

-- Create extras table
CREATE TABLE public.extras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  category TEXT,
  description TEXT,
  on_off BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.extras ENABLE ROW LEVEL SECURITY;

-- Create policies for extras
CREATE POLICY "Extras da empresa são visíveis" 
ON public.extras 
FOR SELECT 
USING ((company_id IN ( SELECT companies.id
  FROM companies
  WHERE (companies.owner_id = auth.uid())
UNION
 SELECT profiles.company_id
  FROM profiles
  WHERE (profiles.id = auth.uid()))) OR (EXISTS ( SELECT 1
  FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'master_admin'::text)))));

CREATE POLICY "Usuários da empresa podem gerenciar extras" 
ON public.extras 
FOR ALL 
USING ((company_id IN ( SELECT companies.id
  FROM companies
  WHERE (companies.owner_id = auth.uid())
UNION
 SELECT profiles.company_id
  FROM profiles
  WHERE (profiles.id = auth.uid()))) OR (EXISTS ( SELECT 1
  FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'master_admin'::text)))));

-- Create update triggers
CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_extras_updated_at
BEFORE UPDATE ON public.extras
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample data
DO $$ 
DECLARE
  company_id_var UUID;
  counter INTEGER := 1;
BEGIN
  -- Get the first company
  SELECT id INTO company_id_var FROM companies LIMIT 1;
  
  IF company_id_var IS NOT NULL THEN
    -- Insert sample customers
    INSERT INTO public.customers (company_id, name, phone, email, address, neighborhood, city, state, zip_code)
    VALUES 
      (company_id_var, 'João Silva', '(11) 98765-4321', 'joao@email.com', 'Rua das Flores, 123', 'Centro', 'São Paulo', 'SP', '01234-567'),
      (company_id_var, 'Maria Santos', '(11) 97654-3210', 'maria@email.com', 'Av. Principal, 456', 'Jardins', 'São Paulo', 'SP', '02345-678'),
      (company_id_var, 'Pedro Oliveira', '(11) 96543-2109', 'pedro@email.com', 'Rua do Comércio, 789', 'Vila Nova', 'São Paulo', 'SP', '03456-789');
    
    -- Insert sample extras
    INSERT INTO public.extras (company_id, name, price, category, description)
    VALUES 
      (company_id_var, 'Bacon Extra', 5.00, 'Proteínas', 'Porção adicional de bacon crocante'),
      (company_id_var, 'Queijo Cheddar', 3.50, 'Queijos', 'Porção extra de queijo cheddar'),
      (company_id_var, 'Molho Especial', 2.00, 'Molhos', 'Molho da casa'),
      (company_id_var, 'Cebola Caramelizada', 2.50, 'Complementos', 'Cebola caramelizada artesanal');
    
    -- Insert more sample products if they don't exist
    INSERT INTO public.products (company_id, category_id, name, price, description)
    SELECT 
      company_id_var,
      c.id,
      'Hambúrguer Clássico',
      25.90,
      'Hambúrguer artesanal com queijo, alface e tomate'
    FROM public.categories c
    WHERE c.company_id = company_id_var
    AND c.name = 'Pratos Principais'
    AND NOT EXISTS (
      SELECT 1 FROM public.products p 
      WHERE p.category_id = c.id 
      AND p.name = 'Hambúrguer Clássico'
    );

    INSERT INTO public.products (company_id, category_id, name, price, description)
    SELECT 
      company_id_var,
      c.id,
      'Pizza Margherita',
      45.90,
      'Pizza tradicional com molho de tomate e mussarela'
    FROM public.categories c
    WHERE c.company_id = company_id_var
    AND c.name = 'Pratos Principais'
    AND NOT EXISTS (
      SELECT 1 FROM public.products p 
      WHERE p.category_id = c.id 
      AND p.name = 'Pizza Margherita'
    );
    
    -- Insert sample orders
    INSERT INTO public.orders (company_id, customer_name, customer_phone, total, items, status, type, payment_method, delivery_fee, estimated_time, address, observations, order_number)
    VALUES 
      (company_id_var, 'Carlos Mendes', '(11) 95555-1234', 75.80, 
       '[{"name": "Pizza Margherita", "quantity": 1, "price": 45.90}, {"name": "Refrigerante 2L", "quantity": 1, "price": 8.00}, {"name": "Brownie com Sorvete", "quantity": 1, "price": 18.00}]'::jsonb,
       'pending', 'delivery', 'cartao', 3.90, 45, 'Rua A, 100 - Centro', 'Sem cebola na pizza', '0001'),
      
      (company_id_var, 'Ana Costa', '(11) 94444-5678', 37.90, 
       '[{"name": "Hambúrguer Clássico", "quantity": 1, "price": 25.90}, {"name": "Suco Natural", "quantity": 1, "price": 12.00}]'::jsonb,
       'preparing', 'pickup', 'dinheiro', 0, 30, NULL, 'Ponto da carne: mal passado', '0002'),
      
      (company_id_var, 'Roberto Lima', '(11) 93333-9876', 52.90, 
       '[{"name": "Prato do Dia", "quantity": 1, "price": 29.90}, {"name": "Refrigerante 2L", "quantity": 1, "price": 8.00}, {"name": "Pudim Caseiro", "quantity": 1, "price": 12.00}]'::jsonb,
       'ready', 'delivery', 'pix', 3.00, 40, 'Av. B, 200 - Jardins', NULL, '0003');
       
  END IF;
END $$;