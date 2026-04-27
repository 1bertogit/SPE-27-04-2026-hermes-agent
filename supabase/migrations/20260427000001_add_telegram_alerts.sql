-- Migration: Telegram integration for doctor alerts
-- Created: 2026-04-27

-- Tabela de configurações de Telegram por organização
CREATE TABLE IF NOT EXISTS org_telegram_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  bot_token VARCHAR(255),
  chat_id VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT false,
  alert_on_critical_keywords BOOLEAN NOT NULL DEFAULT true,
  alert_on_patient_messages BOOLEAN NOT NULL DEFAULT false,
  alert_on_system_errors BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (org_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_org_telegram_settings_org_id ON org_telegram_settings(org_id);

-- RLS: Apenas admins da org podem gerenciar
ALTER TABLE org_telegram_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can manage telegram settings" ON org_telegram_settings
  FOR ALL USING (
    org_id = public.current_org_id() AND
    public.current_app_role() = 'admin'
  );

-- Tabela de log de mensagens Telegram enviadas
CREATE TABLE IF NOT EXISTS telegram_alert_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  alert_log_id UUID REFERENCES alert_logs(id) ON DELETE SET NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  message_type VARCHAR(50) NOT NULL, -- 'critical_keyword', 'patient_message', 'system_error'
  message_text TEXT NOT NULL,
  telegram_message_id BIGINT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_telegram_alert_logs_org_id ON telegram_alert_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_telegram_alert_logs_patient_id ON telegram_alert_logs(patient_id);
CREATE INDEX IF NOT EXISTS idx_telegram_alert_logs_status ON telegram_alert_logs(status);
CREATE INDEX IF NOT EXISTS idx_telegram_alert_logs_created_at ON telegram_alert_logs(created_at DESC);

-- RLS
ALTER TABLE telegram_alert_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view telegram logs" ON telegram_alert_logs
  FOR SELECT USING (
    org_id = public.current_org_id()
  );

-- Função para enviar alerta Telegram (chamada via Edge Function ou trigger)
CREATE OR REPLACE FUNCTION should_send_telegram_alert(
  p_org_id UUID,
  p_message_type VARCHAR(50)
) RETURNS BOOLEAN AS $$
DECLARE
  v_settings RECORD;
BEGIN
  SELECT * INTO v_settings FROM org_telegram_settings WHERE org_id = p_org_id;
  
  IF v_settings IS NULL OR NOT v_settings.is_active THEN
    RETURN false;
  END IF;
  
  CASE p_message_type
    WHEN 'critical_keyword' THEN RETURN v_settings.alert_on_critical_keywords;
    WHEN 'patient_message' THEN RETURN v_settings.alert_on_patient_messages;
    WHEN 'system_error' THEN RETURN v_settings.alert_on_system_errors;
    ELSE RETURN false;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentários
COMMENT ON TABLE org_telegram_settings IS 'Configurações de integração Telegram por organização';
COMMENT ON TABLE telegram_alert_logs IS 'Log de mensagens enviadas via Telegram para médicos';
