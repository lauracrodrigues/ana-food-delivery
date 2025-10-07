-- Criar nova tabela unificada whatsapp_config
CREATE TABLE IF NOT EXISTS public.whatsapp_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  config_type TEXT NOT NULL CHECK (config_type IN ('session', 'status_message', 'alert')),
  
  -- Campos para sessions (config_type = 'session')
  session_name TEXT,
  agent_name TEXT,
  agent_prompt TEXT,
  webhook_url TEXT,
  connection_status TEXT,
  
  -- Campos para status_messages (config_type = 'status_message')
  status TEXT,
  message_template TEXT,
  
  -- Campos para alerts (config_type = 'alert')
  phone TEXT,
  customer_name TEXT,
  message TEXT,
  read BOOLEAN DEFAULT false,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints para garantir integridade
  CONSTRAINT unique_session_name UNIQUE (company_id, session_name, config_type),
  CONSTRAINT unique_status_message UNIQUE (company_id, status, config_type)
);

-- Migrar dados de whatsapp_sessions
INSERT INTO public.whatsapp_config (
  id, company_id, config_type, session_name, agent_name, agent_prompt, 
  webhook_url, is_active, created_at, updated_at
)
SELECT 
  id, company_id, 'session'::TEXT, session_name, agent_name, agent_prompt,
  webhook_url, is_active, created_at, updated_at
FROM public.whatsapp_sessions;

-- Migrar dados de whatsapp_status_messages
INSERT INTO public.whatsapp_config (
  id, company_id, config_type, status, message_template, 
  is_active, created_at, updated_at
)
SELECT 
  id, company_id, 'status_message'::TEXT, status, message_template,
  COALESCE(is_enabled, true), created_at, updated_at
FROM public.whatsapp_status_messages;

-- Migrar dados de whatsapp_alerts
INSERT INTO public.whatsapp_config (
  id, company_id, config_type, phone, customer_name, message, 
  read, created_at
)
SELECT 
  id, company_id, 'alert'::TEXT, phone, customer_name, message,
  COALESCE(read, false), created_at
FROM public.whatsapp_alerts;

-- Habilitar RLS
ALTER TABLE public.whatsapp_config ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Company users can view whatsapp config"
  ON public.whatsapp_config FOR SELECT
  USING (
    get_user_company_id(auth.uid()) = company_id 
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Company admins can manage whatsapp config"
  ON public.whatsapp_config FOR ALL
  USING (
    (get_user_company_id(auth.uid()) = company_id 
     AND has_company_role(auth.uid(), company_id, 'company_admin'::app_role))
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
  WITH CHECK (
    (get_user_company_id(auth.uid()) = company_id 
     AND has_company_role(auth.uid(), company_id, 'company_admin'::app_role))
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- Criar índices para performance
CREATE INDEX idx_whatsapp_config_company_type ON public.whatsapp_config(company_id, config_type);
CREATE INDEX idx_whatsapp_config_session_name ON public.whatsapp_config(session_name) WHERE config_type = 'session';
CREATE INDEX idx_whatsapp_config_status ON public.whatsapp_config(status) WHERE config_type = 'status_message';

-- Trigger para updated_at
CREATE TRIGGER update_whatsapp_config_updated_at
  BEFORE UPDATE ON public.whatsapp_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Remover tabelas antigas
DROP TABLE IF EXISTS public.whatsapp_alerts CASCADE;
DROP TABLE IF EXISTS public.whatsapp_sessions CASCADE;
DROP TABLE IF EXISTS public.whatsapp_status_messages CASCADE;