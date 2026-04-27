-- Migration: NPS, Referrals and Dashboard Analytics
-- Created: 2026-04-27

-- Referrals table (patient referrals from NPS >= 9)
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  referrer_patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  referred_name TEXT NOT NULL,
  referred_phone TEXT,
  referred_email TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'converted', 'declined')),
  nps_survey_id UUID REFERENCES satisfaction_surveys(id),
  notes TEXT,
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Dashboard metrics cache (for fast KPI loading)
CREATE TABLE IF NOT EXISTS org_metrics_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_patients INTEGER DEFAULT 0,
  total_evaluations INTEGER DEFAULT 0,
  avg_spem_score NUMERIC(5,2),
  nps_score NUMERIC(5,2),
  response_rate NUMERIC(5,2),
  referrals_sent INTEGER DEFAULT 0,
  referrals_converted INTEGER DEFAULT 0,
  pipeline_counts JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, metric_date)
);

-- NPS survey link tokens (for public access)
CREATE TABLE IF NOT EXISTS nps_survey_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  used_at TIMESTAMPTZ,
  survey_id UUID REFERENCES satisfaction_surveys(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_metrics_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE nps_survey_tokens ENABLE ROW LEVEL SECURITY;

-- Referrals: org scoped
CREATE POLICY referrals_org_scope ON referrals
  FOR ALL USING (org_id = public.current_org_id());

-- Metrics cache: org scoped
CREATE POLICY metrics_cache_org_scope ON org_metrics_cache
  FOR ALL USING (org_id = public.current_org_id());

-- Survey tokens: org scoped (for admin view)
CREATE POLICY survey_tokens_org_scope ON nps_survey_tokens
  FOR ALL USING (org_id = public.current_org_id());

-- Indexes
CREATE INDEX idx_referrals_org_id ON referrals(org_id);
CREATE INDEX idx_referrals_status ON referrals(status);
CREATE INDEX idx_referrals_referrer ON referrals(referrer_patient_id);
CREATE INDEX idx_metrics_cache_org_date ON org_metrics_cache(org_id, metric_date);
CREATE INDEX idx_nps_tokens_token ON nps_survey_tokens(token);
CREATE INDEX idx_nps_tokens_patient ON nps_survey_tokens(patient_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_referrals_updated_at
  BEFORE UPDATE ON referrals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_org_metrics_cache_updated_at
  BEFORE UPDATE ON org_metrics_cache
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate NPS score
CREATE OR REPLACE FUNCTION calculate_nps_score(
  p_org_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
) RETURNS NUMERIC AS $$
DECLARE
  v_promoters INTEGER;
  v_detractors INTEGER;
  v_total INTEGER;
  v_nps NUMERIC;
BEGIN
  SELECT 
    COUNT(*) FILTER (WHERE nps_score >= 9),
    COUNT(*) FILTER (WHERE nps_score <= 6),
    COUNT(*)
  INTO v_promoters, v_detractors, v_total
  FROM satisfaction_surveys
  WHERE org_id = p_org_id
    AND (p_start_date IS NULL OR created_at::date >= p_start_date)
    AND (p_end_date IS NULL OR created_at::date <= p_end_date)
    AND nps_score IS NOT NULL;

  IF v_total = 0 THEN
    RETURN NULL;
  END IF;

  v_nps := ((v_promoters::NUMERIC / v_total) - (v_detractors::NUMERIC / v_total)) * 100;
  RETURN ROUND(v_nps, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to refresh org metrics cache
CREATE OR REPLACE FUNCTION refresh_org_metrics_cache(p_org_id UUID)
RETURNS VOID AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_nps NUMERIC;
  v_total_surveys INTEGER;
  v_completed_surveys INTEGER;
BEGIN
  -- Calculate NPS
  v_nps := calculate_nps_score(p_org_id);
  
  -- Get survey counts
  SELECT COUNT(*), COUNT(*) FILTER (WHERE completed = true)
  INTO v_total_surveys, v_completed_surveys
  FROM satisfaction_surveys
  WHERE org_id = p_org_id AND created_at::date = v_today;

  -- Upsert metrics
  INSERT INTO org_metrics_cache (
    org_id, metric_date, total_patients, total_evaluations,
    avg_spem_score, nps_score, response_rate, referrals_sent, referrals_converted,
    pipeline_counts, updated_at
  )
  SELECT 
    p_org_id,
    v_today,
    COUNT(DISTINCT p.id),
    COUNT(DISTINCT e.id),
    AVG(e.total_score) FILTER (WHERE e.total_score IS NOT NULL),
    v_nps,
    CASE WHEN v_total_surveys > 0 
      THEN (v_completed_surveys::NUMERIC / v_total_surveys) * 100 
      ELSE 0 
    END,
    COUNT(*) FILTER (WHERE r.status IN ('pending', 'contacted', 'converted')),
    COUNT(*) FILTER (WHERE r.status = 'converted'),
    jsonb_object_agg(
      COALESCE(p.workflow_status, 'lead'),
      COUNT(*)
    ),
    now()
  FROM patients p
  LEFT JOIN evaluations e ON e.patient_id = p.id
  LEFT JOIN referrals r ON r.org_id = p.org_id
  WHERE p.org_id = p_org_id
  GROUP BY p.org_id
  ON CONFLICT (org_id, metric_date) DO UPDATE SET
    total_patients = EXCLUDED.total_patients,
    total_evaluations = EXCLUDED.total_evaluations,
    avg_spem_score = EXCLUDED.avg_spem_score,
    nps_score = EXCLUDED.nps_score,
    response_rate = EXCLUDED.response_rate,
    referrals_sent = EXCLUDED.referrals_sent,
    referrals_converted = EXCLUDED.referrals_converted,
    pipeline_counts = EXCLUDED.pipeline_counts,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;