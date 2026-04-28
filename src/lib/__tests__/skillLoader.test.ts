import { describe, expect, it } from 'vitest';
import {
  buildCompositeSkillConfig,
  resolveSkillBundle,
  resolveSkillBySlug,
} from '../skillLoader';
import type { AISkill } from '../types';

const ORG_ID = 'org-1';

function makeSkill(overrides: Partial<AISkill>): AISkill {
  return {
    id: overrides.id ?? `skill-${overrides.slug}`,
    org_id: overrides.org_id ?? null,
    is_system: overrides.is_system ?? true,
    parent_skill_id: null,
    name: overrides.name ?? String(overrides.slug),
    slug: overrides.slug ?? 'default-message-agent',
    description: null,
    skill_version: overrides.skill_version ?? '1.0',
    procedure_scope: overrides.procedure_scope ?? 'all',
    task: overrides.task ?? null,
    content_markdown: overrides.content_markdown ?? null,
    source_kind: overrides.source_kind ?? 'system_seed',
    agent_type: overrides.agent_type ?? 'MessageAgent',
    system_prompt: overrides.system_prompt ?? `Prompt ${overrides.slug}`,
    user_prompt_template: overrides.user_prompt_template ?? 'Mensagem {{message_type}}',
    model_config: overrides.model_config ?? {
      model: 'claude-sonnet-4-6',
      temperature: 0.7,
      max_tokens: 2048,
    },
    available_tools: [],
    output_schema: null,
    auto_trigger: null,
    is_active: overrides.is_active ?? true,
    priority: overrides.priority ?? 100,
    created_by: null,
    created_at: '2026-04-28T00:00:00.000Z',
    updated_at: '2026-04-28T00:00:00.000Z',
    ...overrides,
  };
}

describe('resolveSkillBySlug', () => {
  it('prioriza skill tenant sobre skill de sistema com o mesmo slug', () => {
    const system = makeSkill({ slug: 'nps', is_system: true, name: 'NPS sistema' });
    const tenant = makeSkill({
      slug: 'nps',
      is_system: false,
      org_id: ORG_ID,
      name: 'NPS tenant',
      source_kind: 'tenant_override',
    });

    expect(resolveSkillBySlug([system, tenant], 'nps', ORG_ID)?.name).toBe('NPS tenant');
  });

  it('usa skill de sistema quando nao ha override tenant', () => {
    const system = makeSkill({ slug: 'preparo_preoperatorio', is_system: true });

    expect(resolveSkillBySlug([system], 'preparo_preoperatorio', ORG_ID)).toBe(system);
  });

  it('ignora skill tenant de outra organizacao', () => {
    const system = makeSkill({ slug: 'contrato', is_system: true, name: 'Contrato sistema' });
    const otherTenant = makeSkill({
      slug: 'contrato',
      is_system: false,
      org_id: 'org-2',
      name: 'Contrato outra org',
      source_kind: 'tenant_override',
    });

    expect(resolveSkillBySlug([otherTenant, system], 'contrato', ORG_ID)?.name).toBe('Contrato sistema');
  });
});

describe('resolveSkillBundle', () => {
  it('monta bundle do MessageAgent com default, protocolo, procedimento e tipo de mensagem', () => {
    const skills = [
      makeSkill({ slug: 'default-message-agent', priority: 10 }),
      makeSkill({ slug: 'protocolo_operacional', priority: 20 }),
      makeSkill({ slug: 'deep_neck', procedure_scope: 'deep_neck', priority: 30 }),
      makeSkill({ slug: 'nps', priority: 40 }),
    ];

    const bundle = resolveSkillBundle(skills, {
      orgId: ORG_ID,
      agentType: 'MessageAgent',
      procedureType: 'Deep Neck',
      messageType: 'pesquisa_satisfacao',
    });

    expect(bundle.skills.map((skill) => skill.slug)).toEqual([
      'default-message-agent',
      'protocolo_operacional',
      'deep_neck',
      'nps',
    ]);
    expect(bundle.primarySkill?.slug).toBe('nps');
  });

  it('deduplica slugs e preserva override tenant no bundle', () => {
    const systemProtocol = makeSkill({
      slug: 'protocolo_operacional',
      is_system: true,
      name: 'Protocolo sistema',
    });
    const tenantProtocol = makeSkill({
      slug: 'protocolo_operacional',
      is_system: false,
      org_id: ORG_ID,
      name: 'Protocolo tenant',
      source_kind: 'tenant_override',
    });

    const bundle = resolveSkillBundle([
      makeSkill({ slug: 'default-message-agent' }),
      systemProtocol,
      tenantProtocol,
    ], {
      orgId: ORG_ID,
      agentType: 'MessageAgent',
    });

    expect(bundle.skills.filter((skill) => skill.slug === 'protocolo_operacional')).toHaveLength(1);
    expect(bundle.skills.find((skill) => skill.slug === 'protocolo_operacional')?.name).toBe('Protocolo tenant');
  });
});

describe('buildCompositeSkillConfig', () => {
  it('gera configuracao composta com fonte tenant quando ha qualquer override tenant', () => {
    const bundle = {
      skills: [
        makeSkill({ slug: 'default-message-agent', is_system: true }),
        makeSkill({
          slug: 'protocolo_operacional',
          is_system: false,
          org_id: ORG_ID,
          source_kind: 'tenant_override',
          content_markdown: 'Conteudo tenant',
        }),
      ],
      primarySkill: makeSkill({
        slug: 'protocolo_operacional',
        is_system: false,
        org_id: ORG_ID,
        source_kind: 'tenant_override',
      }),
    };

    const config = buildCompositeSkillConfig(bundle);

    expect(config?.source).toBe('tenant_db');
    expect(config?.slug).toBe('bundle:default-message-agent+protocolo_operacional');
    expect(config?.system_prompt).toContain('Conteudo tenant');
  });
});
