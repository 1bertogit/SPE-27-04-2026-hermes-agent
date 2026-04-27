import { create } from 'zustand';
import type { Session, User, Subscription } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile } from '../lib/types';

let authSubscription: Subscription | null = null;

function getJwtClaims(session: Session | null) {
  if (!session?.access_token) return { orgId: null, role: null };
  try {
    const payload = JSON.parse(atob(session.access_token.split('.')[1]));
    return {
      orgId: payload.app_metadata?.org_id ?? null,
      role: payload.app_metadata?.role ?? null,
    };
  } catch {
    return { orgId: null, role: null };
  }
}

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  orgId: string | null;
  role: 'admin' | 'doctor' | 'reception' | null;
  loading: boolean;
  initialized: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  fetchProfile: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<{ error: string | null }>;
  initialize: () => Promise<void>;
  // Org member management (admin only)
  fetchOrgMembers: () => Promise<{ data: any[] | null; error: string | null }>;
  inviteMember: (email: string, role: 'admin' | 'doctor' | 'reception') => Promise<{ error: string | null; token?: string }>;
  cancelInvite: (token: string) => Promise<{ error: string | null }>;
  updateMemberRole: (userId: string, newRole: 'admin' | 'doctor' | 'reception') => Promise<{ error: string | null }>;
  removeMember: (userId: string) => Promise<{ error: string | null }>;
  acceptInvite: (token: string) => Promise<{ error: string | null; orgId?: string; role?: string }>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  orgId: null,
  role: null,
  loading: false,
  initialized: false,

  initialize: async () => {
    set({ loading: true });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { orgId, role } = getJwtClaims(session);
        set({ user: session.user, session, orgId, role });
        await get().fetchProfile();
      }
    } catch {
      // Network failure — allow app to show login
    }

    set({ initialized: true, loading: false });

    if (authSubscription) {
      authSubscription.unsubscribe();
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const { orgId, role } = getJwtClaims(session);
      set({ user: session?.user ?? null, session, orgId, role });
      if (session?.user) {
        (async () => {
          await get().fetchProfile();
        })();
      } else {
        set({ profile: null });
      }
    });

    authSubscription = subscription;
  },

  signIn: async (email, password) => {
    set({ loading: true });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    set({ loading: false });
    if (error) return { error: error.message };
    return { error: null };
  },

  signUp: async (email, password, fullName) => {
    set({ loading: true });
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    set({ loading: false });
    if (error) return { error: error.message };
    return { error: null };
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, profile: null, orgId: null, role: null });
  },

  resetPassword: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) return { error: error.message };
    return { error: null };
  },

  fetchProfile: async () => {
    const { user } = get();
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    if (data) set({ profile: data });
  },

  updateProfile: async (profileData) => {
    const { user } = get();
    if (!user) return { error: 'Usuário não autenticado' };
    const { error } = await supabase
      .from('profiles')
      .update({ ...profileData, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    if (error) return { error: error.message };
    await get().fetchProfile();
    return { error: null };
  },

  // Org member management
  fetchOrgMembers: async () => {
    const { orgId } = get();
    if (!orgId) return { data: null, error: 'Não está em uma organização' };
    
    const { data, error } = await supabase
      .from('org_members')
      .select('*')
      .eq('org_id', orgId)
      .order('joined_at', { ascending: false });
    
    if (error) return { data: null, error: error.message };
    return { data, error: null };
  },

  inviteMember: async (email, role) => {
    const { orgId, role: userRole } = get();
    if (!orgId) return { error: 'Não está em uma organização' };
    if (userRole !== 'admin') return { error: 'Apenas admins podem convidar membros' };
    
    const token = crypto.randomUUID().replace(/-/g, '').slice(0, 32);
    
    const { data, error } = await supabase
      .from('org_invites')
      .insert({
        org_id: orgId,
        invited_by: get().user!.id,
        email,
        role,
        token,
      })
      .select('token')
      .single();
    
    if (error) return { error: error.message };
    return { error: null, token: data?.token };
  },

  cancelInvite: async (token) => {
    const { role, orgId } = get();
    if (!orgId) return { error: 'Não está em uma organização' };
    if (role !== 'admin') return { error: 'Apenas admins podem cancelar convites' };
    
    const { error } = await supabase
      .from('org_invites')
      .update({ status: 'cancelled' })
      .eq('token', token)
      .eq('org_id', orgId);
    
    if (error) return { error: error.message };
    return { error: null };
  },

  updateMemberRole: async (userId, newRole) => {
    const { role, orgId } = get();
    if (!orgId) return { error: 'Não está em uma organização' };
    if (role !== 'admin') return { error: 'Apenas admins podem alterar roles' };
    
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)
      .eq('org_id', orgId);
    
    if (error) return { error: error.message };
    return { error: null };
  },

  removeMember: async (userId) => {
    const { role, orgId, user } = get();
    if (!orgId) return { error: 'Não está em uma organização' };
    if (role !== 'admin') return { error: 'Apenas admins podem remover membros' };
    if (userId === user?.id) return { error: 'Não pode remover a si mesmo' };
    
    const { error } = await supabase
      .from('profiles')
      .update({ org_id: null, role: null })
      .eq('id', userId)
      .eq('org_id', orgId);
    
    if (error) return { error: error.message };
    return { error: null };
  },

  acceptInvite: async (token) => {
    const { user } = get();
    if (!user) return { error: 'Usuário não autenticado' };
    
    const { data, error } = await supabase
      .rpc('accept_org_invite', {
        p_token: token,
        p_user_id: user.id,
      });
    
    if (error || !data?.[0]?.success) {
      return { error: error?.message || data?.[0]?.message || 'Erro ao aceitar convite' };
    }
    
    // Refresh session para pegar novo JWT com org_id
    const { error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) return { error: refreshError.message };
    
    return { 
      error: null, 
      orgId: data[0].org_id, 
      role: data[0].role 
    };
  },
}));

export const useOrgId = () => useAuthStore(s => s.orgId);
export const useRole = () => useAuthStore(s => s.role);
