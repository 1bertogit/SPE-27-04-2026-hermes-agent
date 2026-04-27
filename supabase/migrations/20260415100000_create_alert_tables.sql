CREATE TABLE IF NOT EXISTS alert_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  code text NOT NULL,
  trigger_type text NOT NULL
    CHECK (trigger_type IN ('scheduled', 'event', 'keyword')),
  channel text NOT NULL DEFAULT 'whatsapp'
    CHECK (channel IN ('whatsapp', 'telegram')),
  target_role text NOT NULL
    CHECK (target_role IN ('patient', 'doctor', 'reception')),
  template_name text NOT NULL,
  template_params jsonb DEFAULT '[]',
  delay_hours integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE (org_id, code)
);

ALTER TABLE alert_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY alert_definitions_select ON alert_definitions
  FOR SELECT USING (org_id = public.current_org_id());
CREATE POLICY alert_definitions_insert ON alert_definitions
  FOR INSERT WITH CHECK (org_id = public.current_org_id());
CREATE POLICY alert_definitions_update ON alert_definitions
  FOR UPDATE USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());
CREATE POLICY alert_definitions_delete ON alert_definitions
  FOR DELETE USING (org_id = public.current_org_id());

CREATE TABLE IF NOT EXISTS alert_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  patient_id uuid NOT NULL REFERENCES patients(id),
  definition_id uuid REFERENCES alert_definitions(id),
  direction text NOT NULL DEFAULT 'outbound'
    CHECK (direction IN ('outbound', 'inbound')),
  channel text NOT NULL DEFAULT 'whatsapp',
  phone text,
  wa_message_id text,
  template_name text,
  payload jsonb,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed', 'received')),
  keyword_detected text,
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE alert_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY alert_logs_select ON alert_logs
  FOR SELECT USING (org_id = public.current_org_id());
CREATE POLICY alert_logs_insert ON alert_logs
  FOR INSERT WITH CHECK (org_id = public.current_org_id());
CREATE POLICY alert_logs_update ON alert_logs
  FOR UPDATE USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());

CREATE INDEX idx_alert_logs_patient ON alert_logs (patient_id, created_at DESC);
CREATE INDEX idx_alert_logs_pending ON alert_logs (status) WHERE status = 'pending';
CREATE INDEX idx_alert_logs_keyword ON alert_logs (keyword_detected) WHERE keyword_detected IS NOT NULL;
