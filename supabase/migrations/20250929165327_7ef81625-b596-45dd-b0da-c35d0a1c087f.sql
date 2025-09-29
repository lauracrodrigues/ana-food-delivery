-- Corrigir status do pedido do João Silva
UPDATE public.orders 
SET status = 'pending' 
WHERE customer_name = 'João Silva' AND order_number = '001';

-- Criar tabela de formas de pagamento
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL,
  name text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Empresas podem ver suas formas de pagamento" 
ON public.payment_methods 
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

CREATE POLICY "Empresas podem gerenciar suas formas de pagamento" 
ON public.payment_methods 
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

-- Criar trigger para updated_at
CREATE TRIGGER update_payment_methods_updated_at
BEFORE UPDATE ON public.payment_methods
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Criar tabela de sessões WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapp_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL,
  session_name text NOT NULL,
  agent_name text NOT NULL,
  agent_prompt text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Empresas podem ver suas sessões WhatsApp" 
ON public.whatsapp_sessions 
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

CREATE POLICY "Empresas podem gerenciar suas sessões WhatsApp" 
ON public.whatsapp_sessions 
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

-- Criar trigger para updated_at
CREATE TRIGGER update_whatsapp_sessions_updated_at
BEFORE UPDATE ON public.whatsapp_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();