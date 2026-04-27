import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './authStore';
import type { PatientAppointment } from '../lib/types';
import { addDays, format } from 'date-fns';
import { POSTOP_FOLLOW_UP_SCHEDULE } from '../data/procedures';

interface AppointmentState {
  appointments: PatientAppointment[];
  loading: boolean;
  fetchAppointments: (patientId?: string) => Promise<void>;
  fetchAllAppointments: () => Promise<void>;
  createAppointment: (data: Omit<PatientAppointment, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'patient'>) => Promise<{ id: string | null; error: string | null }>;
  updateAppointment: (id: string, data: Partial<PatientAppointment>) => Promise<{ error: string | null }>;
  deleteAppointment: (id: string) => Promise<{ error: string | null }>;
  generatePostopSchedule: (patientId: string, procedureType: string, surgeryDate: Date, evaluationId?: string) => Promise<{ error: string | null }>;
}

export const useAppointmentStore = create<AppointmentState>((set, get) => ({
  appointments: [],
  loading: false,

  fetchAppointments: async (patientId) => {
    set({ loading: true });
    let query = supabase
      .from('patient_appointments')
      .select('*, patient:patients(id, full_name, cpf)')
      .order('scheduled_date', { ascending: true, nullsFirst: false });

    if (patientId) query = query.eq('patient_id', patientId);

    const { data, error } = await query;
    if (!error && data) set({ appointments: data });
    set({ loading: false });
  },

  fetchAllAppointments: async () => {
    set({ loading: true });
    const { data, error } = await supabase
      .from('patient_appointments')
      .select('*, patient:patients(id, full_name, cpf)')
      .order('scheduled_date', { ascending: true, nullsFirst: false });

    if (!error && data) set({ appointments: data });
    set({ loading: false });
  },

  createAppointment: async (appointmentData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { id: null, error: 'Não autenticado' };

    const orgId = useAuthStore.getState().orgId;
    if (!orgId) return { id: null, error: 'Organização não encontrada' };

    const { data, error } = await supabase
      .from('patient_appointments')
      .insert({ ...appointmentData, user_id: user.id, org_id: orgId })
      .select('id')
      .maybeSingle();

    if (error) return { id: null, error: error.message };
    await get().fetchAppointments(appointmentData.patient_id);
    return { id: data?.id ?? null, error: null };
  },

  updateAppointment: async (id, appointmentData) => {
    const { error } = await supabase
      .from('patient_appointments')
      .update({ ...appointmentData, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) return { error: error.message };
    const appt = get().appointments.find((a) => a.id === id);
    if (appt) await get().fetchAppointments(appt.patient_id);
    return { error: null };
  },

  deleteAppointment: async (id) => {
    const appt = get().appointments.find((a) => a.id === id);
    const { error } = await supabase.from('patient_appointments').delete().eq('id', id);
    if (error) return { error: error.message };
    if (appt) await get().fetchAppointments(appt.patient_id);
    return { error: null };
  },

  generatePostopSchedule: async (patientId, procedureType, surgeryDate, evaluationId) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Não autenticado' };

    const orgId = useAuthStore.getState().orgId;
    if (!orgId) return { error: 'Organização não encontrada' };

    const appointments = POSTOP_FOLLOW_UP_SCHEDULE.map((item) => ({
      patient_id: patientId,
      user_id: user.id,
      org_id: orgId,
      evaluation_id: evaluationId ?? null,
      appointment_type: item.type as PatientAppointment['appointment_type'],
      scheduled_date: format(addDays(surgeryDate, item.days), "yyyy-MM-dd'T'HH:mm:ssxxx"),
      completed_date: null,
      status: 'Agendado' as const,
      notes: item.description,
      procedure_type: procedureType,
    }));

    const { error } = await supabase.from('patient_appointments').insert(appointments);
    if (error) return { error: error.message };
    await get().fetchAppointments(patientId);
    return { error: null };
  },
}));
