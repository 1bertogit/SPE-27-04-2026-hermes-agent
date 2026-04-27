import { createClient } from '@supabase/supabase-js';

interface ProcessAgentRequest {
  executionId: string;
  agentType: 'MessageAgent' | 'ResponseAnalyzer' | 'DocumentGenerator';
  skillConfig?: {
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

    // Atualizar execução
    await supabaseAdmin
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

  // Chamar Claude API (simulado - em produção usar API real)
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

// Função mock da API Claude - em produção, conectar com API real
async function callClaudeAPI(
  systemPrompt: string,
  userPrompt: string,
  model: string
): Promise<string> {
  // Simulação de resposta
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return `[Resposta gerada por ${model}]

${systemPrompt.slice(0, 50)}...

Para: ${userPrompt.slice(0, 100)}...

Esta é uma resposta simulada. Em produção, conecte com a API da Anthropic.`;
}
