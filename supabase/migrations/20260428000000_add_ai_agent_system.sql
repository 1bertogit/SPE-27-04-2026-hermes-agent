-- Migration: AI Agent System - Fase 4
-- Created: 2026-04-28

-- Tabela de execuções de agentes (imutável - apenas INSERT)
CREATE TABLE IF NOT EXISTS agent_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  
  -- Identificação do agente
  agent_type TEXT NOT NULL CHECK (agent_type IN (
    'MessageAgent',
    'ResponseAnalyzer', 
    'DocumentGenerator',
    'HarnessRunner'
  )),
  skill_name TEXT, -- opcional, para skills customizadas
  
  -- Input/Contexto
  input_payload JSONB NOT NULL,
  context JSONB, -- dados adicionais de contexto
  
  -- Output/Resultado
  output_payload JSONB,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN (
    'running',
    'completed',
    'failed',
    'cancelled'
  )),
  
  -- Metadados de execução
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  
  -- Tokens/custo (para billing)
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_usd DECIMAL(10,6),
  
  -- Erro (se houver)
  error_message TEXT,
  error_stack JSONB,
  
  -- Chain de execução (para rastrear dependências)
  parent_execution_id UUID REFERENCES agent_executions(id) ON DELETE SET NULL,
  execution_chain UUID[], -- array de IDs para rastrear toda a árvore
  
  -- Harness Runner específico (8 fases fixas)
  harness_phase INTEGER CHECK (harness_phase BETWEEN 1 AND 8),
  harness_status TEXT CHECK (harness_status IN (
    'pending', 'running', 'completed', 'skipped', 'failed'
  )),
  
  -- Controle de concorrência
  locked_by TEXT, -- instance_id do worker
  locked_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para agent_executions
CREATE INDEX idx_agent_executions_org ON agent_executions(org_id);
CREATE INDEX idx_agent_executions_patient ON agent_executions(patient_id);
CREATE INDEX idx_agent_executions_type ON agent_executions(agent_type);
CREATE INDEX idx_agent_executions_status ON agent_executions(status);
CREATE INDEX idx_agent_executions_started ON agent_executions(started_at DESC);
CREATE INDEX idx_agent_executions_chain ON agent_executions USING GIN(execution_chain);
CREATE INDEX idx_agent_executions_parent ON agent_executions(parent_execution_id);

-- View para métricas de agentes (read-only)
CREATE OR REPLACE VIEW agent_metrics AS
SELECT 
  org_id,
  agent_type,
  skill_name,
  DATE(started_at) as date,
  COUNT(*) as total_executions,
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  AVG(duration_ms) as avg_duration_ms,
  SUM(cost_usd) as total_cost,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens
FROM agent_executions
GROUP BY org_id, agent_type, skill_name, DATE(started_at);

-- Tabela de skills AI configuráveis
CREATE TABLE IF NOT EXISTS ai_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Hierarquia: sistema > tenant
  is_system BOOLEAN NOT NULL DEFAULT false, -- true = disponível para todos
  parent_skill_id UUID REFERENCES ai_skills(id) ON DELETE SET NULL,
  
  -- Identificação
  name TEXT NOT NULL,
  slug TEXT NOT NULL, -- unique por org
  description TEXT,
  
  -- Configuração do agente
  agent_type TEXT NOT NULL CHECK (agent_type IN (
    'MessageAgent',
    'ResponseAnalyzer',
    'DocumentGenerator'
  )),
  
  -- Prompt e configurações
  system_prompt TEXT NOT NULL,
  user_prompt_template TEXT, -- template com variáveis {{variable}}
  
  -- Modelo e parâmetros
  model_config JSONB DEFAULT '{
    "model": "claude-sonnet-4-6",
    "temperature": 0.7,
    "max_tokens": 2048,
    "top_p": 0.9
  }'::jsonb,
  
  -- Ferramentas disponíveis para o skill
  available_tools TEXT[] DEFAULT '{}',
  
  -- Validação de output
  output_schema JSONB, -- schema JSON para validar resposta
  
  -- Trigger automático
  auto_trigger JSONB, -- { "event": "patient_status_change", "condition": {...} }
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER DEFAULT 100, -- menor = mais prioritário
  
  -- Metadados
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(org_id, slug)
);

-- Índices para ai_skills
CREATE INDEX idx_ai_skills_org ON ai_skills(org_id);
CREATE INDEX idx_ai_skills_type ON ai_skills(agent_type);
CREATE INDEX idx_ai_skills_active ON ai_skills(is_active) WHERE is_active = true;
CREATE INDEX idx_ai_skills_system ON ai_skills(is_system) WHERE is_system = true;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ai_skills_updated_at 
  BEFORE UPDATE ON ai_skills 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE agent_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_skills ENABLE ROW LEVEL SECURITY;

-- agent_executions: apenas leitura da própria org
CREATE POLICY "agent_executions_org_select" ON agent_executions
  FOR SELECT USING (org_id = current_org_id());

-- ai_skills: ler skills do sistema + da própria org
CREATE POLICY "ai_skills_select" ON ai_skills
  FOR SELECT USING (is_system = true OR org_id = current_org_id());

-- ai_skills: apenas admins podem modificar
CREATE POLICY "ai_skills_admin" ON ai_skills
  FOR ALL USING (
    org_id = current_org_id() 
    AND current_app_role() = 'admin'
  );

-- Seed: Skills do sistema padrão
INSERT INTO ai_skills (
  is_system,
  name,
  slug,
  description,
  agent_type,
  system_prompt,
  user_prompt_template,
  available_tools
) VALUES (
  true,
  'Gerador de Mensagens de Acompanhamento',
  'default-message-agent',
  'Gera mensagens personalizadas de acompanhamento pós-operatório',
  'MessageAgent',
  'Você é um assistente médico especializado em comunicação empática e profissional com pacientes pós-operatórios. Suas mensagens devem ser: 1) Calorosas mas profissionais, 2) Claras sobre próximos passos, 3) Incluir call-to-action quando apropriado, 4) Respeitar a jornada do paciente. Use linguagem simples, evite jargões médicos. Sempre termine oferecendo suporte.',
  'Gere uma mensagem de {{message_type}} para o paciente {{patient_name}} que está no estágio {{workflow_stage}} após {{procedure_type}}. Contexto adicional: {{context}}',
  '{"send_whatsapp", "schedule_appointment"}'
), (
  true,
  'Analisador de Respostas de Pacientes',
  'default-response-analyzer',
  'Classifica respostas de pacientes por sentimento, urgência e intenção',
  'ResponseAnalyzer',
  'Você é um analisador clínico que avalia respostas de pacientes. Sua tarefa é: 1) Classificar sentimento (positivo/neutro/negativo), 2) Detectar urgência (normal/urgente/crítica), 3) Identificar intenção (agradecimento/dúvida/reclamação/alerta), 4) Extrair tópicos principais, 5) Sugerir próxima ação. Responda sempre em JSON estruturado.',
  'Analise a seguinte resposta do paciente {{patient_name}}: "{{patient_message}}". Contexto: mensagem {{message_context}}.',
  '{"create_alert", "escalate_to_doctor", "schedule_followup"}'
), (
  true,
  'Gerador de TCI',
  'default-document-generator',
  'Gera Termos de Consentimento Informado personalizados',
  'DocumentGenerator',
  'Você é um assistente jurídico-médico especializado em criar Termos de Consentimento Informado (TCI). Os documentos devem: 1) Ser claros e compreensíveis (legibilidade adequada), 2) Incluir todos os riscos relevantes ao procedimento, 3) Mencionar alternativas de tratamento, 4) Ter estrutura padronizada, 5) Incluir campos para assinatura. Use linguagem acessível mas precisa.',
  'Gere um TCI para {{procedure_name}} considerando: idade {{patient_age}}, sexo {{patient_gender}}, comorbidades {{comorbidities}}, medicações {{medications}}, avaliação SPE-M score {{spem_score}}.',
  '{"save_document", "request_signature"}'
);

COMMENT ON TABLE agent_executions IS 'Log imutável de execuções de agentes AI - apenas INSERT, nunca UPDATE/DELETE';
COMMENT ON TABLE ai_skills IS 'Configurações de skills AI - hierarquia: sistema > tenant';
