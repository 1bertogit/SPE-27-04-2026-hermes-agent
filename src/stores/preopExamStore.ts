import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './authStore';
import type { PreopExam } from '../lib/types';
import { BASE_PREOP_EXAMS, PROCEDURE_SPECIFIC_EXAMS } from '../data/procedures';

interface PreopExamState {
  exams: PreopExam[];
  loading: boolean;
  fetchExams: (patientId: string) => Promise<void>;
  createExam: (data: Omit<PreopExam, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<{ id: string | null; error: string | null }>;
  updateExam: (id: string, data: Partial<PreopExam>) => Promise<{ error: string | null }>;
  deleteExam: (id: string) => Promise<{ error: string | null }>;
  generateBaseExams: (patientId: string, procedureType: string, evaluationId?: string) => Promise<{ error: string | null }>;
}

export const usePreopExamStore = create<PreopExamState>((set, get) => ({
  exams: [],
  loading: false,

  fetchExams: async (patientId) => {
    set({ loading: true });
    const { data, error } = await supabase
      .from('preop_exams')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: true });

    if (!error && data) set({ exams: data });
    set({ loading: false });
  },

  createExam: async (examData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { id: null, error: 'Não autenticado' };

    const orgId = useAuthStore.getState().orgId;
    if (!orgId) return { id: null, error: 'Organização não encontrada' };

    const { data, error } = await supabase
      .from('preop_exams')
      .insert({ ...examData, user_id: user.id, org_id: orgId })
      .select('id')
      .maybeSingle();

    if (error) return { id: null, error: error.message };
    await get().fetchExams(examData.patient_id);
    return { id: data?.id ?? null, error: null };
  },

  updateExam: async (id, examData) => {
    const { error } = await supabase
      .from('preop_exams')
      .update({ ...examData, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) return { error: error.message };
    const exam = get().exams.find((e) => e.id === id);
    if (exam) await get().fetchExams(exam.patient_id);
    return { error: null };
  },

  deleteExam: async (id) => {
    const exam = get().exams.find((e) => e.id === id);
    const { error } = await supabase.from('preop_exams').delete().eq('id', id);
    if (error) return { error: error.message };
    if (exam) await get().fetchExams(exam.patient_id);
    return { error: null };
  },

  generateBaseExams: async (patientId, procedureType, evaluationId) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Não autenticado' };

    const orgId = useAuthStore.getState().orgId;
    if (!orgId) return { error: 'Organização não encontrada' };

    const specific = PROCEDURE_SPECIFIC_EXAMS[procedureType] ?? [];
    const allExams = [
      ...BASE_PREOP_EXAMS.map((name) => ({
        patient_id: patientId,
        user_id: user.id,
        org_id: orgId,
        evaluation_id: evaluationId ?? null,
        exam_name: name,
        exam_type: 'Base' as const,
        procedure_type: procedureType,
        status: 'Solicitado' as const,
        requested_at: new Date().toISOString(),
        is_mandatory: true,
        is_altered: false,
      })),
      ...specific.map((name) => ({
        patient_id: patientId,
        user_id: user.id,
        org_id: orgId,
        evaluation_id: evaluationId ?? null,
        exam_name: name,
        exam_type: 'Específico do Procedimento' as const,
        procedure_type: procedureType,
        status: 'Solicitado' as const,
        requested_at: new Date().toISOString(),
        is_mandatory: true,
        is_altered: false,
      })),
    ];

    const { error } = await supabase.from('preop_exams').insert(allExams);
    if (error) return { error: error.message };
    await get().fetchExams(patientId);
    return { error: null };
  },
}));
