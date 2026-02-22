const express = require('express');
const { sendReviewRequest } = require('../services/reputationService');
const auth = require('../middleware/auth');
const { supabase } = require('../services/supabaseClient');
const router = express.Router();

const checklist = [
    'GBP Kategorie korrekt setzen',
    'Unternehmensbeschreibung mit Keywords',
    'NAP-Daten konsistent halten',
    'Öffnungszeiten vollständig pflegen',
    'Leistungsbereiche definieren',
    'Leistungen/Produkte mit Text anlegen',
    'Primäre Conversion-Ziele hinterlegen',
    'Q&A-Bereich aktiv befüllen',
    'Wöchentliche GBP-Posts planen',
    'Bilder regelmäßig aktualisieren',
    'Bewertungslink prominent platzieren',
    'Automatisierte Review-Anfrage aktivieren',
    'Negative Reviews mit SOP beantworten',
    'Top-Keywords in Antworten nutzen',
    'Lokale Landingpages auf GBP verlinken',
    'Monatliches Review-Reporting erstellen',
];

function ensureDb(res) {
    if (!supabase) {
        res.status(503).json({ error: 'Datenbank nicht konfiguriert' });
        return false;
    }
    return true;
}

router.get('/checklist', auth, async (req, res) => {
    res.json({
        total: checklist.length,
        items: checklist.map((label, index) => ({
            id: index + 1,
            label,
        })),
    });
});

router.get('/checklist/:contactId/progress', auth, async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const { data, error } = await supabase
            .from('activities')
            .select('*')
            .eq('type', 'reputation_checklist')
            .eq('contact_id', req.params.contactId)
            .order('created_at', { ascending: false })
            .limit(1);

        if (error) throw error;

        const record = Array.isArray(data) && data.length ? data[0] : null;
        let details = { doneIds: [] };
        if (record?.description) {
            try {
                details = JSON.parse(record.description);
            } catch {
                details = { doneIds: [] };
            }
        }

        res.json({
            contactId: req.params.contactId,
            doneIds: Array.isArray(details.doneIds) ? details.doneIds : [],
            updatedAt: record?.created_at || null,
        });
    } catch (err) {
        res.status(500).json({ error: 'Checklist-Progress konnte nicht geladen werden' });
    }
});

router.post('/checklist/:contactId/progress', auth, async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const doneIds = Array.isArray(req.body.doneIds) ? req.body.doneIds : [];
        const payload = {
            title: 'Reputation Checklist Progress',
            type: 'reputation_checklist',
            description: JSON.stringify({ doneIds, updatedAt: new Date().toISOString() }),
            completed: doneIds.length >= checklist.length,
            contact_id: req.params.contactId,
            created_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
            .from('activities')
            .insert([payload])
            .select('*')
            .single();

        if (error || !data) {
            throw error || new Error('Progress konnte nicht gespeichert werden');
        }

        res.json({ success: true, doneIds });
    } catch (err) {
        res.status(500).json({ error: 'Checklist-Progress konnte nicht gespeichert werden' });
    }
});

// Trigger an automated review blast for a client
router.post('/blast', auth, async (req, res) => {
    try {
        const businessName = req.body.businessName || req.body.companyName;
        const customerEmails = req.body.customerEmails || (req.body.clientEmail ? [req.body.clientEmail] : []);
        const googleReviewLink = req.body.googleReviewLink;
        const industry = req.body.industry;
        const keywords = req.body.keywords;

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
