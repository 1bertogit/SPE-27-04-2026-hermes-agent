import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './authStore';
import type { PatientDocument } from '../lib/types';

interface DocumentState {
  documents: PatientDocument[];
  loading: boolean;
  fetchDocuments: (patientId: string) => Promise<void>;
  createDocument: (data: Omit<PatientDocument, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'patient'>) => Promise<{ id: string | null; error: string | null }>;
  updateDocument: (id: string, data: Partial<PatientDocument>) => Promise<{ error: string | null }>;
  deleteDocument: (id: string) => Promise<{ error: string | null }>;
  markAsSigned: (id: string) => Promise<{ error: string | null }>;
  hasSignedAUI: (patientId: string) => Promise<boolean>;
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  documents: [],
  loading: false,

  fetchDocuments: async (patientId) => {
    set({ loading: true });
    const { data, error } = await supabase
      .from('patient_documents')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (!error && data) set({ documents: data });
    set({ loading: false });
  },

  createDocument: async (docData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { id: null, error: 'Não autenticado' };

    const orgId = useAuthStore.getState().orgId;
    if (!orgId) return { id: null, error: 'Organização não encontrada' };

    const { data, error } = await supabase
      .from('patient_documents')
      .insert({ ...docData, user_id: user.id, org_id: orgId })
      .select('id')
      .maybeSingle();

    if (error) return { id: null, error: error.message };
    await get().fetchDocuments(docData.patient_id);
    return { id: data?.id ?? null, error: null };
  },

  updateDocument: async (id, docData) => {
    const { error } = await supabase
      .from('patient_documents')
      .update({ ...docData, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) return { error: error.message };
    const doc = get().documents.find((d) => d.id === id);
    if (doc) await get().fetchDocuments(doc.patient_id);
    return { error: null };
  },

  deleteDocument: async (id) => {
    const doc = get().documents.find((d) => d.id === id);
    const { error } = await supabase.from('patient_documents').delete().eq('id', id);
    if (error) return { error: error.message };
    if (doc) await get().fetchDocuments(doc.patient_id);
    return { error: null };
  },

  markAsSigned: async (id) => {
    const { error } = await supabase
      .from('patient_documents')
      .update({ status: 'Assinado', signed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) return { error: error.message };
    const doc = get().documents.find((d) => d.id === id);
    if (doc) await get().fetchDocuments(doc.patient_id);
    return { error: null };
  },

  hasSignedAUI: async (patientId) => {
    const { count, error } = await supabase
      .from('patient_documents')
      .select('id', { count: 'exact', head: true })
      .eq('patient_id', patientId)
      .eq('document_type', 'Autorização de Uso de Imagem')
      .eq('status', 'Assinado');
    if (error) return false;
    return (count ?? 0) > 0;
  },
}));
