-- Create table for WhatsApp status messages
CREATE TABLE public.whatsapp_status_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  status TEXT NOT NULL,
  message_template TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(company_id, status)
);

-- Enable RLS
ALTER TABLE public.whatsapp_status_messages ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Empresas podem ver suas mensagens de status" 
ON public.whatsapp_status_messages 
FOR SELECT 
USING (
  company_id IN (
    SELECT id FROM companies WHERE owner_id = auth.uid()
    UNION
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'master_admin'
  )
);

CREATE POLICY "Empresas podem gerenciar suas mensagens de status" 
ON public.whatsapp_status_messages 
FOR ALL 
USING (
  company_id IN (
    SELECT id FROM companies WHERE owner_id = auth.uid()
    UNION
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'master_admin'
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_whatsapp_status_messages_updated_at
BEFORE UPDATE ON public.whatsapp_status_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();