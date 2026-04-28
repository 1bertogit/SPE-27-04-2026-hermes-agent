-- Migration: Immutable agent logs ledger - Fase 4 foundation
-- Created: 2026-04-28

CREATE TABLE IF NOT EXISTS agent_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES patients(id) ON DELETE SET NULL,
  execution_id uuid REFERENCES agent_executions(id) ON DELETE SET NULL,
  run_id uuid NOT NULL,
  parent_run_id uuid,
  agent_type text NOT NULL CHECK (agent_type IN (
    'HarnessRunner',
    'MessageAgent',
    'ResponseAnalyzer',
    'DocumentGenerator'
  )),
  harness_phase integer CHECK (harness_phase BETWEEN 1 AND 8),
  event_type text NOT NULL CHECK (event_type IN (
    'run_started',
    'run_completed',
    'run_failed',
    'run_cancelled',
    'phase_started',
    'phase_completed',
    'phase_failed',
    'phase_skipped',
    'agent_started',
    'agent_completed',
    'agent_failed',
    'guardrail_blocked',
    'dispatch_queued',
    'dispatch_completed',
    'dispatch_failed'
  )),
  status text NOT NULL CHECK (status IN (
    'pending',
    'running',
    'completed',
    'failed',
    'cancelled',
    'skipped',
    'blocked'
  )),
  skill_slug text,
  skill_name text,
  skill_version text,
  skill_source text CHECK (skill_source IN (
    'system_file',
    'system_db',
    'tenant_db',
    'none'
  )),
  input_hash text,
  input_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  context_snapshot jsonb,
  output_payload jsonb,
  error_message text,
  error_stack jsonb,
  model_provider text,
  model_name text,
  input_tokens integer,
  output_tokens integer,
  cost_usd numeric(10,6),
  actor_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_logs_org_created ON agent_logs(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_logs_run ON agent_logs(run_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_logs_execution ON agent_logs(execution_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_patient_created ON agent_logs(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_logs_agent_type ON agent_logs(agent_type);
CREATE INDEX IF NOT EXISTS idx_agent_logs_status ON agent_logs(status);
CREATE INDEX IF NOT EXISTS idx_agent_logs_event_type ON agent_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_agent_logs_harness_phase ON agent_logs(run_id, harness_phase, created_at DESC);

ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agent_logs_org_select" ON agent_logs;
CREATE POLICY "agent_logs_org_select" ON agent_logs
  FOR SELECT USING (org_id = public.current_org_id());

DROP POLICY IF EXISTS "agent_logs_service_insert" ON agent_logs;
CREATE POLICY "agent_logs_service_insert" ON agent_logs
  FOR INSERT WITH CHECK (false);

CREATE OR REPLACE FUNCTION prevent_agent_logs_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'agent_logs is append-only; % is not allowed', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS block_agent_logs_update ON agent_logs;
CREATE TRIGGER block_agent_logs_update
  BEFORE UPDATE ON agent_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_agent_logs_mutation();

DROP TRIGGER IF EXISTS block_agent_logs_delete ON agent_logs;
CREATE TRIGGER block_agent_logs_delete
  BEFORE DELETE ON agent_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_agent_logs_mutation();

CREATE OR REPLACE VIEW agent_run_latest
WITH (security_invoker = true) AS
WITH latest AS (
  SELECT DISTINCT ON (org_id, run_id)
    id,
    org_id,
    patient_id,
    execution_id,
    run_id,
    parent_run_id,
    agent_type,
    harness_phase,
    event_type,
    status,
    skill_slug,
    skill_name,
    skill_version,
    skill_source,
    output_payload,
    error_message,
    model_provider,
    model_name,
    created_at AS last_event_at
  FROM agent_logs
  ORDER BY org_id, run_id, created_at DESC, id DESC
),
totals AS (
  SELECT
    org_id,
    run_id,
    min(created_at) AS started_at,
    max(created_at) AS last_event_at,
    max(created_at) FILTER (WHERE status IN ('completed', 'failed', 'cancelled', 'blocked')) AS completed_at,
    COALESCE(sum(input_tokens), 0)::integer AS input_tokens,
    COALESCE(sum(output_tokens), 0)::integer AS output_tokens,
    COALESCE(sum(cost_usd), 0)::numeric(10,6) AS cost_usd,
    count(*)::integer AS event_count
  FROM agent_logs
  GROUP BY org_id, run_id
)
SELECT
  latest.id AS latest_log_id,
  latest.org_id,
  latest.patient_id,
  latest.execution_id,
  latest.run_id,
  latest.parent_run_id,
  latest.agent_type,
  latest.harness_phase,
  latest.event_type,
  latest.status,
  latest.skill_slug,
  latest.skill_name,
  latest.skill_version,
  latest.skill_source,
  latest.output_payload,
  latest.error_message,
  latest.model_provider,
  latest.model_name,
  totals.started_at,
  totals.last_event_at,
  totals.completed_at,
  totals.input_tokens,
  totals.output_tokens,
  totals.cost_usd,
  totals.event_count
FROM latest
JOIN totals
  ON totals.org_id = latest.org_id
 AND totals.run_id = latest.run_id;

CREATE OR REPLACE VIEW agent_harness_phase_status
WITH (security_invoker = true) AS
WITH ranked AS (
  SELECT DISTINCT ON (org_id, run_id, harness_phase)
    id AS latest_log_id,
    org_id,
    patient_id,
    execution_id,
    run_id,
    parent_run_id,
    agent_type,
    harness_phase,
    event_type,
    status,
    error_message,
    created_at AS last_event_at
  FROM agent_logs
  WHERE harness_phase IS NOT NULL
  ORDER BY org_id, run_id, harness_phase, created_at DESC, id DESC
)
SELECT * FROM ranked;

CREATE OR REPLACE VIEW agent_log_metrics
WITH (security_invoker = true) AS
SELECT
  org_id,
  agent_type,
  skill_slug,
  date(created_at) AS date,
  count(DISTINCT run_id)::integer AS total_runs,
  count(*) FILTER (WHERE event_type IN ('agent_completed', 'run_completed', 'phase_completed'))::integer AS completed_events,
  count(*) FILTER (WHERE event_type IN ('agent_failed', 'run_failed', 'phase_failed'))::integer AS failed_events,
  COALESCE(sum(input_tokens), 0)::integer AS total_input_tokens,
  COALESCE(sum(output_tokens), 0)::integer AS total_output_tokens,
  COALESCE(sum(cost_usd), 0)::numeric(10,6) AS total_cost
FROM agent_logs
GROUP BY org_id, agent_type, skill_slug, date(created_at);

COMMENT ON TABLE agent_logs IS 'Append-only audit ledger for Fase 4 agent and harness events. Service role inserts only; update/delete are blocked by trigger.';
COMMENT ON VIEW agent_run_latest IS 'Latest state per agent run derived from immutable agent_logs events.';
COMMENT ON VIEW agent_harness_phase_status IS 'Latest status per HarnessRunner phase derived from immutable agent_logs events.';
COMMENT ON VIEW agent_log_metrics IS 'Daily aggregate metrics derived from immutable agent_logs events.';
