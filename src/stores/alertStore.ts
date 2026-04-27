import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './authStore';
import type { AlertDefinition, AlertLog } from '../lib/types';

interface AlertState {
  definitions: AlertDefinition[];
  logs: AlertLog[];
  loading: boolean;
  fetchDefinitions: () => Promise<void>;
  fetchLogs: (patientId: string) => Promise<void>;
  createDefinition: (data: Omit<AlertDefinition, 'id' | 'org_id' | 'created_at'>) => Promise<{ error: string | null }>;
  updateDefinition: (id: string, data: Partial<AlertDefinition>) => Promise<{ error: string | null }>;
}

export const useAlertStore = create<AlertState>((set, get) => ({
  definitions: [],
  logs: [],
  loading: false,

  fetchDefinitions: async () => {
    const { data, error } = await supabase
      .from('alert_definitions')
      .select('*')
      .order('code');
    if (!error && data) set({ definitions: data });
  },

  fetchLogs: async (patientId) => {
    set({ loading: true });
    const { data, error } = await supabase
      .from('alert_logs')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (!error && data) set({ logs: data });
    set({ loading: false });
  },

  createDefinition: async (defData) => {
    const orgId = useAuthStore.getState().orgId;
    if (!orgId) return { error: 'Organização não encontrada' };

    const { error } = await supabase
      .from('alert_definitions')
      .insert({ ...defData, org_id: orgId });

    if (error) return { error: error.message };
    await get().fetchDefinitions();
    return { error: null };
  },

  updateDefinition: async (id, defData) => {
    const { error } = await supabase
      .from('alert_definitions')
      .update(defData)
      .eq('id', id);

    if (error) return { error: error.message };
    await get().fetchDefinitions();
    return { error: null };
  },
}));
