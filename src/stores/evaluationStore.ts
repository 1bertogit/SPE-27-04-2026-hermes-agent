import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './authStore';
import type { Evaluation, EvaluationCriterion } from '../lib/types';
import { EVALUATION_STEPS, getTotalMaxScore } from '../data/evaluationCriteria';

interface EvalAnswers {
  [criterionKey: string]: { option: string; score: number; maxScore: number; group: string; label: string; step: number };
}

interface EvaluationState {
  evaluations: Evaluation[];
  currentEvaluation: Evaluation | null;
  criteria: EvaluationCriterion[];
  answers: EvalAnswers;
  currentStep: number;
  loading: boolean;
  fetchEvaluations: (patientId?: string) => Promise<void>;
  fetchAllEvaluations: () => Promise<void>;
  startEvaluation: (patientId: string) => Promise<{ id: string | null; error: string | null }>;
  loadEvaluation: (id: string) => Promise<void>;
  setAnswer: (key: string, option: string, score: number, maxScore: number, group: string, label: string, step: number) => void;
  setStep: (step: number) => void;
  saveProgress: () => Promise<{ error: string | null }>;
  completeEvaluation: () => Promise<{ error: string | null }>;
  getStepScore: (stepId: number) => number;
  getStepMaxScore: (stepId: number) => number;
  getTotalScore: () => number;
}

export const useEvaluationStore = create<EvaluationState>((set, get) => ({
  evaluations: [],
  currentEvaluation: null,
  criteria: [],
  answers: {},
  currentStep: 0,
  loading: false,

  fetchEvaluations: async (patientId) => {
    set({ loading: true });
    let query = supabase.from('evaluations').select('*, patient:patients(id, full_name, cpf, classification)').order('created_at', { ascending: false });
    if (patientId) query = query.eq('patient_id', patientId);
    const { data } = await query;
    if (data) set({ evaluations: data as Evaluation[] });
    set({ loading: false });
  },

  fetchAllEvaluations: async () => {
    set({ loading: true });
    const { data } = await supabase
      .from('evaluations')
      .select('*, patient:patients(id, full_name, cpf, classification)')
      .order('created_at', { ascending: false });
    if (data) set({ evaluations: data as Evaluation[] });
    set({ loading: false });
  },

  startEvaluation: async (patientId) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { id: null, error: 'Não autenticado' };

    const orgId = useAuthStore.getState().orgId;
    if (!orgId) return { id: null, error: 'Organização não encontrada' };

    const maxScore = getTotalMaxScore();
    const { data, error } = await supabase
      .from('evaluations')
      .insert({
        patient_id: patientId,
        user_id: user.id,
        org_id: orgId,
        status: 'Em Andamento',
        total_score: 0,
        max_score: maxScore,
        current_step: 0,
      })
      .select()
      .maybeSingle();

    if (error) return { id: null, error: error.message };
    if (data) set({ currentEvaluation: data, answers: {}, currentStep: 0 });
    return { id: data?.id ?? null, error: null };
  },

  loadEvaluation: async (id) => {
    set({ loading: true });
    const { data: evalData } = await supabase
      .from('evaluations')
      .select('*, patient:patients(id, full_name, cpf, classification)')
      .eq('id', id)
      .maybeSingle();

    const { data: criteriaData } = await supabase
      .from('evaluation_criteria')
      .select('*')
      .eq('evaluation_id', id);

    const answers: EvalAnswers = {};
    if (criteriaData) {
      criteriaData.forEach((c: EvaluationCriterion) => {
        answers[c.criterion_key] = {
          option: c.selected_option,
          score: c.score,
          maxScore: c.max_score,
          group: c.criterion_group,
          label: c.criterion_label,
          step: c.step_number,
        };
      });
    }

    if (evalData) {
      set({
        currentEvaluation: evalData as Evaluation,
        criteria: criteriaData ?? [],
        answers,
        currentStep: evalData.current_step,
        loading: false,
      });
    } else {
      set({ loading: false });
    }
  },

  setAnswer: (key, option, score, maxScore, group, label, step) => {
    set((s) => ({
      answers: { ...s.answers, [key]: { option, score, maxScore, group, label, step } },
    }));
  },

  setStep: (step) => set({ currentStep: step }),

  getStepScore: (stepId) => {
    const { answers } = get();
    const step = EVALUATION_STEPS[stepId];
    if (!step) return 0;
    return step.criteria.reduce((sum, c) => sum + (answers[c.key]?.score ?? 0), 0);
  },

  getStepMaxScore: (stepId) => {
    const step = EVALUATION_STEPS[stepId];
    if (!step) return 0;
    return step.criteria.reduce((sum, c) => sum + c.maxScore, 0);
  },

  getTotalScore: () => {
    const { answers } = get();
    return Object.values(answers).reduce((sum, a) => sum + a.score, 0);
  },

  saveProgress: async () => {
    const { currentEvaluation, answers, currentStep } = get();
    if (!currentEvaluation) return { error: 'Nenhuma avaliação em andamento' };

    const totalScore = Object.values(answers).reduce((sum, a) => sum + a.score, 0);

    const { error: updateError } = await supabase
      .from('evaluations')
      .update({
        current_step: currentStep,
        total_score: totalScore,
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentEvaluation.id);

    if (updateError) return { error: updateError.message };

    const rows = Object.entries(answers).map(([key, val]) => ({
      evaluation_id: currentEvaluation.id,
      criterion_key: key,
      criterion_group: val.group,
      criterion_label: val.label,
      selected_option: val.option,
      score: val.score,
      max_score: val.maxScore,
      step_number: val.step,
    }));

    if (rows.length > 0) {
      const { error: upsertError } = await supabase
        .from('evaluation_criteria')
        .upsert(rows, { onConflict: 'evaluation_id,criterion_key', ignoreDuplicates: false });

      if (upsertError) return { error: upsertError.message };
    }

    return { error: null };
  },

  completeEvaluation: async () => {
    const { currentEvaluation, answers } = get();
    if (!currentEvaluation) return { error: 'Nenhuma avaliação em andamento' };

    const totalScore = Object.values(answers).reduce((sum, a) => sum + a.score, 0);

    const rows = Object.entries(answers).map(([key, val]) => ({
      evaluation_id: currentEvaluation.id,
      criterion_key: key,
      criterion_group: val.group,
      criterion_label: val.label,
      selected_option: val.option,
      score: val.score,
      max_score: val.maxScore,
      step_number: val.step,
    }));

    if (rows.length > 0) {
      const { error: upsertError } = await supabase
        .from('evaluation_criteria')
        .upsert(rows, { onConflict: 'evaluation_id,criterion_key', ignoreDuplicates: false });

      if (upsertError) return { error: upsertError.message };
    }

    const { error } = await supabase
      .from('evaluations')
      .update({
        status: 'Concluído',
        total_score: totalScore,
        current_step: EVALUATION_STEPS.length - 1,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentEvaluation.id);

    if (error) return { error: error.message };

    return { error: null };
  },
}));
