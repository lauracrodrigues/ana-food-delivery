-- Adicionar campos necessários à tabela companies
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS banner_url text,
ADD COLUMN IF NOT EXISTS schedule jsonb DEFAULT '{"monday": {"open": "08:00", "close": "22:00", "closed": false}, "tuesday": {"open": "08:00", "close": "22:00", "closed": false}, "wednesday": {"open": "08:00", "close": "22:00", "closed": false}, "thursday": {"open": "08:00", "close": "22:00", "closed": false}, "friday": {"open": "08:00", "close": "22:00", "closed": false}, "saturday": {"open": "08:00", "close": "22:00", "closed": false}, "sunday": {"open": "08:00", "close": "22:00", "closed": false}}'::jsonb;

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_orders_company_status ON public.orders(company_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_companies_subdomain ON public.companies(subdomain);