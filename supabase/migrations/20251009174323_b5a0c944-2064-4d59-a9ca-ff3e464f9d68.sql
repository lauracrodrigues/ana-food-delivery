-- Criar tabela de agrupamentos (grupos de adicionais)
CREATE TABLE public.product_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  min_selection integer DEFAULT 0,
  max_selection integer DEFAULT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Criar tabela de relação entre grupos e adicionais
CREATE TABLE public.group_extras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.product_groups(id) ON DELETE CASCADE,
  extra_id uuid NOT NULL REFERENCES public.extras(id) ON DELETE CASCADE,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(group_id, extra_id)
);

-- Criar tabela de relação entre produtos e grupos
CREATE TABLE public.product_group_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.product_groups(id) ON DELETE CASCADE,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(product_id, group_id)
);

-- Criar tabela de banners do cardápio
CREATE TABLE public.menu_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  link_type text DEFAULT 'none', -- 'none', 'product', 'category', 'url'
  link_value text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Adicionar campo de ordem nas categorias e produtos
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;

-- Adicionar campo de setor de impressão nos produtos
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS print_sector text;

-- Habilitar RLS
ALTER TABLE public.product_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_group_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_banners ENABLE ROW LEVEL SECURITY;

-- Políticas para product_groups
CREATE POLICY "Company admins can manage product groups"
ON public.product_groups FOR ALL
USING (
  (get_user_company_id(auth.uid()) = company_id) 
  AND (has_company_role(auth.uid(), company_id, 'company_admin'::app_role) 
       OR has_role(auth.uid(), 'super_admin'::app_role))
)
WITH CHECK (
  (get_user_company_id(auth.uid()) = company_id) 
  AND (has_company_role(auth.uid(), company_id, 'company_admin'::app_role) 
       OR has_role(auth.uid(), 'super_admin'::app_role))
);

CREATE POLICY "Company users can view product groups"
ON public.product_groups FOR SELECT
USING (
  (get_user_company_id(auth.uid()) = company_id) 
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- Políticas para group_extras
CREATE POLICY "Company admins can manage group extras"
ON public.group_extras FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.product_groups pg
    WHERE pg.id = group_extras.group_id
    AND get_user_company_id(auth.uid()) = pg.company_id
    AND (has_company_role(auth.uid(), pg.company_id, 'company_admin'::app_role) 
         OR has_role(auth.uid(), 'super_admin'::app_role))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.product_groups pg
    WHERE pg.id = group_extras.group_id
    AND get_user_company_id(auth.uid()) = pg.company_id
    AND (has_company_role(auth.uid(), pg.company_id, 'company_admin'::app_role) 
         OR has_role(auth.uid(), 'super_admin'::app_role))
  )
);

CREATE POLICY "Company users can view group extras"
ON public.group_extras FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.product_groups pg
    WHERE pg.id = group_extras.group_id
    AND get_user_company_id(auth.uid()) = pg.company_id
  )
);

-- Políticas para product_group_links
CREATE POLICY "Company admins can manage product group links"
ON public.product_group_links FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_group_links.product_id
    AND get_user_company_id(auth.uid()) = p.company_id
    AND (has_company_role(auth.uid(), p.company_id, 'company_admin'::app_role) 
         OR has_role(auth.uid(), 'super_admin'::app_role))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_group_links.product_id
    AND get_user_company_id(auth.uid()) = p.company_id
    AND (has_company_role(auth.uid(), p.company_id, 'company_admin'::app_role) 
         OR has_role(auth.uid(), 'super_admin'::app_role))
  )
);

CREATE POLICY "Company users can view product group links"
ON public.product_group_links FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_group_links.product_id
    AND get_user_company_id(auth.uid()) = p.company_id
  )
);

-- Políticas para menu_banners
CREATE POLICY "Company admins can manage banners"
ON public.menu_banners FOR ALL
USING (
  (get_user_company_id(auth.uid()) = company_id) 
  AND (has_company_role(auth.uid(), company_id, 'company_admin'::app_role) 
       OR has_role(auth.uid(), 'super_admin'::app_role))
)
WITH CHECK (
  (get_user_company_id(auth.uid()) = company_id) 
  AND (has_company_role(auth.uid(), company_id, 'company_admin'::app_role) 
       OR has_role(auth.uid(), 'super_admin'::app_role))
);

CREATE POLICY "Company users can view banners"
ON public.menu_banners FOR SELECT
USING (
  (get_user_company_id(auth.uid()) = company_id) 
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- Índices para performance
CREATE INDEX idx_product_groups_company ON public.product_groups(company_id);
CREATE INDEX idx_group_extras_group ON public.group_extras(group_id);
CREATE INDEX idx_product_group_links_product ON public.product_group_links(product_id);
CREATE INDEX idx_menu_banners_company ON public.menu_banners(company_id);
CREATE INDEX idx_categories_order ON public.categories(company_id, display_order);
CREATE INDEX idx_products_order ON public.products(company_id, display_order);