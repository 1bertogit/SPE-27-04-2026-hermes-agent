-- Migration: Billing System - Fase 6
-- Created: 2026-04-28

-- Planos de assinatura
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_price_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  tier TEXT NOT NULL CHECK (tier IN ('starter', 'professional', 'enterprise')),
  monthly_price INTEGER NOT NULL, -- em centavos (R$)
  yearly_price INTEGER NOT NULL, -- em centavos (R$)
  included_procedures INTEGER NOT NULL DEFAULT 0,
  overage_price_per_procedure INTEGER NOT NULL DEFAULT 1500, -- R$15,00
  features JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Assinaturas das organizações
CREATE TABLE IF NOT EXISTS org_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT UNIQUE,
  plan_id UUID REFERENCES subscription_plans(id),
  status TEXT NOT NULL CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'incomplete')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  procedure_count_current_period INTEGER NOT NULL DEFAULT 0,
  overage_charges_current_period INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Faturas/overages
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT UNIQUE,
  amount_due INTEGER NOT NULL, -- em centavos
  amount_paid INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('draft', 'open', 'paid', 'uncollectible', 'void')),
  invoice_type TEXT NOT NULL CHECK (invoice_type IN ('subscription', 'overage')),
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  description TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Uso de procedimentos (para tracking de overage)
CREATE TABLE IF NOT EXISTS procedure_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  surgical_record_id UUID REFERENCES surgical_records(id) ON DELETE SET NULL,
  procedure_date DATE NOT NULL,
  counted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS Policies
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE procedure_usage ENABLE ROW LEVEL SECURITY;

-- Plans: leitura pública
CREATE POLICY "plans_public_read"
  ON subscription_plans FOR SELECT
  USING (is_active = true);

-- Subscriptions: apenas própria org
CREATE POLICY "subscriptions_org_scope"
  ON org_subscriptions FOR ALL
  USING (org_id = public.current_org_id());

-- Invoices: apenas própria org
CREATE POLICY "invoices_org_scope"
  ON invoices FOR ALL
  USING (org_id = public.current_org_id());

-- Procedure usage: apenas própria org
CREATE POLICY "procedure_usage_org_scope"
  ON procedure_usage FOR ALL
  USING (org_id = public.current_org_id());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_org_subscriptions_org ON org_subscriptions(org_id);
CREATE INDEX IF NOT EXISTS idx_org_subscriptions_status ON org_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_invoices_org ON invoices(org_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_procedure_usage_org_date ON procedure_usage(org_id, procedure_date);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_org_subscriptions_updated_at
  BEFORE UPDATE ON org_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Função para incrementar contador de procedimentos
CREATE OR REPLACE FUNCTION increment_procedure_counter(
  p_org_id UUID,
  p_patient_id UUID,
  p_surgical_record_id UUID,
  p_procedure_date DATE
)
RETURNS VOID AS $$
DECLARE
  v_subscription RECORD;
  v_plan RECORD;
BEGIN
  -- Registrar uso
  INSERT INTO procedure_usage (org_id, patient_id, surgical_record_id, procedure_date)
  VALUES (p_org_id, p_patient_id, p_surgical_record_id, p_procedure_date);
  
  -- Buscar assinatura ativa
  SELECT * INTO v_subscription
  FROM org_subscriptions
  WHERE org_id = p_org_id AND status IN ('trialing', 'active')
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF FOUND THEN
    -- Incrementar contador
    UPDATE org_subscriptions
    SET procedure_count_current_period = procedure_count_current_period + 1
    WHERE id = v_subscription.id;
    
    -- Verificar se ultrapassou limite (para possível cobrança de overage)
    SELECT * INTO v_plan
    FROM subscription_plans
    WHERE id = v_subscription.plan_id;
    
    IF FOUND AND v_subscription.procedure_count_current_period > v_plan.included_procedures THEN
      -- Aqui poderia criar uma invoice de overage
      -- Por agora, apenas logamos
      RAISE NOTICE 'Overage detected for org %: % procedures over limit',
        p_org_id,
        v_subscription.procedure_count_current_period - v_plan.included_procedures;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Seed data: planos iniciais
INSERT INTO subscription_plans (stripe_price_id, name, description, tier, monthly_price, yearly_price, included_procedures, overage_price_per_procedure, features) VALUES
('price_starter_monthly', 'Starter', 'Ideal para clínicas iniciantes', 'starter', 9900, 99900, 10, 1500, '["Pacientes ilimitados", "Avaliações SPE-M", "Fotos clínicas", "Suporte por email"]'::jsonb),
('price_professional_monthly', 'Professional', 'Para clínicas em crescimento', 'professional', 29900, 299900, 50, 1500, '["Tudo do Starter", "Alertas WhatsApp", "NPS e Referrals", "IA Skills básicas", "Suporte prioritário"]'::jsonb),
('price_enterprise_monthly', 'Enterprise', 'Para grandes clínicas e hospitais', 'enterprise', 79900, 799900, 200, 1500, '["Tudo do Professional", "IA Skills avançadas", "API access", "SLA garantido", "Account manager"]'::jsonb)
ON CONFLICT (stripe_price_id) DO NOTHING;
