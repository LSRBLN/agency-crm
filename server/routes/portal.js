const express = require('express');
const auth = require('../middleware/auth');
const { supabase } = require('../services/supabaseClient');
const router = express.Router();

// Get client portal data (progress overview)
router.get('/', auth, async (req, res) => {
    try {
        if (!supabase) {
            return res.json(getDemoPortalData());
        }

        const [contactsResult, auditsResult] = await Promise.all([
            supabase.from('contacts').select('*'),
            supabase.from('audits').select('*')
        ]);

        if (contactsResult.error || auditsResult.error) {
            return res.json(getDemoPortalData());
        }

        const contacts = contactsResult.data || [];
        const audits = auditsResult.data || [];

        const totalLeads = contacts.length;
        const totalAudits = audits.length;
        const highPriority = contacts.filter((contact) => String(contact.priority || '').toLowerCase() === 'high').length;
        const scoredAudits = audits.filter((audit) => typeof audit.totalScore === 'number');
        const averageScore = scoredAudits.length
            ? scoredAudits.reduce((sum, audit) => sum + audit.totalScore, 0) / scoredAudits.length
            : 0;

        res.json({
            totalLeads,
            totalAudits,
            highPriority,
            averageScore,
        });
    } catch (err) {
        res.json(getDemoPortalData());
    }
});

function getDemoPortalData() {
    return {
        totalLeads: 5,
        totalAudits: 3,
        highPriority: 2,
        averageScore: 61.7,
    };
}

module.exports = router;
