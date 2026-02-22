const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { supabase } = require('../services/supabaseClient');
const { getTrafficAndEngagement, compareDomains, normalizeDomain } = require('../services/similarwebService');

router.use(auth);

function ensureDb(res) {
    if (!supabase) {
        res.status(503).json({ error: 'Datenbank nicht konfiguriert' });
        return false;
    }
    return true;
}

router.get('/overview', async (req, res) => {
    try {
        const domain = normalizeDomain(req.query.domain);
        if (!domain) return res.status(400).json({ error: 'domain ist erforderlich' });

        const data = await getTrafficAndEngagement(domain, {
            country: req.query.country || 'world',
            startDate: req.query.start_date,
            endDate: req.query.end_date,
        });

        res.json(data);
    } catch (err) {
        const status = err.status || 500;
        res.status(status).json({ error: err.message || 'Similarweb overview fehlgeschlagen' });
    }
});

router.get('/compare', async (req, res) => {
    try {
        const domain = normalizeDomain(req.query.domain);
        const competitor = normalizeDomain(req.query.competitor);

        if (!domain || !competitor) {
            return res.status(400).json({ error: 'domain und competitor sind erforderlich' });
        }

        const data = await compareDomains(domain, competitor, {
            country: req.query.country || 'world',
            startDate: req.query.start_date,
            endDate: req.query.end_date,
        });

        res.json(data);
    } catch (err) {
        const status = err.status || 500;
        res.status(status).json({ error: err.message || 'Similarweb Vergleich fehlgeschlagen' });
    }
});

router.post('/enrich/:contactId', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const contactId = req.params.contactId;
        const domain = normalizeDomain(req.body?.domain || req.query.domain);
        const competitor = normalizeDomain(req.body?.competitor || req.query.competitor || '');

        if (!contactId) {
            return res.status(400).json({ error: 'contactId ist erforderlich' });
        }

        if (!domain) {
            return res.status(400).json({ error: 'domain ist erforderlich' });
        }

        const overview = await getTrafficAndEngagement(domain, {
            country: req.body?.country || req.query.country || 'world',
            startDate: req.body?.start_date || req.query.start_date,
            endDate: req.body?.end_date || req.query.end_date,
        });

        let comparison = null;
        if (competitor) {
            comparison = await compareDomains(domain, competitor, {
                country: req.body?.country || req.query.country || 'world',
                startDate: req.body?.start_date || req.query.start_date,
                endDate: req.body?.end_date || req.query.end_date,
            });
        }

        const snapshot = {
            domain,
            competitor: competitor || null,
            enrichedAt: new Date().toISOString(),
            summary: overview.summary,
            overview,
            comparison,
        };

        const { data: activity, error: activityError } = await supabase
            .from('activities')
            .insert([{
                title: `Similarweb Snapshot ${domain}`,
                type: 'similarweb_enrichment',
                description: JSON.stringify(snapshot),
                completed: true,
                contact_id: contactId,
                created_at: new Date().toISOString(),
            }])
            .select('*')
            .single();

        if (activityError || !activity) {
            throw activityError || new Error('Snapshot konnte nicht gespeichert werden');
        }

        res.status(201).json({
            success: true,
            contactId,
            snapshot,
            activityId: activity.id,
        });
    } catch (err) {
        const status = err.status || 500;
        res.status(status).json({ error: err.message || 'Similarweb Enrichment fehlgeschlagen' });
    }
});

router.get('/history', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const contactId = req.query.contactId;
        if (!contactId) {
            return res.status(400).json({ error: 'contactId ist erforderlich' });
        }

        const { data, error } = await supabase
            .from('activities')
            .select('*')
            .eq('type', 'similarweb_enrichment')
            .eq('contact_id', contactId)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) throw error;

        const items = (data || []).map((record) => {
            let snapshot = {};
            try {
                snapshot = record.description ? JSON.parse(record.description) : {};
            } catch {
                snapshot = {};
            }

            return {
                id: record.id,
                contactId: record.contact_id,
                domain: snapshot.domain || null,
                competitor: snapshot.competitor || null,
                enrichedAt: snapshot.enrichedAt || record.created_at,
                latestVisits: snapshot.summary?.latestVisits || 0,
                directShare: snapshot.summary?.directShare || 0,
                searchShare: snapshot.summary?.searchShare || 0,
            };
        });

        res.json({ items });
    } catch (err) {
        res.status(500).json({ error: 'Similarweb History konnte nicht geladen werden' });
    }
});

module.exports = router;
