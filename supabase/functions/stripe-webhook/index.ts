import { createClient } from '@supabase/supabase-js';
import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'stripe-signature, content-type',
};

async function verifyStripeSignature(payload: string, signature: string, secret: string): Promise<boolean> {
  const parts = signature.split(',');
  const timestamps = parts.filter(p => p.startsWith('t='));
  const signatures = parts.filter(p => p.startsWith('v1='));
  
  if (timestamps.length === 0 || signatures.length === 0) return false;
  
  const timestamp = timestamps[0].split('=')[1];
  const signedPayload = `${timestamp}.${payload}`;
  
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signatureBytes = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(signedPayload)
  );
  
  const expectedSignature = Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return signatures.some(s => {
    const sig = s.split('=')[1];
    return sig === expectedSignature;
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!webhookSecret) {
    return new Response(JSON.stringify({ error: 'Webhook secret not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const payload = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return new Response(JSON.stringify({ error: 'Missing signature' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verificar assinatura (fail-closed)
    const isValid = await verifyStripeSignature(payload, signature, webhookSecret);
    if (!isValid) {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const event = JSON.parse(payload);
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const { org_id, plan_id } = session.subscription_data?.metadata || {};
        
        if (org_id && plan_id) {
          await supabaseAdmin
            .from('org_subscriptions')
            .update({
              stripe_subscription_id: session.subscription,
              status: 'active',
              current_period_start: new Date(session.current_period_start * 1000).toISOString(),
              current_period_end: new Date(session.current_period_end * 1000).toISOString(),
            })
            .eq('org_id', org_id)
            .eq('status', 'incomplete');
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;
        
        if (subscriptionId) {
          const { data: sub } = await supabaseAdmin
            .from('org_subscriptions')
            .select('org_id')
            .eq('stripe_subscription_id', subscriptionId)
            .single();
          
          if (sub) {
            await supabaseAdmin.from('invoices').insert({
              org_id: sub.org_id,
              stripe_invoice_id: invoice.id,
              amount_due: invoice.amount_due,
              amount_paid: invoice.amount_paid,
              status: invoice.status,
              invoice_type: invoice.amount_due > 0 ? 'subscription' : 'overage',
              period_start: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
              period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
              paid_at: invoice.status === 'paid' ? new Date().toISOString() : null,
            });
          }
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const { org_id } = subscription.metadata || {};
        
        if (org_id) {
          await supabaseAdmin
            .from('org_subscriptions')
            .update({
              status: subscription.status,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              cancel_at_period_end: subscription.cancel_at_period_end,
            })
            .eq('stripe_subscription_id', subscription.id);
        }
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: 'Webhook processing failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
