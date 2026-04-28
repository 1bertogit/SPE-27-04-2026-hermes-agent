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
  modelProvider?: string;
  modelName?: string;
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
}

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

    const startTime = Date.now();
    const model = skillConfig?.model_config?.model || 'claude-sonnet-4-6';

    let output: Record<string, unknown> = {};
    let status: 'completed' | 'failed' = 'completed';
    let errorMessage: string | null = null;

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
        
        case 'HarnessRunner':
          throw new Error('HarnessRunner ainda não implementado nesta função');

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
