-- Corrigir problemas de segurança nas funções existentes
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', COALESCE(new.raw_user_meta_data->>'role', 'company_staff'))
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_company_setup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;