import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.57.4';

type AgentType = 'HarnessRunner' | 'MessageAgent' | 'ResponseAnalyzer' | 'DocumentGenerator';
type AgentLogStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'skipped' | 'blocked';
type AgentLogEvent =
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
type SkillSource = 'system_file' | 'system_db' | 'tenant_db' | 'none';

interface ProcessAgentRequest {
  executionId: string;
  agentType: AgentType;
  skillConfig?: {
    name?: string;
    slug?: string;
    org_id?: string | null;
    is_system?: boolean;
    version?: string;
    source?: SkillSource;
    system_prompt: string;
    user_prompt_template?: string;
    model_config?: {
      model: string;
      temperature: number;
      max_tokens: number;
    };
  };
  input: Record<string, unknown>;
  modelConfig?: Record<string, unknown>;
}

interface AgentLogParams {
  execution: Record<string, unknown>;
  agentType: AgentType;
  eventType: AgentLogEvent;
  status: AgentLogStatus;
  harnessPhase?: number;
  skillConfig?: ProcessAgentRequest['skillConfig'];
  inputPayload?: Record<string, unknown>;
  contextSnapshot?: Record<string, unknown>;
  outputPayload?: Record<string, unknown>;
  errorMessage?: string | null;
  errorStack?: Record<string, unknown>;
  modelProvider?: string | null;
  modelName?: string | null;
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
}

interface HarnessPhaseResult {
  status: 'completed' | 'skipped' | 'blocked';
  output: Record<string, unknown>;
  errorMessage?: string | null;
}

interface HarnessPhaseRecord {
  phase: number;
  name: string;
  status: HarnessPhaseResult['status'] | 'failed';
  output: Record<string, unknown> | null;
  error_message: string | null;
}

interface HarnessContext {
  targetAgentType: Exclude<AgentType, 'HarnessRunner'>;
  dryRun: boolean;
  dispatchMode: string;
  patient: Record<string, unknown> | null;
  agentOutput: Record<string, unknown> | null;
  phaseRecords: HarnessPhaseRecord[];
}

const harnessPhaseNames: Record<number, string> = {
  1: 'intake',
  2: 'context_load',
  3: 'skill_load',
  4: 'guardrails',
  5: 'plan',
  6: 'agent_execution',
  7: 'dispatch',
  8: 'persist',
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { executionId, agentType, skillConfig, input } = await req.json() as ProcessAgentRequest;

    // Criar cliente com service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Buscar execução
    const { data: execution, error: execError } = await supabaseAdmin
      .from('agent_executions')
      .select('*')
      .eq('id', executionId)
      .single();

    if (execError || !execution) {
      throw new Error('Execução não encontrada');
    }

    // Verificar se já foi processada
    if (execution.status !== 'running') {
      return new Response(
        JSON.stringify({ message: 'Execução já processada' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let output: Record<string, unknown> = {};
    let status: 'completed' | 'failed' = 'completed';
    let errorMessage: string | null = null;
    const startTime = Date.now();
    const model = skillConfig?.model_config?.model || 'claude-sonnet-4-6';

    if (agentType === 'HarnessRunner') {
      const result = await processHarnessRunner(
        supabaseAdmin,
        execution,
        skillConfig,
        input,
        model,
        startTime,
      );

      return new Response(
        JSON.stringify({
          success: result.status === 'completed',
          executionId,
          output: result.output,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    await writeAgentLog(supabaseAdmin, {
      execution,
      agentType,
      eventType: 'phase_started',
      status: 'running',
      harnessPhase: 6,
      skillConfig,
      inputPayload: input,
      contextSnapshot: {
        execution_status: execution.status,
        parent_execution_id: execution.parent_execution_id ?? null,
        execution_chain: execution.execution_chain ?? null,
      },
      modelProvider: 'anthropic',
      modelName: model,
    });

    await writeAgentLog(supabaseAdmin, {
      execution,
      agentType,
      eventType: 'agent_started',
      status: 'running',
      harnessPhase: 6,
      skillConfig,
      contextSnapshot: {
        skill_slug: skillConfig?.slug ?? null,
        skill_source: resolveSkillSource(skillConfig),
      },
      modelProvider: 'anthropic',
      modelName: model,
    });

    try {
      // Processar baseado no tipo de agente
      switch (agentType) {
        case 'MessageAgent':
          output = await processMessageAgent(skillConfig, input, model);
          break;
        
        case 'ResponseAnalyzer':
          output = await processResponseAnalyzer(skillConfig, input, model);
          break;
        
        case 'DocumentGenerator':
          output = await processDocumentGenerator(skillConfig, input, model);
          break;

        default:
          throw new Error(`Tipo de agente desconhecido: ${agentType}`);
      }
    } catch (processError) {
      status = 'failed';
      errorMessage = processError instanceof Error ? processError.message : 'Erro desconhecido';
    }

    // Calcular tokens (estimativa simplificada)
    const inputTokens = JSON.stringify(input).length / 4;
    const outputTokens = JSON.stringify(output).length / 4;
    const costUsd = (inputTokens + outputTokens) * 0.000003; // ~$3/million tokens

    await writeAgentLog(supabaseAdmin, {
      execution,
      agentType,
      eventType: status === 'completed' ? 'phase_completed' : 'phase_failed',
      status,
      harnessPhase: 6,
      skillConfig,
      outputPayload: output,
      errorMessage,
      modelProvider: 'anthropic',
      modelName: model,
    });

    await writeAgentLog(supabaseAdmin, {
      execution,
      agentType,
      eventType: status === 'completed' ? 'agent_completed' : 'agent_failed',
      status,
      harnessPhase: 6,
      skillConfig,
      outputPayload: output,
      errorMessage,
      modelProvider: 'anthropic',
      modelName: model,
      inputTokens: Math.round(inputTokens),
      outputTokens: Math.round(outputTokens),
      costUsd,
    });

    // Atualizar execução
    const { error: updateError } = await supabaseAdmin
      .from('agent_executions')
      .update({
        status,
        output_payload: output,
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
        input_tokens: Math.round(inputTokens),
        output_tokens: Math.round(outputTokens),
        cost_usd: costUsd,
        error_message: errorMessage
      })
      .eq('id', executionId);

    if (updateError) {
      await writeAgentLog(supabaseAdmin, {
        execution,
        agentType,
        eventType: 'run_failed',
        status: 'failed',
        harnessPhase: 8,
        skillConfig,
        outputPayload: output,
        errorMessage: updateError.message,
        modelProvider: 'anthropic',
        modelName: model,
      });
      throw new Error(updateError.message);
    }

    return new Response(
      JSON.stringify({ 
        success: status === 'completed',
        executionId,
        output 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro interno' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function processHarnessRunner(
  supabaseAdmin: SupabaseClient<any>,
  execution: Record<string, unknown>,
  skillConfig: ProcessAgentRequest['skillConfig'],
  input: Record<string, unknown>,
  model: string,
  startTime: number,
): Promise<{ status: 'completed' | 'failed'; output: Record<string, unknown> }> {
  const context: HarnessContext = {
    targetAgentType: resolveHarnessTargetAgentType(input.target_agent_type),
    dryRun: input.execute_agent !== true,
    dispatchMode: asString(input.dispatch_mode) ?? 'draft',
    patient: null,
    agentOutput: null,
    phaseRecords: [],
  };

  let status: 'completed' | 'failed' = 'completed';
  let errorMessage: string | null = null;

  await writeAgentLog(supabaseAdmin, {
    execution,
    agentType: 'HarnessRunner',
    eventType: 'run_started',
    status: 'running',
    inputPayload: input,
    contextSnapshot: {
      target_agent_type: context.targetAgentType,
      dry_run: context.dryRun,
      dispatch_mode: context.dispatchMode,
    },
    modelProvider: context.dryRun ? null : 'anthropic',
    modelName: context.dryRun ? null : model,
  });

  try {
    await runHarnessPhase(supabaseAdmin, execution, skillConfig, input, context, 1, async () => ({
      status: 'completed',
      output: {
        execution_id: execution.id,
        org_id: execution.org_id,
        patient_id: execution.patient_id ?? null,
        target_agent_type: context.targetAgentType,
        dry_run: context.dryRun,
      },
    }));

    await runHarnessPhase(supabaseAdmin, execution, skillConfig, input, context, 2, async () => {
      const patientId = asNullableString(execution.patient_id);
      if (!patientId) {
        return { status: 'skipped', output: { reason: 'Sem patient_id na execucao' } };
      }

      const { data, error } = await supabaseAdmin
        .from('patients')
        .select('id, full_name, workflow_status, procedure_type, org_id')
        .eq('id', patientId)
        .single();

      if (error || !data) throw new Error(error?.message ?? 'Paciente nao encontrado');

      context.patient = data;
      return {
        status: 'completed',
        output: {
          patient_id: data.id,
          workflow_status: data.workflow_status ?? null,
          procedure_type: data.procedure_type ?? null,
        },
      };
    });

    await runHarnessPhase(supabaseAdmin, execution, skillConfig, input, context, 3, async () => {
      if (!skillConfig) {
        return {
          status: 'skipped',
          output: { reason: 'Nenhuma skill resolvida para o agente alvo' },
        };
      }

      return {
        status: 'completed',
        output: {
          skill_slug: skillConfig.slug ?? null,
          skill_name: skillConfig.name ?? null,
          skill_version: skillConfig.version ?? null,
          skill_source: resolveSkillSource(skillConfig),
        },
      };
    });

    await runHarnessPhase(supabaseAdmin, execution, skillConfig, input, context, 4, async () => {
      const blockedReasons: string[] = [];
      if (context.targetAgentType === 'MessageAgent' && !skillConfig) {
        blockedReasons.push('MessageAgent exige skill carregada');
      }
      if (context.dispatchMode !== 'draft' && context.dispatchMode !== 'manual_review') {
        blockedReasons.push('dispatch_mode automatico ainda nao habilitado');
      }

      if (blockedReasons.length > 0) {
        return {
          status: 'blocked',
          output: { blocked_reasons: blockedReasons },
          errorMessage: blockedReasons.join('; '),
        };
      }

      return {
        status: 'completed',
        output: {
          guardrails: ['skill_required_for_message_agent', 'manual_dispatch_only'],
          dispatch_mode: context.dispatchMode,
        },
      };
    });

    const guardrailRecord = context.phaseRecords.find((phase) => phase.phase === 4);
    if (guardrailRecord?.status === 'blocked') {
      throw new Error(guardrailRecord.error_message ?? 'HarnessRunner bloqueado por guardrail');
    }

    await runHarnessPhase(supabaseAdmin, execution, skillConfig, input, context, 5, async () => ({
      status: 'completed',
      output: {
        target_agent_type: context.targetAgentType,
        will_execute_agent: !context.dryRun,
        will_dispatch: context.dispatchMode !== 'draft',
        next_phase: context.dryRun ? 'persist' : 'agent_execution',
      },
    }));

    await runHarnessPhase(supabaseAdmin, execution, skillConfig, input, context, 6, async () => {
      if (context.dryRun) {
        return {
          status: 'skipped',
          output: {
            reason: 'execute_agent diferente de true; HarnessRunner registrou plano sem chamar modelo',
          },
        };
      }

      await writeAgentLog(supabaseAdmin, {
        execution,
        agentType: context.targetAgentType,
        eventType: 'agent_started',
        status: 'running',
        harnessPhase: 6,
        skillConfig,
        modelProvider: 'anthropic',
        modelName: model,
      });

      try {
        context.agentOutput = await runTargetAgent(context.targetAgentType, skillConfig, input, model);

        await writeAgentLog(supabaseAdmin, {
          execution,
          agentType: context.targetAgentType,
          eventType: 'agent_completed',
          status: 'completed',
          harnessPhase: 6,
          skillConfig,
          outputPayload: context.agentOutput,
          modelProvider: 'anthropic',
          modelName: model,
        });

        return { status: 'completed', output: context.agentOutput };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro desconhecido ao executar agente alvo';
        await writeAgentLog(supabaseAdmin, {
          execution,
          agentType: context.targetAgentType,
          eventType: 'agent_failed',
          status: 'failed',
          harnessPhase: 6,
          skillConfig,
          errorMessage: message,
          modelProvider: 'anthropic',
          modelName: model,
        });
        throw error;
      }
    });

    await runHarnessPhase(supabaseAdmin, execution, skillConfig, input, context, 7, async () => {
      if (context.dispatchMode === 'draft') {
        return {
          status: 'skipped',
          output: { reason: 'Modo draft: sem disparo automatico' },
        };
      }

      return {
        status: 'skipped',
        output: {
          reason: 'Dispatch manual_review registrado; envio automatico deve ser aprovado em etapa posterior',
        },
      };
    });

    await runHarnessPhase(supabaseAdmin, execution, skillConfig, input, context, 8, async () => ({
      status: 'completed',
      output: {
        final_status: 'completed',
        phase_count: context.phaseRecords.length + 1,
      },
    }));
  } catch (error) {
    status = 'failed';
    errorMessage = error instanceof Error ? error.message : 'Erro desconhecido no HarnessRunner';
  }

  const output = {
    harness: {
      target_agent_type: context.targetAgentType,
      dry_run: context.dryRun,
      dispatch_mode: context.dispatchMode,
      phases: context.phaseRecords,
    },
    agent_output: context.agentOutput,
  };

  const inputTokens = Math.round(JSON.stringify(input).length / 4);
  const outputTokens = Math.round(JSON.stringify(output).length / 4);
  const costUsd = context.dryRun ? 0 : (inputTokens + outputTokens) * 0.000003;

  await writeAgentLog(supabaseAdmin, {
    execution,
    agentType: 'HarnessRunner',
    eventType: status === 'completed' ? 'run_completed' : 'run_failed',
    status,
    harnessPhase: 8,
    skillConfig,
    outputPayload: output,
    errorMessage,
    modelProvider: context.dryRun ? null : 'anthropic',
    modelName: context.dryRun ? null : model,
    inputTokens,
    outputTokens,
    costUsd,
  });

  const { error: updateError } = await supabaseAdmin
    .from('agent_executions')
    .update({
      status,
      output_payload: output,
      completed_at: new Date().toISOString(),
      duration_ms: Date.now() - startTime,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost_usd: costUsd,
      error_message: errorMessage,
      harness_phase: 8,
      harness_status: status,
    })
    .eq('id', asString(execution.id));

  if (updateError) throw new Error(updateError.message);

  return { status, output };
}

async function runHarnessPhase(
  supabaseAdmin: SupabaseClient<any>,
  execution: Record<string, unknown>,
  skillConfig: ProcessAgentRequest['skillConfig'],
  input: Record<string, unknown>,
  context: HarnessContext,
  phase: number,
  run: () => Promise<HarnessPhaseResult>,
): Promise<void> {
  const name = harnessPhaseNames[phase] ?? `phase_${phase}`;

  await writeAgentLog(supabaseAdmin, {
    execution,
    agentType: 'HarnessRunner',
    eventType: 'phase_started',
    status: 'running',
    harnessPhase: phase,
    skillConfig,
    contextSnapshot: {
      phase_name: name,
      target_agent_type: context.targetAgentType,
      dry_run: context.dryRun,
    },
  });

  try {
    const result = await run();
    const eventType: AgentLogEvent = result.status === 'skipped'
      ? 'phase_skipped'
      : result.status === 'blocked'
        ? 'guardrail_blocked'
        : 'phase_completed';

    await writeAgentLog(supabaseAdmin, {
      execution,
      agentType: 'HarnessRunner',
      eventType,
      status: result.status,
      harnessPhase: phase,
      skillConfig,
      inputPayload: phase === 1 ? input : undefined,
      outputPayload: result.output,
      errorMessage: result.errorMessage ?? null,
      contextSnapshot: { phase_name: name },
    });

    context.phaseRecords.push({
      phase,
      name,
      status: result.status,
      output: result.output,
      error_message: result.errorMessage ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    await writeAgentLog(supabaseAdmin, {
      execution,
      agentType: 'HarnessRunner',
      eventType: 'phase_failed',
      status: 'failed',
      harnessPhase: phase,
      skillConfig,
      errorMessage: message,
      contextSnapshot: { phase_name: name },
    });

    context.phaseRecords.push({
      phase,
      name,
      status: 'failed',
      output: null,
      error_message: message,
    });
    throw error;
  }
}

async function writeAgentLog(
  supabaseAdmin: SupabaseClient<any>,
  params: AgentLogParams
): Promise<void> {
  const executionId = asString(params.execution.id);
  const orgId = asString(params.execution.org_id);

  if (!executionId || !orgId) {
    throw new Error('Execução sem id/org_id para agent_logs');
  }

  const inputPayload = params.inputPayload ?? {};
  const { error } = await supabaseAdmin.from('agent_logs').insert({
    org_id: orgId,
    patient_id: asNullableString(params.execution.patient_id),
    execution_id: executionId,
    run_id: executionId,
    parent_run_id: asNullableString(params.execution.parent_execution_id),
    agent_type: params.agentType,
    harness_phase: params.harnessPhase ?? null,
    event_type: params.eventType,
    status: params.status,
    skill_slug: params.skillConfig?.slug ?? null,
    skill_name: params.skillConfig?.name ?? null,
    skill_version: params.skillConfig?.version ?? null,
    skill_source: resolveSkillSource(params.skillConfig),
    input_hash: Object.keys(inputPayload).length > 0 ? await sha256Hex(inputPayload) : null,
    input_payload: inputPayload,
    context_snapshot: params.contextSnapshot ?? null,
    output_payload: params.outputPayload ?? null,
    error_message: params.errorMessage ?? null,
    error_stack: params.errorStack ?? null,
    model_provider: params.modelProvider ?? null,
    model_name: params.modelName ?? null,
    input_tokens: params.inputTokens ?? null,
    output_tokens: params.outputTokens ?? null,
    cost_usd: params.costUsd ?? null,
    actor_user_id: asNullableString(params.inputPayload?.actor_user_id),
  });

  if (error) throw error;
}

function resolveSkillSource(skillConfig?: ProcessAgentRequest['skillConfig']): SkillSource {
  if (!skillConfig) return 'none';
  if (skillConfig.source) return skillConfig.source;
  if (skillConfig.is_system) return 'system_db';
  if (skillConfig.org_id) return 'tenant_db';
  return 'system_db';
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function asNullableString(value: unknown): string | null {
  return asString(value);
}

async function sha256Hex(value: unknown): Promise<string> {
  const encoded = new TextEncoder().encode(stableJson(value));
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
    .join(',')}}`;
}

function resolveHarnessTargetAgentType(value: unknown): Exclude<AgentType, 'HarnessRunner'> {
  if (value === 'ResponseAnalyzer' || value === 'DocumentGenerator') return value;
  return 'MessageAgent';
}

async function runTargetAgent(
  agentType: Exclude<AgentType, 'HarnessRunner'>,
  skillConfig: ProcessAgentRequest['skillConfig'],
  input: Record<string, unknown>,
  model: string,
): Promise<Record<string, unknown>> {
  switch (agentType) {
    case 'MessageAgent':
      return processMessageAgent(skillConfig, input, model);
    case 'ResponseAnalyzer':
      return processResponseAnalyzer(skillConfig, input, model);
    case 'DocumentGenerator':
      return processDocumentGenerator(skillConfig, input, model);
  }
}

async function processMessageAgent(
  skillConfig: ProcessAgentRequest['skillConfig'],
  input: Record<string, unknown>,
  model: string
): Promise<Record<string, unknown>> {
  const systemPrompt = skillConfig?.system_prompt || 'Você é um assistente médico.';
  
  // Template substitution
  let userPrompt = skillConfig?.user_prompt_template || 
    'Gere uma mensagem para o contexto fornecido.';
  
  // Substituir variáveis {{key}}
  Object.entries(input).forEach(([key, value]) => {
    userPrompt = userPrompt.replace(
      new RegExp(`{{${key}}}`, 'g'),
      String(value)
    );
  });

  const message = await callClaudeAPI(systemPrompt, userPrompt, model);
  
  return {
    message,
    tone: 'empathetic',
    suggested_actions: ['send_whatsapp', 'schedule_followup']
  };
}

async function processResponseAnalyzer(
  skillConfig: ProcessAgentRequest['skillConfig'],
  input: Record<string, unknown>,
  model: string
): Promise<Record<string, unknown>> {
  const systemPrompt = skillConfig?.system_prompt || 
    'Analise a resposta do paciente e retorne JSON estruturado.';
  
  const userPrompt = `Resposta do paciente: "${input.patient_message || input.message}"
  
Analise e retorne JSON com:
{
  "sentiment": "positive|neutral|negative",
  "urgency": "normal|urgent|critical",
  "intent": "gratitude|question|complaint|alert",
  "topics": ["topic1", "topic2"],
  "suggested_action": "none|create_alert|escalate|schedule",
  "confidence": 0.0-1.0
}`;

  const analysis = await callClaudeAPI(systemPrompt, userPrompt, model);
  
  try {
    return JSON.parse(analysis);
  } catch {
    return {
      sentiment: 'neutral',
      urgency: 'normal',
      intent: 'question',
      topics: [],
      suggested_action: 'none',
      confidence: 0.5,
      raw_response: analysis
    };
  }
}

async function processDocumentGenerator(
  skillConfig: ProcessAgentRequest['skillConfig'],
  input: Record<string, unknown>,
  model: string
): Promise<Record<string, unknown>> {
  const systemPrompt = skillConfig?.system_prompt || 
    'Gere Termos de Consentimento Informado claros e completos.';
  
  const procedure = input.procedure_name || input.procedure || 'procedimento';
  
  const userPrompt = `Gere um TCI para: ${procedure}

Dados do paciente:
- Idade: ${input.patient_age || 'N/A'}
- Sexo: ${input.patient_gender || 'N/A'}
- Comorbidades: ${input.comorbidities || 'Nenhuma'}
- Medicações: ${input.medications || 'Nenhuma'}
- Score SPE-M: ${input.spem_score || 'N/A'}

Estrutura requerida:
1. Título do procedimento
2. Descrição simplificada
3. Riscos específicos ao perfil
4. Alternativas
5. Campo para assinatura`;

  const document = await callClaudeAPI(systemPrompt, userPrompt, model);
  
  return {
    document,
    type: 'TCI',
    procedure,
    requires_signature: true,
    estimated_read_time: Math.ceil(document.length / 200)
  };
}

async function callClaudeAPI(
  systemPrompt: string,
  userPrompt: string,
  model: string
): Promise<string> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY não configurada para process-agent');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  const body = await response.json();
  if (!response.ok || body.error) {
    throw new Error(body.error?.message ?? 'Erro ao chamar Anthropic API');
  }

  const textBlock = body.content?.find((block: { type?: string; text?: string }) => block.type === 'text');
  if (!textBlock?.text) {
    throw new Error('Anthropic API retornou resposta sem texto');
  }

  return textBlock.text;
}
