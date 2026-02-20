const express = require('express');
const auth = require('../middleware/auth');
// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // Stripe SDK initialization
const router = express.Router();

// Generate a payment link for setup fees
router.post('/payment-link', auth, async (req, res) => {
  try {
    const { leadId, amount, description } = req.body;
    const simulatedUrl = `https://checkout.stripe.demo/pay/setup-${leadId}?amount=${amount}&currency=eur`;
    return res.json({ url: simulatedUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Specific endpoint for Audit Fee (500€) - One-Click Integration
router.post('/audit-fee', auth, async (req, res) => {
  try {
    const { leadId } = req.body;
    const amount = 500;
    const simulatedUrl = `https://checkout.stripe.demo/pay/audit-${leadId}?amount=${amount}&currency=eur&items=ai-trust-audit`;
    return res.json({ url: simulatedUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
