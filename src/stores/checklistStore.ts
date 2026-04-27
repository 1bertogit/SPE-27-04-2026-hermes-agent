import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './authStore';
import type { Checklist, ChecklistItem, ChecklistType } from '../lib/types';
import { CHECKLIST_TEMPLATES } from '../data/procedures';

interface ChecklistState {
  checklists: Checklist[];
  loading: boolean;
  fetchChecklists: (patientId: string) => Promise<void>;
  createChecklist: (
    data: Omit<Checklist, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'items' | 'patient'>,
    withTemplate?: boolean
  ) => Promise<{ id: string | null; error: string | null }>;
  updateChecklist: (id: string, data: Partial<Checklist>) => Promise<{ error: string | null }>;
  deleteChecklist: (id: string) => Promise<{ error: string | null }>;
  toggleItem: (itemId: string, checklistId: string, patientId: string) => Promise<{ error: string | null }>;
  addItem: (checklistId: string, patientId: string, label: string, item_type: ChecklistItem['item_type']) => Promise<{ error: string | null }>;
  deleteItem: (itemId: string, checklistId: string, patientId: string) => Promise<{ error: string | null }>;
}

export const useChecklistStore = create<ChecklistState>((set, get) => ({
  checklists: [],
  loading: false,

  fetchChecklists: async (patientId) => {
    set({ loading: true });
    const { data: checklists, error } = await supabase
      .from('checklists')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (!error && checklists) {
      const ids = checklists.map((c) => c.id);
      let items: ChecklistItem[] = [];
      if (ids.length > 0) {
        const { data: itemsData } = await supabase
          .from('checklist_items')
          .select('*')
          .in('checklist_id', ids)
          .order('sort_order', { ascending: true });
        items = itemsData ?? [];
      }

      const enriched = checklists.map((c) => ({
        ...c,
        items: items.filter((i) => i.checklist_id === c.id),
      }));
      set({ checklists: enriched });
    }
    set({ loading: false });
  },

  createChecklist: async (checklistData, withTemplate = true) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { id: null, error: 'Não autenticado' };

    const orgId = useAuthStore.getState().orgId;
    if (!orgId) return { id: null, error: 'Organização não encontrada' };

    const { data, error } = await supabase
      .from('checklists')
      .insert({ ...checklistData, user_id: user.id, org_id: orgId })
      .select('id')
      .maybeSingle();

    if (error || !data) return { id: null, error: error?.message ?? 'Erro ao criar checklist' };

    if (withTemplate) {
      const template = CHECKLIST_TEMPLATES[checklistData.checklist_type as ChecklistType];
      if (template && template.length > 0) {
        const itemsToInsert = template.map((t, i) => ({
          checklist_id: data.id,
          user_id: user.id,
          org_id: orgId,
          label: t.label,
          is_mandatory: t.item_type === 'Obrigatório CFM',
          is_completed: false,
          item_type: t.item_type,
          sort_order: i,
        }));
        await supabase.from('checklist_items').insert(itemsToInsert);
      }
    }

    await get().fetchChecklists(checklistData.patient_id);
    return { id: data.id, error: null };
  },

  updateChecklist: async (id, checklistData) => {
    const { error } = await supabase
      .from('checklists')
      .update({ ...checklistData, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) return { error: error.message };
    const cl = get().checklists.find((c) => c.id === id);
    if (cl) await get().fetchChecklists(cl.patient_id);
    return { error: null };
  },

  deleteChecklist: async (id) => {
    const cl = get().checklists.find((c) => c.id === id);
    const { error } = await supabase.from('checklists').delete().eq('id', id);
    if (error) return { error: error.message };
    if (cl) await get().fetchChecklists(cl.patient_id);
    return { error: null };
  },

  toggleItem: async (itemId, checklistId, patientId) => {
    const cl = get().checklists.find((c) => c.id === checklistId);
    const item = cl?.items?.find((i) => i.id === itemId);
    if (!item) return { error: 'Item não encontrado' };

    const newCompleted = !item.is_completed;
    const { error } = await supabase
      .from('checklist_items')
      .update({
        is_completed: newCompleted,
        completed_at: newCompleted ? new Date().toISOString() : null,
      })
      .eq('id', itemId);

    if (error) return { error: error.message };
    await get().fetchChecklists(patientId);
    return { error: null };
  },

  addItem: async (checklistId, patientId, label, item_type) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Não autenticado' };

    const orgId = useAuthStore.getState().orgId;
    if (!orgId) return { error: 'Organização não encontrada' };

    const cl = get().checklists.find((c) => c.id === checklistId);
    const maxOrder = Math.max(0, ...(cl?.items?.map((i) => i.sort_order) ?? []));

    const { error } = await supabase.from('checklist_items').insert({
      checklist_id: checklistId,
      user_id: user.id,
      org_id: orgId,
      label,
      item_type,
      is_mandatory: item_type === 'Obrigatório CFM',
      is_completed: false,
      sort_order: maxOrder + 1,
    });

    if (error) return { error: error.message };
    await get().fetchChecklists(patientId);
    return { error: null };
  },

  deleteItem: async (itemId, _checklistId, patientId) => {
    const { error } = await supabase.from('checklist_items').delete().eq('id', itemId);
    if (error) return { error: error.message };
    await get().fetchChecklists(patientId);
    return { error: null };
  },
}));
