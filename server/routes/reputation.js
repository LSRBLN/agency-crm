const express = require('express');
const { sendReviewRequest } = require('../services/reputationService');
const auth = require('../middleware/auth');
const router = express.Router();

// Trigger an automated review blast for a client
router.post('/blast', auth, async (req, res) => {
    try {
        const { leadId, companyName, clientEmail } = req.body;
        if (!clientEmail) return res.status(400).json({ error: 'Client-Email erforderlich' });

        const result = await sendReviewRequest(leadId, { companyName, email: clientEmail });
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
