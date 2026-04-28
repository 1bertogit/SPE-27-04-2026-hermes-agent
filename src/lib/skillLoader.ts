import type { AISkill, AgentExecution } from './types';

export type SkillSource = 'system_db' | 'tenant_db';

export interface SkillResolutionInput {
  orgId: string;
  agentType: AgentExecution['agent_type'];
  skillSlug?: string;
  procedureType?: unknown;
  messageType?: unknown;
}

export interface ResolvedSkillBundle {
  skills: AISkill[];
  primarySkill: AISkill | null;
}

export interface AgentSkillConfig {
  name: string;
  slug: string;
  org_id: string | null;
  is_system: boolean;
  version: string;
  source: SkillSource;
  system_prompt: string;
  user_prompt_template?: string | null;
  model_config?: AISkill['model_config'];
}

const DEFAULT_SKILL_BY_AGENT: Partial<Record<AgentExecution['agent_type'], string>> = {
  MessageAgent: 'default-message-agent',
  ResponseAnalyzer: 'default-response-analyzer',
  DocumentGenerator: 'default-document-generator',
};

const MESSAGE_TYPE_SKILL_SLUG: Record<string, string> = {
  aui: 'aui',
  autorizacao_imagem: 'aui',
  contrato: 'contrato',
  consentimento: 'tci',
  first_contact: 'ficha_precadastro',
  indicacao: 'nps',
  lead: 'ficha_precadastro',
  nps: 'nps',
  pre_cadastro: 'ficha_precadastro',
  pre_operatorio: 'preparo_preoperatorio',
  preop: 'preparo_preoperatorio',
  precadastro: 'ficha_precadastro',
  preparacao_pre_operatoria: 'preparo_preoperatorio',
  preparo: 'preparo_preoperatorio',
  preparo_pre_operatorio: 'preparo_preoperatorio',
  primeiro_contato: 'ficha_precadastro',
  pesquisa_satisfacao: 'nps',
  satisfacao: 'nps',
  tci: 'tci',
};

export function resolveSkillBySlug(
  skills: AISkill[],
  slug: string,
  orgId: string,
  agentType?: AgentExecution['agent_type'],
): AISkill | null {
  const normalizedSlug = normalizeToken(slug);
  if (!normalizedSlug) return null;

  const candidates = skills
    .filter((skill) => skill.is_active)
    .filter((skill) => normalizeToken(skill.slug) === normalizedSlug)
    .filter((skill) => !agentType || skill.agent_type === agentType)
    .filter((skill) => isVisibleToOrg(skill, orgId))
    .sort((a, b) => compareSkillCandidate(a, b, orgId));

  return candidates[0] ?? null;
}

export function resolveSkillBundle(
  skills: AISkill[],
  input: SkillResolutionInput,
): ResolvedSkillBundle {
  if (input.agentType === 'HarnessRunner') {
    return { skills: [], primarySkill: null };
  }

  if (input.skillSlug) {
    const selected = resolveSkillBySlug(skills, input.skillSlug, input.orgId, input.agentType);
    return {
      skills: selected ? [selected] : [],
      primarySkill: selected,
    };
  }

  const selected: AISkill[] = [];
  const addSkillSlug = (slug: string | null | undefined) => {
    if (!slug) return;
    const skill = resolveSkillBySlug(skills, slug, input.orgId, input.agentType);
    if (!skill || selected.some((current) => current.slug === skill.slug)) return;
    selected.push(skill);
  };

  addSkillSlug(DEFAULT_SKILL_BY_AGENT[input.agentType]);

  if (input.agentType === 'MessageAgent') {
    addSkillSlug('protocolo_operacional');
    addProcedureSkill(skills, selected, input);
    addSkillSlug(resolveMessageTypeSkillSlug(input.messageType));
  }

  const primarySkill = selected[selected.length - 1] ?? null;
  return { skills: selected, primarySkill };
}

export function buildCompositeSkillConfig(bundle: ResolvedSkillBundle): AgentSkillConfig | null {
  if (bundle.skills.length === 0) return null;

  if (bundle.skills.length === 1) {
    const skill = bundle.skills[0];
    return {
      name: skill.name,
      slug: skill.slug,
      org_id: skill.org_id,
      is_system: skill.is_system,
      version: skill.skill_version ?? '1.0',
      source: getSkillSource(skill),
      system_prompt: skill.system_prompt,
      user_prompt_template: skill.user_prompt_template,
      model_config: skill.model_config,
    };
  }

  const hasTenantSkill = bundle.skills.some((skill) => !skill.is_system);
  const primarySkill = bundle.primarySkill ?? bundle.skills[bundle.skills.length - 1];
  const sections = bundle.skills.map(formatSkillPromptSection).join('\n\n---\n\n');

  return {
    name: bundle.skills.map((skill) => skill.name).join(' + '),
    slug: `bundle:${bundle.skills.map((skill) => skill.slug).join('+')}`,
    org_id: hasTenantSkill ? primarySkill.org_id : null,
    is_system: !hasTenantSkill,
    version: bundle.skills
      .map((skill) => `${skill.slug}@${skill.skill_version ?? '1.0'}`)
      .join('+'),
    source: hasTenantSkill ? 'tenant_db' : 'system_db',
    system_prompt: [
      'Voce e o MessageAgent do SPE-M.',
      'Use a hierarquia de skills abaixo como fonte obrigatoria.',
      'Quando houver conflito, a skill tenant prevalece sobre a skill de sistema de mesmo slug.',
      'Nao invente condutas clinicas, riscos, prazos ou documentos fora do conteudo recebido.',
      'Responda em portugues do Brasil, com tom profissional, claro e empatico.',
      '',
      sections,
    ].join('\n'),
    user_prompt_template: primarySkill.user_prompt_template,
    model_config: primarySkill.model_config,
  };
}

function addProcedureSkill(
  skills: AISkill[],
  selected: AISkill[],
  input: SkillResolutionInput,
): void {
  const procedureToken = normalizeToken(input.procedureType);
  if (!procedureToken) return;

  const matchingScopes = skills
    .filter((skill) => skill.is_active)
    .filter((skill) => skill.agent_type === input.agentType)
    .filter((skill) => isVisibleToOrg(skill, input.orgId))
    .filter((skill) => normalizeToken(skill.procedure_scope) === procedureToken)
    .sort((a, b) => compareSkillCandidate(a, b, input.orgId));

  const bestBySlug = new Map<string, AISkill>();
  for (const skill of matchingScopes) {
    if (!bestBySlug.has(skill.slug)) bestBySlug.set(skill.slug, skill);
  }

  for (const skill of bestBySlug.values()) {
    if (!selected.some((current) => current.slug === skill.slug)) selected.push(skill);
  }
}

function resolveMessageTypeSkillSlug(messageType: unknown): string | null {
  const token = normalizeToken(messageType);
  if (!token) return null;
  return MESSAGE_TYPE_SKILL_SLUG[token] ?? null;
}

function compareSkillCandidate(a: AISkill, b: AISkill, orgId: string): number {
  const aRank = getVisibilityRank(a, orgId);
  const bRank = getVisibilityRank(b, orgId);
  if (aRank !== bRank) return aRank - bRank;
  return (a.priority ?? 100) - (b.priority ?? 100);
}

function getVisibilityRank(skill: AISkill, orgId: string): number {
  if (!skill.is_system && skill.org_id === orgId) return 0;
  if (skill.is_system) return 1;
  return 2;
}

function isVisibleToOrg(skill: AISkill, orgId: string): boolean {
  return skill.is_system || skill.org_id === orgId;
}

function getSkillSource(skill: AISkill): SkillSource {
  return skill.is_system ? 'system_db' : 'tenant_db';
}

function formatSkillPromptSection(skill: AISkill): string {
  const lines = [
    `## Skill: ${skill.name}`,
    `slug: ${skill.slug}`,
    `version: ${skill.skill_version ?? '1.0'}`,
    `procedure_scope: ${skill.procedure_scope ?? 'all'}`,
  ];

  if (skill.task) lines.push(`task: ${skill.task}`);
  lines.push('', skill.system_prompt);

  if (skill.content_markdown) {
    lines.push('', '### Conteudo da skill', skill.content_markdown);
  }

  return lines.join('\n');
}

function normalizeToken(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return normalized.length > 0 ? normalized : null;
}
