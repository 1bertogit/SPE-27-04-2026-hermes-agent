import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { SatisfactionSurvey, Referral, NPSMetrics } from '../lib/types';
import { useAuthStore } from './authStore';

interface NPSState {
  surveys: SatisfactionSurvey[];
  referrals: Referral[];
  metrics: NPSMetrics | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchSurveys: () => Promise<void>;
  fetchReferrals: () => Promise<void>;
  fetchMetrics: () => Promise<void>;
  createSurveyToken: (patientId: string) => Promise<string | null>;
  submitNPSSurvey: (token: string, score: number, feedback?: string) => Promise<boolean>;
  createReferral: (referral: Partial<Referral>) => Promise<boolean>;
  updateReferralStatus: (id: string, status: Referral['status']) => Promise<boolean>;
  convertReferral: (id: string) => Promise<boolean>;
}

export const useNPSStore = create<NPSState>((set, get) => ({
  surveys: [],
  referrals: [],
  metrics: null,
  loading: false,
  error: null,

  fetchSurveys: async () => {
    set({ loading: true, error: null });
    const { data, error } = await supabase
      .from('satisfaction_surveys')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      set({ error: error.message, loading: false });
    } else {
      set({ surveys: data || [], loading: false });
    }
  },

  fetchReferrals: async () => {
    set({ loading: true, error: null });
    const { data, error } = await supabase
      .from('referrals')
      .select(`
        *,
        referrer:referrer_patient_id (full_name, phone)
      `)
      .order('created_at', { ascending: false });
    
    if (error) {
      set({ error: error.message, loading: false });
    } else {
      set({ referrals: data || [], loading: false });
    }
  },

  fetchMetrics: async () => {
    set({ loading: true, error: null });
    
    // Buscar métricas do cache
    const { data, error } = await supabase
      .from('org_metrics_cache')
      .select('*')
      .single();
    
    if (error && error.code !== 'PGRST116') {
      set({ error: error.message, loading: false });
      return;
    }

    // Calcular NPS em tempo real se não tiver cache
    const { data: surveys } = await supabase
      .from('satisfaction_surveys')
      .select('nps_score, created_at')
      .not('nps_score', 'is', null);

    const promoters = surveys?.filter(s => s.nps_score >= 9).length || 0;
    const detractors = surveys?.filter(s => s.nps_score <= 6).length || 0;
    const total = surveys?.length || 0;
    const npsScore = total > 0 ? ((promoters - detractors) / total) * 100 : 0;

    set({
      metrics: {
        npsScore: Math.round(npsScore * 100) / 100,
        totalResponses: total,
        promoters,
        detractors,
        passives: total - promoters - detractors,
        responseRate: data?.response_rate || 0,
        referralsSent: data?.referrals_sent || 0,
        referralsConverted: data?.referrals_converted || 0
      },
      loading: false
    });
  },

  createSurveyToken: async (patientId: string) => {
    const orgId = useAuthStore.getState().orgId;
    if (!orgId) return null;

    const token = crypto.randomUUID();
    const { error } = await supabase
      .from('nps_survey_tokens')
      .insert({
        org_id: orgId,
        patient_id: patientId,
        token,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });
    
    if (error) return null;
    return token;
  },

  submitNPSSurvey: async (token: string, score: number, feedback?: string) => {
    const { error } = await supabase.functions.invoke('submit-nps-survey', {
      body: { token, score, feedback },
    });
    return !error;
  },

  createReferral: async (referral) => {
    const orgId = useAuthStore.getState().orgId;
    if (!orgId) return false;

    const { error } = await supabase.from('referrals').insert({ ...referral, org_id: orgId });
    return !error;
  },

  updateReferralStatus: async (id, status) => {
    const updates: Partial<Referral> = { status };
    if (status === 'converted') {
      updates.converted_at = new Date().toISOString();
    }
    
    const { error } = await supabase
      .from('referrals')
      .update(updates)
      .eq('id', id);
    
    return !error;
  },

  convertReferral: async (id) => {
    return get().updateReferralStatus(id, 'converted');
  }
}));
