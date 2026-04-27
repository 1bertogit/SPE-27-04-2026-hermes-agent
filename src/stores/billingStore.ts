import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './authStore';
import type { SubscriptionPlan, OrgSubscription, Invoice } from '../lib/types';

interface BillingState {
  plans: SubscriptionPlan[];
  currentSubscription: OrgSubscription | null;
  invoices: Invoice[];
  usage: {
    proceduresThisPeriod: number;
    includedProcedures: number;
    overageCount: number;
    overageCost: number;
  } | null;
  loading: boolean;
  error: string | null;
  
  fetchPlans: () => Promise<void>;
  fetchCurrentSubscription: () => Promise<void>;
  fetchInvoices: () => Promise<void>;
  fetchUsage: () => Promise<void>;
  createCheckoutSession: (planId: string) => Promise<{ sessionId: string; url: string } | null>;
  cancelSubscription: () => Promise<{ error?: string }>;
}

export const useBillingStore = create<BillingState>((set, get) => ({
  plans: [],
  currentSubscription: null,
  invoices: [],
  usage: null,
  loading: false,
  error: null,

  fetchPlans: async () => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('monthly_price');

      if (error) throw error;
      set({ plans: data || [], error: null });
    } catch (err) {
      set({ error: (err as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  fetchCurrentSubscription: async () => {
    const orgId = useAuthStore.getState().orgId;
    if (!orgId) return;

    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('org_subscriptions')
        .select(`
          *,
          plan:plan_id(*)
        `)
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      set({ currentSubscription: data, error: null });
    } catch (err) {
      set({ error: (err as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  fetchInvoices: async () => {
    const orgId = useAuthStore.getState().orgId;
    if (!orgId) return;

    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ invoices: data || [], error: null });
    } catch (err) {
      set({ error: (err as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  fetchUsage: async () => {
    const orgId = useAuthStore.getState().orgId;
    const subscription = get().currentSubscription;
    if (!orgId || !subscription?.plan) return;

    const plan = subscription.plan as SubscriptionPlan;
    const included = plan.included_procedures;
    const used = subscription.procedure_count_current_period || 0;
    const overage = Math.max(0, used - included);
    const overageCost = overage * plan.overage_price_per_procedure;

    set({
      usage: {
        proceduresThisPeriod: used,
        includedProcedures: included,
        overageCount: overage,
        overageCost: overageCost,
      },
    });
  },

  createCheckoutSession: async (planId: string) => {
    try {
      const successUrl = `${window.location.origin}/settings?tab=billing&success=true`;
      const cancelUrl = `${window.location.origin}/pricing?canceled=true`;

      const { data, error } = await supabase.functions.invoke('stripe-checkout', {
        body: { planId, successUrl, cancelUrl },
      });

      if (error) throw error;
      return data;
    } catch (err) {
      set({ error: (err as Error).message });
      return null;
    }
  },

  cancelSubscription: async () => {
    const subscription = get().currentSubscription;
    if (!subscription?.stripe_subscription_id) {
      return { error: 'No active subscription' };
    }

    try {
      // Aqui chamaria edge function para cancelar no Stripe
      // Por enquanto, apenas atualiza localmente
      const { error } = await supabase
        .from('org_subscriptions')
        .update({ cancel_at_period_end: true })
        .eq('id', subscription.id);

      if (error) throw error;
      
      await get().fetchCurrentSubscription();
      return {};
    } catch (err) {
      return { error: (err as Error).message };
    }
  },
}));
