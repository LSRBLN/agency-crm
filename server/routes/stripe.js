const express = require('express');
const auth = require('../middleware/auth');
const router = express.Router();

// Initialize Stripe only if key is configured
const stripe = process.env.STRIPE_SECRET_KEY
  ? require('stripe')(process.env.STRIPE_SECRET_KEY)
  : null;

// POST /create-checkout - Create a Stripe Checkout Session
router.post('/create-checkout', auth, async (req, res) => {
  try {
    const { leadId, amount, description, successUrl, cancelUrl } = req.body;

    if (!stripe) {
      // Graceful fallback when Stripe is not configured
      const simulatedUrl = `https://checkout.stripe.demo/pay/setup-${leadId}?amount=${amount}&currency=eur`;
      return res.json({
        url: simulatedUrl,
        mode: 'demo',
        message: 'STRIPE_SECRET_KEY not configured - returning demo URL'
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: description || `Service für Lead ${leadId}`,
            },
            unit_amount: Math.round((amount || 0) * 100), // convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl || `${process.env.CLIENT_URL || 'http://localhost:3000'}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.CLIENT_URL || 'http://localhost:3000'}/payment-cancelled`,
      metadata: {
        leadId: leadId || '',
      },
    });

    return res.json({ url: session.url, sessionId: session.id, mode: 'live' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate a payment link for setup fees (legacy endpoint)
router.post('/payment-link', auth, async (req, res) => {
  try {
    const { leadId, amount, description } = req.body;

    if (!stripe) {
      const simulatedUrl = `https://checkout.stripe.demo/pay/setup-${leadId}?amount=${amount}&currency=eur`;
      return res.json({ url: simulatedUrl, mode: 'demo' });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: description || `Setup Fee - Lead ${leadId}`,
            },
            unit_amount: Math.round((amount || 0) * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.CLIENT_URL || 'http://localhost:3000'}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL || 'http://localhost:3000'}/payment-cancelled`,
      metadata: { leadId: leadId || '' },
    });

    return res.json({ url: session.url, sessionId: session.id, mode: 'live' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Specific endpoint for Audit Fee (500€) - One-Click Integration
router.post('/audit-fee', auth, async (req, res) => {
  try {
    const { leadId } = req.body;
    const amount = 500;

    if (!stripe) {
      const simulatedUrl = `https://checkout.stripe.demo/pay/audit-${leadId}?amount=${amount}&currency=eur&items=ai-trust-audit`;
      return res.json({ url: simulatedUrl, mode: 'demo' });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'AI Trust Audit',
              description: 'Vollständiger KI-gestützter Sichtbarkeits-Audit',
            },
            unit_amount: amount * 100, // 500 EUR in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.CLIENT_URL || 'http://localhost:3000'}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL || 'http://localhost:3000'}/payment-cancelled`,
      metadata: { leadId: leadId || '', product: 'ai-trust-audit' },
    });

    return res.json({ url: session.url, sessionId: session.id, mode: 'live' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /webhook - Stripe webhook handler
// Note: This route requires raw body parsing - configure express.raw() for this path in server.js
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe) {
    console.warn('[STRIPE] Webhook received but Stripe is not configured');
    return res.json({ received: true, mode: 'demo' });
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      // No webhook secret configured - parse body directly (dev only)
      event = JSON.parse(req.body.toString());
      console.warn('[STRIPE] Webhook signature not verified - STRIPE_WEBHOOK_SECRET not set');
    }
  } catch (err) {
    console.error('[STRIPE] Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      console.log('[STRIPE] Payment completed:', {
        sessionId: session.id,
        leadId: session.metadata?.leadId,
        amount: session.amount_total,
        currency: session.currency
      });
      // TODO: Update lead status in database, trigger onboarding workflow
      break;
    }
    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object;
      console.warn('[STRIPE] Payment failed:', paymentIntent.id);
      break;
    }
    default:
      console.log(`[STRIPE] Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
});

module.exports = router;
