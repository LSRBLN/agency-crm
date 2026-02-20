const express = require('express');
const Outreach = require('../models/Outreach');
const Lead = require('../models/Lead');
const Audit = require('../models/Audit');
const auth = require('../middleware/auth');
const { interpolateTemplate } = require('../utils/emailTemplates');
const router = express.Router();

// Get all outreach drafts
router.get('/', auth, async (req, res) => {
    try {
        const drafts = await Outreach.find().sort({ createdAt: -1 });
        res.json(drafts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create outreach draft (triggered after audit)
router.post('/', auth, async (req, res) => {
    try {
        const { leadId, auditId, templateKey = 'aiGuilt' } = req.body;
        const lead = await Lead.findById(leadId);
        if (!lead) return res.status(404).json({ error: 'Lead nicht gefunden' });

        const audit = auditId ? await Audit.findById(auditId) : await Audit.findOne({ leadId }).sort({ createdAt: -1 });

        // Define pricing structure based on pitch type
        const pricing = {
            aiGuilt: 950,
            voiceAgent: 1450,
            quickWin: 450,
            highTicket: 1950
        };
        const amount = pricing[templateKey] || 950;

        const variables = {
            companyName: lead.companyName,
            websiteUrl: lead.websiteUrl,
            score: audit?.totalScore || '?',
            competitor: audit?.aeoCompetitor || 'Ihr Wettbewerber',
            auditLink: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/audit/${lead._id}`,
            setupFeeLink: `https://checkout.stripe.demo/pay/setup-${lead._id}?amount=${amount}&currency=eur`,
        };

        const email = interpolateTemplate(templateKey, variables);
        if (!email) return res.status(400).json({ error: 'Template nicht gefunden' });

        const draft = await Outreach.create({
            leadId,
            auditId: audit?._id,
            companyName: lead.companyName,
            email: lead.email,
            subject: email.subject,
            body: email.body,
            status: 'draft',
        });

        res.status(201).json(draft);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Update draft status (e.g., mark as sent)
router.patch('/:id', auth, async (req, res) => {
    try {
        const draft = await Outreach.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!draft) return res.status(404).json({ error: 'Entwurf nicht gefunden' });
        res.json(draft);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;
