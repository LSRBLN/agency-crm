const express = require('express');
const router = express.Router();
const { supabase } = require('../services/supabaseClient');
const auth = require('../middleware/auth');

router.use(auth);

function ensureDb(res) {
    if (!supabase) {
        res.status(503).json({ error: 'Datenbank nicht konfiguriert' });
        return false;
    }
    return true;
}

router.get('/', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const query = String(req.query.q || '').trim();
        const status = String(req.query.status || '').trim();

        let dbQuery = supabase
            .from('contacts')
            .select('*')
            .order('created_at', { ascending: false });

        if (query) {
            dbQuery = dbQuery.or(`name.ilike.%${query}%,email.ilike.%${query}%,company.ilike.%${query}%,phone.ilike.%${query}%`);
        }

        if (status && status !== 'all') {
            dbQuery = dbQuery.eq('status', status);
        }

        const { data, error } = await dbQuery;

        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        console.error('Error fetching contacts:', err.message);
        res.status(500).json({ error: 'Kontakte konnten nicht geladen werden' });
    }
});

router.get('/:id', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const { data, error } = await supabase
            .from('contacts')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(404).json({ error: 'Kontakt nicht gefunden' });
    }
});

router.post('/', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const name = req.body.name;
        const payload = {
            name,
            first_name: req.body.first_name || req.body.firstName || null,
            last_name: req.body.last_name || req.body.lastName || null,
            email: req.body.email || null,
            phone: req.body.phone || null,
            mobile_phone: req.body.mobile_phone || req.body.mobile || req.body.mobilePhone || null,
            company: req.body.company || null,
            position: req.body.position || null,
            status: req.body.status || 'lead',
            source: req.body.source || null,
            attribution_source: req.body.attribution_source || req.body.attributionSource || null,
            attribution_campaign: req.body.attribution_campaign || req.body.attributionCampaign || null,
            notes: req.body.notes || null,
            website: req.body.website || null,
            street_address: req.body.street_address || req.body.streetAddress || null,
            city: req.body.city || null,
            state: req.body.state || req.body.province || null,
            zip_code: req.body.zip_code || req.body.zip || req.body.postalCode || null,
            country: req.body.country || null,
            birthday: req.body.birthday || null,
            tags: Array.isArray(req.body.tags) ? req.body.tags : [],
            custom_fields: req.body.custom_fields || req.body.customFields || null,
            created_at: new Date(),
            updated_at: new Date(),
        };

        // If first/last not provided, try to infer from name for nicer defaults.
        if (!payload.first_name && !payload.last_name && typeof name === 'string') {
            const parts = name.trim().split(/\s+/).filter(Boolean);
            if (parts.length >= 2) {
                payload.first_name = parts.slice(0, -1).join(' ');
                payload.last_name = parts.slice(-1).join(' ');
            }
        }

        const { data, error } = await supabase
            .from('contacts')
            .insert([payload])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (err) {
        console.error('Error creating contact:', err.message);
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const payload = {
            ...req.body,
            updated_at: new Date(),
        };

        const { data, error } = await supabase
            .from('contacts')
            .update(payload)
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('Error updating contact:', err.message);
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const { error } = await supabase
            .from('contacts')
            .delete()
            .eq('id', req.params.id);

        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting contact:', err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
