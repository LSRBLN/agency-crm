const express = require('express');
const auth = require('../middleware/auth');
// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // Stripe SDK initialization
const router = express.Router();

// Generate a payment link for setup fees
router.post('/payment-link', auth, async (req, res) => {
    try {
        const { leadId, amount, description } = req.body;

        // In a real environment with Stripe API Key:
        /*
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [{
            price_data: {
              currency: 'eur',
              product_data: { name: description || 'AI Strategy Setup' },
              unit_amount: amount * 100, // Stripe expects cents
            },
            quantity: 1,
          }],
          mode: 'payment',
          success_url: `${process.env.FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${process.env.FRONTEND_URL}/payment-cancelled`,
          metadata: { leadId },
        });
        return res.json({ url: session.url });
        */

        // Placeholder simulation for the GitHub pack setup
        const simulatedUrl = `https://checkout.stripe.demo/pay/setup-${leadId}?amount=${amount}&currency=eur`;
        return res.json({ url: simulatedUrl });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
