import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Patient, WorkflowStatus } from '../lib/types';
import { canTransition } from '../lib/patientPipeline';
import { useAuthStore } from './authStore';

interface PatientFilters {
  search: string;
  classification: string;
  status: string;
  sortBy: string;
}

interface PatientState {
  patients: Patient[];
  selectedPatient: Patient | null;
  loading: boolean;
  filters: PatientFilters;
  page: number;
  pageSize: number;
  totalCount: number;
  setFilters: (filters: Partial<PatientFilters>) => void;
  setPage: (page: number) => void;
  fetchPatients: () => Promise<void>;
  fetchPatientById: (id: string) => Promise<Patient | null>;
  createPatient: (data: Omit<Patient, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'workflow_status'>) => Promise<{ id: string | null; error: string | null }>;
  updatePatient: (id: string, data: Partial<Patient>) => Promise<{ error: string | null }>;
  deletePatient: (id: string) => Promise<{ error: string | null }>;
  advanceWorkflow: (patientId: string, toStatus: WorkflowStatus) => Promise<{ error: string | null }>;
}

export const usePatientStore = create<PatientState>((set, get) => ({
  patients: [],
  selectedPatient: null,
  loading: false,
  filters: { search: '', classification: '', status: '', sortBy: 'created_at_desc' },
  page: 1,
  pageSize: 10,
  totalCount: 0,

  setFilters: (newFilters) => {
    set((s) => ({ filters: { ...s.filters, ...newFilters }, page: 1 }));
    get().fetchPatients();
  },

  setPage: (page) => {
    set({ page });
    get().fetchPatients();
  },

  fetchPatients: async () => {
    set({ loading: true });
    const { filters, page, pageSize } = get();
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase.from('patients').select('*', { count: 'exact' });

    if (filters.search) {
      // Sanitiza input para prevenir SQL injection
      const sanitized = filters.search.replace(/[%_]/g, '\\$&');
      query = query.or(`full_name.ilike.%${sanitized}%,cpf.ilike.%${sanitized}%`);
    }
    if (filters.classification) {
      query = query.eq('classification', filters.classification);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    switch (filters.sortBy) {
      case 'name_asc':
        query = query.order('full_name', { ascending: true });
        break;
      case 'name_desc':
        query = query.order('full_name', { ascending: false });
        break;
      case 'created_at_asc':
        query = query.order('created_at', { ascending: true });
        break;
      default:
        query = query.order('created_at', { ascending: false });
    }

    query = query.range(from, to);

    const { data, count, error } = await query;
    if (!error && data) {
      set({ patients: data, totalCount: count ?? 0, loading: false });
    } else {
      set({ loading: false });
    }
  },

  fetchPatientById: async (id) => {
    const { data } = await supabase
      .from('patients')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (data) set({ selectedPatient: data });
    return data;
  },

  createPatient: async (patientData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { id: null, error: 'Não autenticado' };

    const orgId = useAuthStore.getState().orgId;
    if (!orgId) return { id: null, error: 'Organização não encontrada' };

    const { data, error } = await supabase
      .from('patients')
      .insert({ ...patientData, user_id: user.id, org_id: orgId })
      .select('id')
      .maybeSingle();

    if (error) return { id: null, error: error.message };
    return { id: data?.id ?? null, error: null };
  },

  updatePatient: async (id, patientData) => {
    const { error } = await supabase
      .from('patients')
      .update({ ...patientData, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return { error: error.message };
    return { error: null };
  },

  deletePatient: async (id) => {
    const { error } = await supabase.from('patients').delete().eq('id', id);
    if (error) return { error: error.message };
    get().fetchPatients();
    return { error: null };
  },

  advanceWorkflow: async (patientId, toStatus) => {
    const current = get().selectedPatient;
    const from: WorkflowStatus = current?.id === patientId && current.workflow_status
      ? current.workflow_status
      : 'lead';

    const check = canTransition(from, toStatus);
    if (!check.allowed) {
      return { error: check.reason ?? 'Transição não permitida.' };
    }

    const { data, error } = await supabase
      .from('patients')
      .update({ workflow_status: toStatus, updated_at: new Date().toISOString() })
      .eq('id', patientId)
      .select('*')
      .maybeSingle();

    if (error) return { error: error.message };
    if (data) set({ selectedPatient: data });
    return { error: null };
  },
}));
