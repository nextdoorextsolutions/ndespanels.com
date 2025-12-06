import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-11-17.clover' as any,
});

// Initialize Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const config = {
  api: {
    bodyParser: false, // Required for Stripe webhook signature verification
  },
};

// Helper to read raw body
async function getRawBody(req: VercelRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    console.error('[Webhook] Missing signature or webhook secret');
    return res.status(400).send('Webhook signature verification failed');
  }

  let event: Stripe.Event;
  let rawBody: Buffer;

  try {
    rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error('[Webhook] Signature verification failed:', err.message);
    // Security fix: Return generic error message to prevent information disclosure
    return res.status(400).send('Webhook signature verification failed');
  }

  // Handle test events
  if (event.id.startsWith('evt_test_')) {
    console.log('[Webhook] Test event detected, returning verification response');
    return res.json({ verified: true });
  }

  console.log('[Webhook] Received event:', event.type);

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const requestId = session.metadata?.request_id;

        if (requestId && supabaseUrl && supabaseServiceKey) {
          const supabase = createClient(supabaseUrl, supabaseServiceKey);

          try {
            // Update the report request status
            const { error: updateError } = await supabase
              .from('report_requests')
              .update({
                payment_status: 'paid',
                amount_paid: session.amount_total || 19900,
                stripe_payment_intent_id: session.payment_intent as string,
              })
              .eq('id', parseInt(requestId));

            if (updateError) {
              console.error('[Webhook] Failed to update report request:', updateError);
            }

            // Get the request details for notification
            const { data: request, error: fetchError } = await supabase
              .from('report_requests')
              .select('*')
              .eq('id', parseInt(requestId))
              .single();

            if (fetchError) {
              console.error('[Webhook] Failed to fetch report request:', fetchError);
            }

            if (request) {
              // Log successful payment
              console.log('[Webhook] Payment processed for request:', requestId, {
                customer: request.full_name,
                amount: session.amount_total,
              });

              // Note: Email and SMS notifications would be sent here
              // For now, we log the successful payment
            }
          } catch (dbError: any) {
            // Stability fix: Catch database errors to prevent crash loops
            console.error('[Webhook] Database operation failed:', dbError.message);
            // Don't throw - we still want to acknowledge the webhook
          }
        }
        break;
      }
      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    return res.json({ received: true });
  } catch (error: any) {
    // Stability fix: Catch any unhandled errors
    console.error('[Webhook] Handler error:', error.message);
    // Still return 200 to acknowledge receipt and prevent retries
    return res.json({ received: true, error: 'Handler error logged' });
  }
}
