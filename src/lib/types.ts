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
