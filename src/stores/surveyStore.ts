import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './authStore';
import type { SatisfactionSurvey } from '../lib/types';

interface SurveyState {
  surveys: SatisfactionSurvey[];
  loading: boolean;
  fetchSurveys: (patientId?: string) => Promise<void>;
  createSurvey: (data: Omit<SatisfactionSurvey, 'id' | 'user_id' | 'created_at' | 'patient'>) => Promise<{ id: string | null; error: string | null }>;
  updateSurvey: (id: string, data: Partial<SatisfactionSurvey>) => Promise<{ error: string | null }>;
  deleteSurvey: (id: string) => Promise<{ error: string | null }>;
  getNpsMetrics: () => { promoters: number; neutrals: number; detractors: number; nps: number; total: number };
}

export const useSurveyStore = create<SurveyState>((set, get) => ({
  surveys: [],
  loading: false,

  fetchSurveys: async (patientId) => {
    set({ loading: true });
    let query = supabase
      .from('satisfaction_surveys')
      .select('*, patient:patients(id, full_name, cpf)')
      .order('survey_date', { ascending: false });

    if (patientId) query = query.eq('patient_id', patientId);

    const { data, error } = await query;
    if (!error && data) set({ surveys: data });
    set({ loading: false });
  },

  createSurvey: async (surveyData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { id: null, error: 'Não autenticado' };

    const orgId = useAuthStore.getState().orgId;
    if (!orgId) return { id: null, error: 'Organização não encontrada' };

    const { data, error } = await supabase
      .from('satisfaction_surveys')
      .insert({ ...surveyData, user_id: user.id, org_id: orgId })
      .select('id')
      .maybeSingle();

    if (error) return { id: null, error: error.message };
    await get().fetchSurveys(surveyData.patient_id);
    return { id: data?.id ?? null, error: null };
  },

  updateSurvey: async (id, surveyData) => {
    const { error } = await supabase
      .from('satisfaction_surveys')
      .update(surveyData)
      .eq('id', id);

    if (error) return { error: error.message };
    await get().fetchSurveys();
    return { error: null };
  },

  deleteSurvey: async (id) => {
    const { error } = await supabase.from('satisfaction_surveys').delete().eq('id', id);
    if (error) return { error: error.message };
    set((s) => ({ surveys: s.surveys.filter((sv) => sv.id !== id) }));
    return { error: null };
  },

  getNpsMetrics: () => {
    const { surveys } = get();
    const withScore = surveys.filter((s) => s.nps_score !== null);
    const promoters = withScore.filter((s) => (s.nps_score ?? 0) >= 9).length;
    const neutrals = withScore.filter((s) => (s.nps_score ?? 0) >= 7 && (s.nps_score ?? 0) <= 8).length;
    const detractors = withScore.filter((s) => (s.nps_score ?? 0) <= 6).length;
    const total = withScore.length;
    const nps = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0;
    return { promoters, neutrals, detractors, nps, total };
  },
}));
