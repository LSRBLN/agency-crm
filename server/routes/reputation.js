const express = require('express');
const { sendReviewRequest } = require('../services/reputationService');
const auth = require('../middleware/auth');
const router = express.Router();

// Trigger an automated review blast for a client
router.post('/blast', auth, async (req, res) => {
    try {
        const { businessName, customerEmails, googleReviewLink, industry, keywords } = req.body;
        if (!businessName) return res.status(400).json({ error: 'businessName erforderlich' });

        const result = await sendReviewRequest(
            businessName,
            customerEmails,
            googleReviewLink,
            industry,
            keywords
        );
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
