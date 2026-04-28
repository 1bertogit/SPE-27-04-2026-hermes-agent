export type ResponseSentiment = 'positive' | 'neutral' | 'negative';
export type ResponseUrgency = 'normal' | 'urgent' | 'critical';
export type ResponseIntent = 'gratitude' | 'question' | 'complaint' | 'alert';
export type SuggestedAction = 'none' | 'reply_with_guidance' | 'create_alert' | 'escalate_to_doctor' | 'schedule_followup';

export interface ResponseAnalysisInput {
  message: string;
  messageContext?: unknown;
}

export interface ResponseAnalysisResult {
  sentiment: ResponseSentiment;
  urgency: ResponseUrgency;
  intent: ResponseIntent;
  topics: string[];
  suggested_action: SuggestedAction;
  confidence: number;
  clinical_guardrail: {
    blocked: boolean;
    severity: 'none' | 'monitor' | 'urgent' | 'critical';
    keyword: string | null;
    reason: string | null;
    require_human_review: boolean;
    automated_response_allowed: boolean;
  };
  matched_keywords: string[];
  normalized_message: string;
  response_source: 'deterministic_v1';
}

const CRITICAL_PHRASES: readonly [string, string][] = [
  ['nao consigo fechar o olho', 'não consigo fechar o olho'],
  ['inchaco muito grande', 'inchaço muito grande'],
  ['abriu a cirurgia', 'abriu a cirurgia'],
  ['perdendo sensacao', 'perdendo sensação'],
  ['febre alta', 'febre alta'],
  ['dor forte', 'dor forte'],
  ['falta de ar', 'falta de ar'],
  ['pele azulada', 'pele azulada'],
  ['edema agudo', 'edema agudo'],
];

const CRITICAL_WORDS: readonly [string, string][] = [
  ['sangramento', 'sangramento'],
  ['sangrando', 'sangrando'],
  ['hematoma', 'hematoma'],
  ['secrecao', 'secreção'],
  ['paralisia', 'paralisia'],
  ['sangue', 'sangue'],
  ['febre', 'febre'],
  ['pus', 'pus'],
  ['abertura', 'abertura'],
  ['hemorragia', 'hemorragia'],
  ['desmaio', 'desmaio'],
  ['convulsao', 'convulsão'],
  ['infeccao', 'infecção'],
  ['necrose', 'necrose'],
  ['cianose', 'cianose'],
  ['isquemia', 'isquemia'],
  ['choque', 'choque'],
  ['taquicardia', 'taquicardia'],
  ['taquipneia', 'taquipneia'],
  ['hipotensao', 'hipotensão'],
];

const URGENT_TERMS: readonly [string, string][] = [
  ['dor', 'dor'],
  ['inchaco', 'inchaço'],
  ['vomito', 'vômito'],
  ['vomitando', 'vomitando'],
  ['nausea', 'náusea'],
  ['tontura', 'tontura'],
  ['ardencia', 'ardência'],
  ['vermelhiao', 'vermelhidão'],
  ['drenando', 'drenando'],
];

const GRATITUDE_TERMS = ['obrigado', 'obrigada', 'agradeco', 'grato', 'perfeito', 'otimo', 'excelente', 'melhorou'];
const COMPLAINT_TERMS = ['ruim', 'pessimo', 'demora', 'ninguem responde', 'insatisfeito', 'reclamacao', 'chateado'];
const QUESTION_TERMS = ['?', 'como', 'quando', 'posso', 'devo', 'e normal', 'preciso', 'qual'];

export function analyzePatientResponse(input: ResponseAnalysisInput): ResponseAnalysisResult {
  const message = input.message ?? '';
  const normalized = normalizeForMatch(message);
  const criticalMatches = findMatches(normalized, CRITICAL_PHRASES, CRITICAL_WORDS);
  const urgentMatches = findMatches(normalized, [], URGENT_TERMS);
  const topics = inferTopics(normalized, criticalMatches, urgentMatches);

  const urgency: ResponseUrgency = criticalMatches.length > 0
    ? 'critical'
    : urgentMatches.length > 0
      ? 'urgent'
      : 'normal';
  const intent = inferIntent(normalized, urgency);
  const sentiment = inferSentiment(normalized, urgency, intent);
  const suggestedAction = inferSuggestedAction(urgency, intent);
  const clinicalSeverity = urgency === 'critical' ? 'critical' : urgency === 'urgent' ? 'urgent' : 'none';
  const clinicalKeyword = criticalMatches[0] ?? urgentMatches[0] ?? null;
  const clinicalBlock = urgency !== 'normal';

  return {
    sentiment,
    urgency,
    intent,
    topics,
    suggested_action: suggestedAction,
    confidence: calculateConfidence(message, urgency, intent, criticalMatches, urgentMatches),
    clinical_guardrail: {
      blocked: clinicalBlock,
      severity: clinicalSeverity,
      keyword: clinicalKeyword,
      reason: clinicalBlock ? buildGuardrailReason(urgency, clinicalKeyword) : null,
      require_human_review: clinicalBlock,
      automated_response_allowed: !clinicalBlock,
    },
    matched_keywords: [...criticalMatches, ...urgentMatches],
    normalized_message: normalized,
    response_source: 'deterministic_v1',
  };
}

function inferIntent(normalized: string, urgency: ResponseUrgency): ResponseIntent {
  if (urgency !== 'normal') return 'alert';
  if (hasAny(normalized, COMPLAINT_TERMS)) return 'complaint';
  if (hasAny(normalized, QUESTION_TERMS)) return 'question';
  if (hasAny(normalized, GRATITUDE_TERMS)) return 'gratitude';
  return 'question';
}

function inferSentiment(normalized: string, urgency: ResponseUrgency, intent: ResponseIntent): ResponseSentiment {
  if (urgency !== 'normal' || intent === 'complaint') return 'negative';
  if (intent === 'gratitude' || hasAny(normalized, GRATITUDE_TERMS)) return 'positive';
  return 'neutral';
}

function inferSuggestedAction(urgency: ResponseUrgency, intent: ResponseIntent): SuggestedAction {
  if (urgency === 'critical') return 'escalate_to_doctor';
  if (urgency === 'urgent') return 'create_alert';
  if (intent === 'complaint') return 'schedule_followup';
  if (intent === 'question') return 'reply_with_guidance';
  return 'none';
}

function inferTopics(normalized: string, criticalMatches: string[], urgentMatches: string[]): string[] {
  const topics = new Set<string>();
  for (const match of criticalMatches) topics.add(match);
  for (const match of urgentMatches) topics.add(match);
  if (hasAny(normalized, ['retorno', 'consulta', 'agenda', 'horario'])) topics.add('agendamento');
  if (hasAny(normalized, ['remedio', 'medicacao', 'antibiotico', 'analgesico'])) topics.add('medicação');
  if (hasAny(normalized, ['curativo', 'ponto', 'incisao', 'ferida'])) topics.add('curativo');
  if (hasAny(normalized, ['foto', 'imagem', 'resultado'])) topics.add('imagem');
  if (topics.size === 0) topics.add('mensagem geral');
  return [...topics];
}

function calculateConfidence(
  message: string,
  urgency: ResponseUrgency,
  intent: ResponseIntent,
  criticalMatches: string[],
  urgentMatches: string[],
): number {
  let confidence = message.trim().length >= 12 ? 0.65 : 0.45;
  if (criticalMatches.length > 0) confidence += 0.25;
  if (urgentMatches.length > 0) confidence += 0.15;
  if (urgency !== 'normal') confidence += 0.05;
  if (intent !== 'question') confidence += 0.05;
  return Math.min(0.95, Number(confidence.toFixed(2)));
}

function buildGuardrailReason(urgency: ResponseUrgency, keyword: string | null): string {
  if (urgency === 'critical') {
    return `Resposta contem sinal clinico critico${keyword ? `: ${keyword}` : ''}. Escalar para medico antes de resposta automatica.`;
  }
  return `Resposta contem sintoma que exige revisao humana${keyword ? `: ${keyword}` : ''}.`;
}

function findMatches(
  normalized: string,
  phrases: readonly [string, string][],
  words: readonly [string, string][],
): string[] {
  const matches: string[] = [];
  for (const [key, display] of phrases) {
    if (normalized.includes(key)) matches.push(display);
  }

  const sortedWords = [...words].sort((a, b) => b[0].length - a[0].length);
  for (const [key, display] of sortedWords) {
    const re = new RegExp(`(^|[^a-z0-9])${escapeRegExp(key)}([^a-z0-9]|$)`);
    if (re.test(normalized) && !matches.includes(display)) matches.push(display);
  }

  return matches;
}

function hasAny(normalized: string, terms: readonly string[]): boolean {
  return terms.some((term) => normalized.includes(term));
}

function normalizeForMatch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
