import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './authStore';
import { buildCompositeSkillConfig, resolveSkillBundle } from '../lib/skillLoader';
import type { AISkill, AgentExecution } from '../lib/types';

type SkillBackedAgentType = AISkill['agent_type'];

interface AIAgentState {
  skills: AISkill[];
  executions: AgentExecution[];
  metrics: {
    totalExecutions: number;
    completed: number;
    failed: number;
    avgDuration: number;
    totalCost: number;
  } | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchSkills: () => Promise<void>;
  fetchExecutions: (limit?: number) => Promise<void>;
  fetchMetrics: () => Promise<void>;
  createSkill: (skill: Partial<AISkill>) => Promise<AISkill | null>;
  updateSkill: (id: string, updates: Partial<AISkill>) => Promise<boolean>;
  deleteSkill: (id: string) => Promise<boolean>;
  executeAgent: (params: {
    agentType: AgentExecution['agent_type'];
    skillSlug?: string;
    patientId?: string;
    input: Record<string, unknown>;
    parentExecutionId?: string;
  }) => Promise<AgentExecution | null>;
  cancelExecution: (executionId: string) => Promise<boolean>;
  getExecutionStatus: (executionId: string) => Promise<AgentExecution | null>;
}

export const useAIAgentStore = create<AIAgentState>((set, get) => ({
  skills: [],
  executions: [],
  metrics: null,
  loading: false,
  error: null,

  fetchSkills: async () => {
    set({ loading: true, error: null });
    const { data, error } = await supabase
      .from('ai_skills')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: true });
    
    if (error) {
      set({ error: error.message, loading: false });
    } else {
      set({ skills: data || [], loading: false });
    }
  },

  fetchExecutions: async (limit = 50) => {
    set({ loading: true, error: null });
    const { data, error } = await supabase
      .from('agent_executions')
      .select(`
        *,
        patient:patient_id (full_name)
      `)
      .order('started_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      set({ error: error.message, loading: false });
    } else {
      set({ executions: data || [], loading: false });
    }
  },

  fetchMetrics: async () => {
    set({ loading: true, error: null });
    const { data, error } = await supabase
      .from('agent_metrics')
      .select('*')
      .order('date', { ascending: false })
      .limit(30);
    
    if (error) {
      set({ error: error.message, loading: false });
      return;
    }

    const totals = data?.reduce((acc, day) => ({
      totalExecutions: acc.totalExecutions + day.total_executions,
      completed: acc.completed + day.completed,
      failed: acc.failed + day.failed,
      avgDuration: acc.avgDuration + day.avg_duration_ms,
      totalCost: acc.totalCost + (day.total_cost || 0)
    }), { totalExecutions: 0, completed: 0, failed: 0, avgDuration: 0, totalCost: 0 });

    set({
      metrics: totals ? {
        ...totals,
        avgDuration: Math.round(totals.avgDuration / (data?.length || 1))
      } : null,
      loading: false
    });
  },

  createSkill: async (skill) => {
    const orgId = useAuthStore.getState().orgId;
    if (!orgId) return null;

    const { data, error } = await supabase
      .from('ai_skills')
      .insert({ ...skill, org_id: orgId })
      .select()
      .single();
    
    if (error) {
      set({ error: error.message });
      return null;
    }

    await get().fetchSkills();
    return data;
  },

  updateSkill: async (id, updates) => {
    const { error } = await supabase
      .from('ai_skills')
      .update(updates)
      .eq('id', id);
    
    if (!error) await get().fetchSkills();
    return !error;
  },

  deleteSkill: async (id) => {
    const { error } = await supabase
      .from('ai_skills')
      .delete()
      .eq('id', id);
    
    if (!error) await get().fetchSkills();
    return !error;
  },

  executeAgent: async ({ agentType, skillSlug, patientId, input, parentExecutionId }) => {
    const orgId = useAuthStore.getState().orgId;
    if (!orgId) return null;

    const skillAgentType = agentType === 'HarnessRunner'
      ? resolveHarnessTargetAgentType(input.target_agent_type ?? input.targetAgentType)
      : agentType;
    const normalizedInput = agentType === 'HarnessRunner'
      ? { ...input, target_agent_type: skillAgentType }
      : input;

    const { data: skillsData, error: skillsError } = await supabase
      .from('ai_skills')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: true });

    if (skillsError) {
      set({ error: skillsError.message });
      return null;
    }

    const bundle = resolveSkillBundle((skillsData || []) as AISkill[], {
      orgId,
      agentType: skillAgentType,
      skillSlug,
      procedureType: normalizedInput.procedure_type ?? normalizedInput.procedureType ?? normalizedInput.procedure ?? normalizedInput.procedure_name,
      messageType: normalizedInput.message_type ?? normalizedInput.messageType ?? normalizedInput.type,
    });
    const skill = buildCompositeSkillConfig(bundle);

    if (skillSlug && !skill) {
      set({ error: `Skill "${skillSlug}" não encontrada ou inativa` });
      return null;
    }

    const executionData: Partial<AgentExecution> = {
      org_id: orgId,
      patient_id: patientId,
      agent_type: agentType,
      skill_name: skill?.name,
      input_payload: normalizedInput,
      context: skill ? {
        skill_slug: skill.slug,
        skill_source: skill.source,
        harness_target_agent_type: agentType === 'HarnessRunner' ? skillAgentType : null,
        skill_bundle: bundle.skills.map((item) => ({
          slug: item.slug,
          name: item.name,
          version: item.skill_version,
          source: item.is_system ? 'system_db' : 'tenant_db',
          procedure_scope: item.procedure_scope,
        })),
      } : null,
      parent_execution_id: parentExecutionId,
      status: 'running',
      started_at: new Date().toISOString()
    };

    // Calcular chain se houver parent
    if (parentExecutionId) {
      const { data: parent } = await supabase
        .from('agent_executions')
        .select('execution_chain')
        .eq('id', parentExecutionId)
        .single();
      
      executionData.execution_chain = parent?.execution_chain 
        ? [...parent.execution_chain, parentExecutionId]
        : [parentExecutionId];
    }

    const { data: execution, error } = await supabase
      .from('agent_executions')
      .insert(executionData)
      .select()
      .single();
    
    if (error) {
      set({ error: error.message });
      return null;
    }

    // Trigger Edge Function para processar
    const { error: invokeError } = await supabase.functions.invoke('process-agent', {
      body: {
        executionId: execution.id,
        agentType,
        skillConfig: skill,
        input: normalizedInput,
        modelConfig: skill?.model_config
      }
    });

    if (invokeError) {
      // Marcar como falha
      await supabase
        .from('agent_executions')
        .update({
          status: 'failed',
          error_message: invokeError.message,
          completed_at: new Date().toISOString()
        })
        .eq('id', execution.id);
    }

    return execution;
  },

  cancelExecution: async (executionId) => {
    const { error } = await supabase
      .from('agent_executions')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString()
      })
      .eq('id', executionId)
      .eq('status', 'running');
    
    return !error;
  },

  getExecutionStatus: async (executionId) => {
    const { data, error } = await supabase
      .from('agent_executions')
      .select('*')
      .eq('id', executionId)
      .single();
    
    if (error) return null;
    return data;
  }
}));

function resolveHarnessTargetAgentType(value: unknown): SkillBackedAgentType {
  if (value === 'ResponseAnalyzer' || value === 'DocumentGenerator') return value;
  return 'MessageAgent';
}
