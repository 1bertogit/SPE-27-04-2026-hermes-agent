import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './authStore';
import type { SurgicalRecord, ImplantRecord } from '../lib/types';

interface SurgicalState {
  records: SurgicalRecord[];
  loading: boolean;
  fetchRecords: (patientId: string) => Promise<void>;
  createRecord: (data: Omit<SurgicalRecord, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'implants' | 'patient'>) => Promise<{ id: string | null; error: string | null }>;
  updateRecord: (id: string, data: Partial<SurgicalRecord>) => Promise<{ error: string | null }>;
  deleteRecord: (id: string) => Promise<{ error: string | null }>;
  addImplant: (data: Omit<ImplantRecord, 'id' | 'user_id' | 'created_at'>) => Promise<{ id: string | null; error: string | null }>;
  deleteImplant: (implantId: string, recordId: string, patientId: string) => Promise<{ error: string | null }>;
}

export const useSurgicalStore = create<SurgicalState>((set, get) => ({
  records: [],
  loading: false,

  fetchRecords: async (patientId) => {
    set({ loading: true });
    const { data: records, error } = await supabase
      .from('surgical_records')
      .select('*')
      .eq('patient_id', patientId)
      .order('surgery_date', { ascending: false, nullsFirst: true });

    if (!error && records) {
      const ids = records.map((r) => r.id);
      let implants: ImplantRecord[] = [];
      if (ids.length > 0) {
        const { data: implantData } = await supabase
          .from('implant_records')
          .select('*')
          .in('surgical_record_id', ids);
        implants = implantData ?? [];
      }

      const enriched = records.map((r) => ({
        ...r,
        implants: implants.filter((i) => i.surgical_record_id === r.id),
      }));
      set({ records: enriched });
    }
    set({ loading: false });
  },

  createRecord: async (recordData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { id: null, error: 'Não autenticado' };

    const orgId = useAuthStore.getState().orgId;
    if (!orgId) return { id: null, error: 'Organização não encontrada' };

    const { data, error } = await supabase
      .from('surgical_records')
      .insert({ ...recordData, user_id: user.id, org_id: orgId })
      .select('id')
      .maybeSingle();

    if (error) return { id: null, error: error.message };
    await get().fetchRecords(recordData.patient_id);
    return { id: data?.id ?? null, error: null };
  },

  updateRecord: async (id, recordData) => {
    const { error } = await supabase
      .from('surgical_records')
      .update({ ...recordData, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) return { error: error.message };
    const rec = get().records.find((r) => r.id === id);
    if (rec) await get().fetchRecords(rec.patient_id);
    return { error: null };
  },

  deleteRecord: async (id) => {
    const rec = get().records.find((r) => r.id === id);
    const { error } = await supabase.from('surgical_records').delete().eq('id', id);
    if (error) return { error: error.message };
    if (rec) await get().fetchRecords(rec.patient_id);
    return { error: null };
  },

  addImplant: async (implantData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { id: null, error: 'Não autenticado' };

    const orgId = useAuthStore.getState().orgId;
    if (!orgId) return { id: null, error: 'Organização não encontrada' };

    const { data, error } = await supabase
      .from('implant_records')
      .insert({ ...implantData, user_id: user.id, org_id: orgId })
      .select('id')
      .maybeSingle();

    if (error) return { id: null, error: error.message };
    await get().fetchRecords(implantData.patient_id);
    return { id: data?.id ?? null, error: null };
  },

  deleteImplant: async (implantId, _recordId, patientId) => {
    const { error } = await supabase.from('implant_records').delete().eq('id', implantId);
    if (error) return { error: error.message };
    await get().fetchRecords(patientId);
    return { error: null };
  },
}));
