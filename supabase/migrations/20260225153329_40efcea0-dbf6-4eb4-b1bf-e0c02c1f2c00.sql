
CREATE TABLE whatsapp_agent_control (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  session_name text NOT NULL,
  phone text,
  is_paused boolean DEFAULT false,
  paused_at timestamptz,
  paused_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_whatsapp_agent_control_unique 
  ON whatsapp_agent_control (company_id, session_name, COALESCE(phone, '__global__'));

ALTER TABLE whatsapp_agent_control ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_agent_control" ON whatsapp_agent_control
  FOR ALL USING (company_id = get_user_company_id(auth.uid()));

CREATE TRIGGER update_whatsapp_agent_control_updated_at
  BEFORE UPDATE ON whatsapp_agent_control
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
