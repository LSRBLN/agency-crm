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
        const industry = String(req.query.industry || '').trim();

        let dbQuery = supabase
            .from('companies')
            .select('*')
            .order('created_at', { ascending: false });

        if (query) {
            dbQuery = dbQuery.or(`name.ilike.%${query}%,website.ilike.%${query}%,industry.ilike.%${query}%,city.ilike.%${query}%`);
        }

        if (industry && industry !== 'all') {
            dbQuery = dbQuery.eq('industry', industry);
        }

        const { data, error } = await dbQuery;

        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        console.error('Error fetching companies:', err.message);
        res.status(500).json({ error: 'Firmen konnten nicht geladen werden' });
    }
});

router.get('/:id', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const { data, error } = await supabase
            .from('companies')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(404).json({ error: 'Firma nicht gefunden' });
    }
});

router.post('/', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const payload = {
            name: req.body.name,
            website: req.body.website || null,
            industry: req.body.industry || null,
            address: req.body.address || null,
            city: req.body.city || null,
            phone: req.body.phone || null,
            email: req.body.email || null,
            notes: req.body.notes || null,
            created_at: new Date(),
            updated_at: new Date(),
        };

        const { data, error } = await supabase
            .from('companies')
            .insert([payload])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (err) {
        console.error('Error creating company:', err.message);
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
            .from('companies')
            .update(payload)
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('Error updating company:', err.message);
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const { error } = await supabase
            .from('companies')
            .delete()
            .eq('id', req.params.id);

        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting company:', err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
