import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CancelSubscriptionRequest {
  subscriptionId?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonResponse({ error: 'Unauthorized' }, 401);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const { subscriptionId }: CancelSubscriptionRequest = await req.json().catch(() => ({}));
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile?.org_id) return jsonResponse({ error: 'No organization found' }, 400);

    let query = supabaseClient
      .from('org_subscriptions')
      .select('id, stripe_subscription_id')
      .eq('org_id', profile.org_id)
      .in('status', ['trialing', 'active', 'past_due', 'incomplete'])
      .not('stripe_subscription_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1);

    if (subscriptionId) query = query.eq('id', subscriptionId);

    const { data: subscription, error: subscriptionError } = await query.maybeSingle();
    if (subscriptionError) throw subscriptionError;
    if (!subscription?.stripe_subscription_id) {
      return jsonResponse({ error: 'No active subscription' }, 404);
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) throw new Error('STRIPE_SECRET_KEY not configured');

    const stripeRes = await fetch(
      `https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscription.stripe_subscription_id)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ cancel_at_period_end: 'true' }),
      }
    );

    const stripeSubscription = await stripeRes.json();
    if (!stripeRes.ok || stripeSubscription.error) {
      throw new Error(stripeSubscription.error?.message ?? 'Erro ao cancelar assinatura no Stripe');
    }

    const { error: updateError } = await supabaseClient
      .from('org_subscriptions')
      .update({
        status: stripeSubscription.status,
        cancel_at_period_end: Boolean(stripeSubscription.cancel_at_period_end),
        current_period_start: toIso(stripeSubscription.current_period_start),
        current_period_end: toIso(stripeSubscription.current_period_end),
      })
      .eq('id', subscription.id)
      .eq('org_id', profile.org_id);

    if (updateError) throw updateError;

    return jsonResponse({ success: true });
  } catch (error) {
    console.error('stripe-cancel-subscription error:', error);
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro ao cancelar assinatura' }, 500);
  }
});

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function toIso(timestamp: number | null | undefined): string | null {
  return typeof timestamp === 'number' ? new Date(timestamp * 1000).toISOString() : null;
}
