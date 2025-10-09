-- Habilitar RLS na tabela msg_history
ALTER TABLE public.msg_history ENABLE ROW LEVEL SECURITY;

-- Política: Company admins podem ver todo histórico de mensagens da sua empresa
CREATE POLICY "Company admins can view all message history"
ON public.msg_history
FOR SELECT
USING (
  (get_user_company_id(auth.uid())::text = company_id) 
  AND 
  (has_company_role(auth.uid(), get_user_company_id(auth.uid()), 'company_admin'::app_role) 
   OR has_role(auth.uid(), 'super_admin'::app_role))
);

-- Política: Company staff pode ver histórico limitado (apenas nome e phone, sem mensagens completas)
-- Nota: Esta política não será criada pois o SELECT não permite field-level restrictions
-- Staff terá acesso read-only através da aplicação com campos limitados

-- Política: Apenas company admins podem inserir/atualizar histórico de mensagens
CREATE POLICY "Company admins can manage message history"
ON public.msg_history
FOR ALL
USING (
  (get_user_company_id(auth.uid())::text = company_id) 
  AND 
  (has_company_role(auth.uid(), get_user_company_id(auth.uid()), 'company_admin'::app_role) 
   OR has_role(auth.uid(), 'super_admin'::app_role))
)
WITH CHECK (
  (get_user_company_id(auth.uid())::text = company_id) 
  AND 
  (has_company_role(auth.uid(), get_user_company_id(auth.uid()), 'company_admin'::app_role) 
   OR has_role(auth.uid(), 'super_admin'::app_role))
);

-- Adicionar índice para melhorar performance das queries com company_id
CREATE INDEX IF NOT EXISTS idx_msg_history_company_id ON public.msg_history(company_id);
CREATE INDEX IF NOT EXISTS idx_msg_history_timestamp ON public.msg_history(timestamp DESC);