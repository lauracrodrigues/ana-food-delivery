-- Criar tabela de configurações da loja
CREATE TABLE IF NOT EXISTS public.store_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  store_open BOOLEAN DEFAULT true,
  auto_accept BOOLEAN DEFAULT false,
  sound_enabled BOOLEAN DEFAULT true,
  alert_time INTEGER DEFAULT 60,
  delivery_time INTEGER DEFAULT 30,
  pickup_time INTEGER DEFAULT 45,
  delivery_fee NUMERIC(10, 2) DEFAULT 5.00,
  visible_columns JSONB DEFAULT '{"novo": true, "preparando": true, "pronto": true, "em_entrega": true, "concluido": true, "cancelado": false}'::jsonb,
  printer_settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(company_id)
);

-- Adicionar campos faltantes na tabela orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS order_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'dinheiro',
ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'delivery',
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS observations TEXT,
ADD COLUMN IF NOT EXISTS estimated_time INTEGER,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_orders_company_status ON public.orders(company_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_store_settings_company ON public.store_settings(company_id);

-- Criar tabela de alertas do WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapp_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  read BOOLEAN DEFAULT false
);

-- RLS para store_settings
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Empresas podem ver suas configurações" 
ON public.store_settings 
FOR SELECT 
USING (company_id IN (
  SELECT companies.id FROM companies WHERE companies.owner_id = auth.uid()
  UNION
  SELECT profiles.company_id FROM profiles WHERE profiles.id = auth.uid()
) OR EXISTS (
  SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'master_admin'
));

CREATE POLICY "Empresas podem gerenciar suas configurações" 
ON public.store_settings 
FOR ALL 
USING (company_id IN (
  SELECT companies.id FROM companies WHERE companies.owner_id = auth.uid()
  UNION
  SELECT profiles.company_id FROM profiles WHERE profiles.id = auth.uid()
) OR EXISTS (
  SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'master_admin'
));

-- RLS para whatsapp_alerts
ALTER TABLE public.whatsapp_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Empresas podem ver seus alertas" 
ON public.whatsapp_alerts 
FOR SELECT 
USING (company_id IN (
  SELECT companies.id FROM companies WHERE companies.owner_id = auth.uid()
  UNION
  SELECT profiles.company_id FROM profiles WHERE profiles.id = auth.uid()
) OR EXISTS (
  SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'master_admin'
));

CREATE POLICY "Empresas podem gerenciar seus alertas" 
ON public.whatsapp_alerts 
FOR ALL 
USING (company_id IN (
  SELECT companies.id FROM companies WHERE companies.owner_id = auth.uid()
  UNION
  SELECT profiles.company_id FROM profiles WHERE profiles.id = auth.uid()
) OR EXISTS (
  SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'master_admin'
));

-- Função para atualizar timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_store_settings_updated_at
BEFORE UPDATE ON public.store_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar configurações iniciais para empresas existentes
INSERT INTO public.store_settings (company_id)
SELECT id FROM public.companies
ON CONFLICT DO NOTHING;