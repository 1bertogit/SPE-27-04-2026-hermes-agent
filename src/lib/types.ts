export interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  clinic_name: string | null;
  clinic_address: string | null;
  crm_number: string | null;
  specialty: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface Patient {
  id: string;
  user_id: string;
  full_name: string;
  cpf: string;
  date_of_birth: string | null;
  gender: string;
  phone: string;
  email: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  classification: 'I' | 'II' | 'III' | 'IV';
  medical_history: string | null;
  allergies: string | null;
  medications: string | null;
  notes: string | null;
  status: 'Ativo' | 'Inativo';
  workflow_status: WorkflowStatus;
  weight_kg: number | null;
  height_cm: number | null;
  smoker: boolean;
  smoking_cessation_date: string | null;
  how_found_clinic: string | null;
  procedure_interest: string | null;
  family_history: string | null;
  created_at: string;
  updated_at: string;
}

export type EvaluationStatus = 'Pendente' | 'Em Andamento' | 'Concluído';

export interface Evaluation {
  id: string;
  patient_id: string;
  user_id: string;
  status: EvaluationStatus;
  total_score: number;
  max_score: number;
  current_step: number;
  procedure_type: string | null;
  notes: string | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  patient?: Patient;
}

export interface EvaluationCriterion {
  id: string;
  evaluation_id: string;
  criterion_key: string;
  criterion_group: string;
  criterion_label: string;
  selected_option: string;
  score: number;
  max_score: number;
  step_number: number;
  created_at: string;
}

export interface PatientPhoto {
  id: string;
  patient_id: string;
  user_id: string;
  evaluation_id: string | null;
  viewport: 'Frontal' | 'Lateral_L' | 'Lateral_R' | 'Oblique_L' | 'Oblique_R';
  file_url: string;
  annotations_json: DrawingOperation[];
  uploaded_at: string;
}

export interface DrawingOperation {
  type: 'pen' | 'eraser';
  color: string;
  width: number;
  points: { x: number; y: number }[];
}

export interface CriterionOption {
  label: string;
  value: string;
  score: number;
}

export interface CriterionDefinition {
  key: string;
  label: string;
  options: CriterionOption[];
  maxScore: number;
}

export interface EvaluationStep {
  id: number;
  title: string;
  description: string;
  criteria: CriterionDefinition[];
}

export type AppointmentStatus = 'Agendado' | 'Realizado' | 'Cancelado' | 'Remarcado';
export type AppointmentType =
  | 'Consulta Inicial'
  | 'Pré-operatório'
  | 'Pós-op 24-48h'
  | 'Pós-op 7 dias'
  | 'Pós-op 30 dias'
  | 'Pós-op 3-6 meses'
  | 'Pós-op 12 meses'
  | 'Retorno';

export interface PatientAppointment {
  id: string;
  patient_id: string;
  user_id: string;
  evaluation_id: string | null;
  appointment_type: AppointmentType;
  scheduled_date: string | null;
  completed_date: string | null;
  status: AppointmentStatus;
  notes: string | null;
  procedure_type: string | null;
  created_at: string;
  updated_at: string;
  patient?: Patient;
}

export type DocumentType =
  | 'TCI - Rinoplastia'
  | 'TCI - Mamoplastia de Aumento'
  | 'TCI - Mamoplastia Redutora'
  | 'TCI - Lipoaspiração'
  | 'TCI - Abdominoplastia'
  | 'TCI - Lifting Facial'
  | 'Contrato de Prestação de Serviços'
  | 'Autorização de Uso de Imagem'
  | 'Protocolo de Preparo Pré-operatório'
  | 'Política de Privacidade (LGPD)'
  | 'Outros';

export type DocumentStatus = 'Pendente' | 'Assinado' | 'Vencido' | 'Cancelado';

export interface PatientDocument {
  id: string;
  patient_id: string;
  user_id: string;
  evaluation_id: string | null;
  document_type: DocumentType;
  procedure_type: string | null;
  title: string;
  status: DocumentStatus;
  signed_at: string | null;
  file_url: string | null;
  notes: string | null;
  is_mandatory: boolean;
  created_at: string;
  updated_at: string;
  patient?: Patient;
}

export type ChecklistType =
  | 'Liberação Cirúrgica'
  | 'Check-in Dia da Cirurgia'
  | 'Checklist OMS'
  | 'Alta Pós-anestésica'
  | 'Pré-operatório Geral';

export type ChecklistStatus = 'Pendente' | 'Em Andamento' | 'Concluído';
export type ChecklistItemType = 'Obrigatório CFM' | 'Recomendado' | 'Risco/Alerta';

export interface Checklist {
  id: string;
  patient_id: string;
  user_id: string;
  evaluation_id: string | null;
  checklist_type: ChecklistType;
  procedure_type: string | null;
  title: string;
  status: ChecklistStatus;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  items?: ChecklistItem[];
  patient?: Patient;
}

export interface ChecklistItem {
  id: string;
  checklist_id: string;
  user_id: string;
  label: string;
  is_mandatory: boolean;
  is_completed: boolean;
  completed_at: string | null;
  item_type: ChecklistItemType;
  sort_order: number;
  notes: string | null;
  created_at: string;
}

export type ExamStatus = 'Solicitado' | 'Realizado' | 'Normal' | 'Alterado' | 'Pendente';
export type ExamType = 'Base' | 'Específico do Procedimento' | 'Complementar';

export interface PreopExam {
  id: string;
  patient_id: string;
  user_id: string;
  evaluation_id: string | null;
  exam_name: string;
  exam_type: ExamType;
  procedure_type: string | null;
  status: ExamStatus;
  requested_at: string;
  result_at: string | null;
  result_value: string | null;
  is_altered: boolean;
  is_mandatory: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SurgicalRecord {
  id: string;
  patient_id: string;
  user_id: string;
  evaluation_id: string | null;
  procedure_type: string;
  surgery_date: string | null;
  technique_used: string | null;
  surgical_time_minutes: number | null;
  anesthesia_time_minutes: number | null;
  anesthesia_type: string | null;
  complications: string | null;
  complications_management: string | null;
  materials_used: string | null;
  sutures_used: string | null;
  notes: string | null;
  oms_sign_in_done: boolean;
  oms_time_out_done: boolean;
  oms_sign_out_done: boolean;
  created_at: string;
  updated_at: string;
  implants?: ImplantRecord[];
  patient?: Patient;
}

export interface ImplantRecord {
  id: string;
  surgical_record_id: string;
  patient_id: string;
  user_id: string;
  implant_type: string;
  manufacturer: string;
  model: string | null;
  volume_ml: number | null;
  lot_number: string;
  implant_side: string | null;
  surgery_date: string | null;
  created_at: string;
}

export interface SatisfactionSurvey {
  id: string;
  org_id: string;
  patient_id: string;
  user_id: string;
  evaluation_id: string | null;
  appointment_id: string | null;
  procedure_type: string | null;
  nps_score: number | null;
  what_went_well: string | null;
  what_could_improve: string | null;
  would_recommend: boolean | null;
  overall_rating: number | null;
  completed: boolean;
  survey_date: string;
  created_at: string;
  patient?: Patient;
}

export type AlertTriggerType = 'scheduled' | 'event' | 'keyword';
export type AlertChannel = 'whatsapp' | 'telegram';
export type AlertTargetRole = 'patient' | 'doctor' | 'reception';
export type AlertDirection = 'outbound' | 'inbound';
export type AlertStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'received';

export interface AlertDefinition {
  id: string;
  org_id: string;
  code: string;
  trigger_type: AlertTriggerType;
  channel: AlertChannel;
  target_role: AlertTargetRole;
  template_name: string;
  template_params: unknown[];
  delay_hours: number;
  active: boolean;
  created_at: string;
}

export interface AlertLog {
  id: string;
  org_id: string;
  patient_id: string;
  definition_id: string | null;
  direction: AlertDirection;
  channel: AlertChannel;
  phone: string | null;
  wa_message_id: string | null;
  template_name: string | null;
  payload: Record<string, unknown> | null;
  status: AlertStatus;
  keyword_detected: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  patient?: Patient;
}

export type Role = 'admin' | 'doctor' | 'reception';
export type WorkflowStatus = 'lead' | 'consulta_agendada' | 'consulta_realizada' | 'decidiu_operar' | 'pre_operatorio' | 'cirurgia_agendada' | 'cirurgia_realizada' | 'pos_op_ativo' | 'longo_prazo' | 'encerrado' | 'nao_convertido' | 'cancelado';

export interface OrgContext {
  orgId: string;
  role: Role;
}

// NPS & Referrals
export interface Referral {
  id: string;
  org_id: string;
  referrer_patient_id: string;
  referred_name: string;
  referred_phone: string | null;
  referred_email: string | null;
  status: 'pending' | 'contacted' | 'converted' | 'declined';
  nps_survey_id: string | null;
  notes: string | null;
  converted_at: string | null;
  created_at: string;
  updated_at: string;
  referrer?: Patient;
}

export interface NPSMetrics {
  npsScore: number;
  totalResponses: number;
  promoters: number;
  passives: number;
  detractors: number;
  responseRate: number;
  referralsSent: number;
  referralsConverted: number;
}

// AI & Agents
export interface AISkill {
  id: string;
  org_id: string | null;
  is_system: boolean;
  parent_skill_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  skill_version: string;
  procedure_scope: string;
  task: string | null;
  content_markdown: string | null;
  source_kind: 'system_seed' | 'tenant_override' | 'manual' | 'imported_docx';
  agent_type: 'MessageAgent' | 'ResponseAnalyzer' | 'DocumentGenerator';
  system_prompt: string;
  user_prompt_template: string | null;
  model_config: {
    model: string;
    temperature: number;
    max_tokens: number;
    top_p?: number;
  };
  available_tools: string[];
  output_schema: Record<string, unknown> | null;
  auto_trigger: Record<string, unknown> | null;
  is_active: boolean;
  priority: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentExecution {
  id: string;
  org_id: string;
  patient_id: string | null;
  agent_type: 'MessageAgent' | 'ResponseAnalyzer' | 'DocumentGenerator' | 'HarnessRunner';
  skill_name: string | null;
  input_payload: Record<string, unknown>;
  context: Record<string, unknown> | null;
  output_payload: Record<string, unknown> | null;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  cost_usd: number | null;
  error_message: string | null;
  error_stack: Record<string, unknown> | null;
  parent_execution_id: string | null;
  execution_chain: string[] | null;
  harness_phase: number | null;
  harness_status: 'pending' | 'running' | 'completed' | 'skipped' | 'failed' | null;
  locked_by: string | null;
  locked_at: string | null;
  created_at: string;
}

export interface AgentLog {
  id: string;
  org_id: string;
  patient_id: string | null;
  execution_id: string | null;
  run_id: string;
  parent_run_id: string | null;
  agent_type: 'HarnessRunner' | 'MessageAgent' | 'ResponseAnalyzer' | 'DocumentGenerator';
  harness_phase: number | null;
  event_type:
    | 'run_started'
    | 'run_completed'
    | 'run_failed'
    | 'run_cancelled'
    | 'phase_started'
    | 'phase_completed'
    | 'phase_failed'
    | 'phase_skipped'
    | 'agent_started'
    | 'agent_completed'
    | 'agent_failed'
    | 'guardrail_blocked'
    | 'dispatch_queued'
    | 'dispatch_completed'
    | 'dispatch_failed';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'skipped' | 'blocked';
  skill_slug: string | null;
  skill_name: string | null;
  skill_version: string | null;
  skill_source: 'system_file' | 'system_db' | 'tenant_db' | 'none' | null;
  input_hash: string | null;
  input_payload: Record<string, unknown>;
  context_snapshot: Record<string, unknown> | null;
  output_payload: Record<string, unknown> | null;
  error_message: string | null;
  error_stack: Record<string, unknown> | null;
  model_provider: string | null;
  model_name: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  cost_usd: number | null;
  actor_user_id: string | null;
  created_at: string;
}

export interface AgentRunLatest {
  latest_log_id: string;
  org_id: string;
  patient_id: string | null;
  execution_id: string | null;
  run_id: string;
  parent_run_id: string | null;
  agent_type: AgentLog['agent_type'];
  harness_phase: number | null;
  event_type: AgentLog['event_type'];
  status: AgentLog['status'];
  skill_slug: string | null;
  skill_name: string | null;
  skill_version: string | null;
  skill_source: AgentLog['skill_source'];
  output_payload: Record<string, unknown> | null;
  error_message: string | null;
  model_provider: string | null;
  model_name: string | null;
  started_at: string;
  last_event_at: string;
  completed_at: string | null;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  event_count: number;
}

// Billing
export interface SubscriptionPlan {
  id: string;
  stripe_price_id: string;
  name: string;
  description: string | null;
  tier: 'starter' | 'professional' | 'enterprise';
  monthly_price: number;
  yearly_price: number;
  included_procedures: number;
  overage_price_per_procedure: number;
  features: string[];
  is_active: boolean;
  created_at: string;
}

export interface OrgSubscription {
  id: string;
  org_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string | null;
  plan_id: string;
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete';
  current_period_start: string | null;
  current_period_end: string | null;
  trial_start: string | null;
  trial_end: string | null;
  cancel_at_period_end: boolean;
  procedure_count_current_period: number;
  overage_charges_current_period: number;
  created_at: string;
  updated_at: string;
  plan?: SubscriptionPlan;
}

export interface Invoice {
  id: string;
  org_id: string;
  stripe_invoice_id: string | null;
  amount_due: number;
  amount_paid: number;
  status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';
  invoice_type: 'subscription' | 'overage';
  period_start: string | null;
  period_end: string | null;
  description: string | null;
  paid_at: string | null;
  created_at: string;
}
