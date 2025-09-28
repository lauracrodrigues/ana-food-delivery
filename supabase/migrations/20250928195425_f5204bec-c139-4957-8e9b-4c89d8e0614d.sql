-- Criar tabela de taxas de entrega
CREATE TABLE IF NOT EXISTS public.delivery_fees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  zone_name TEXT NOT NULL,
  delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  min_order_value NUMERIC(10,2),
  max_distance_km NUMERIC(10,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.delivery_fees ENABLE ROW LEVEL SECURITY;

-- Create policies for delivery fees
CREATE POLICY "Empresas podem ver suas taxas de entrega" 
ON public.delivery_fees 
FOR SELECT 
USING (
  company_id IN (
    SELECT companies.id FROM companies WHERE companies.owner_id = auth.uid()
    UNION
    SELECT profiles.company_id FROM profiles WHERE profiles.id = auth.uid()
  ) 
  OR EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'master_admin'
  )
);

CREATE POLICY "Empresas podem gerenciar suas taxas de entrega" 
ON public.delivery_fees 
FOR ALL 
USING (
  company_id IN (
    SELECT companies.id FROM companies WHERE companies.owner_id = auth.uid()
    UNION
    SELECT profiles.company_id FROM profiles WHERE profiles.id = auth.uid()
  ) 
  OR EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'master_admin'
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_delivery_fees_updated_at
BEFORE UPDATE ON public.delivery_fees
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();