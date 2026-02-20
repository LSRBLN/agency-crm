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

// Send an outreach email
router.post('/:id/send', auth, async (req, res) => {
    try {
        const draft = await Outreach.findById(req.params.id);
        if (!draft) return res.status(404).json({ error: 'Draft not found' });

        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            return res.status(400).json({
                error: 'SMTP not configured',
                message: 'Set SMTP_USER and SMTP_PASS environment variables to enable email sending'
            });
        }

        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        // Get the lead for email address
        const lead = await Lead.findById(draft.leadId);
        if (!lead || !lead.email) {
            return res.status(400).json({ error: 'Lead has no email address' });
        }

        await transporter.sendMail({
            from: `"Anti-Gravity Agency" <${process.env.SMTP_USER}>`,
            to: lead.email,
            subject: draft.subject || `Ihre digitale Sichtbarkeit in Berlin Wedding`,
            html: draft.body || draft.content,
            text: draft.plainText || draft.body?.replace(/<[^>]*>/g, '') || ''
        });

        // Update draft status
        draft.status = 'sent';
        draft.sentAt = new Date();
        await draft.save();

        res.json({
            success: true,
            message: `Email sent to ${lead.email}`,
            sentAt: draft.sentAt
        });
    } catch (error) {
        console.error('[OUTREACH] Send error:', error.message);
        res.status(500).json({ error: error.message });
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
