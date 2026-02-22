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
        const from = req.query.from;
        const to = req.query.to;

        let query = supabase
            .from('calendar_events')
            .select('*')
            .order('start_time', { ascending: true });

        if (from) {
            query = query.gte('start_time', from);
        }

        if (to) {
            query = query.lte('start_time', to);
        }

        const { data, error } = await query;
        if (error) throw error;

        res.json(data || []);
    } catch (err) {
        console.error('Error fetching calendar events:', err.message);
        res.status(500).json({ error: 'Kalendertermine konnten nicht geladen werden' });
    }
});

router.get('/:id', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const { data, error } = await supabase
            .from('calendar_events')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (error || !data) {
            return res.status(404).json({ error: 'Termin nicht gefunden' });
        }

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'Termin konnte nicht geladen werden' });
    }
});

router.post('/', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const payload = {
            title: req.body.title,
            description: req.body.description || null,
            start_time: req.body.start_time,
            end_time: req.body.end_time || null,
            all_day: Boolean(req.body.all_day),
            color: req.body.color || null,
            contact_id: req.body.contact_id || null,
            deal_id: req.body.deal_id || null,
            created_at: new Date().toISOString(),
        };

        if (!payload.title || !payload.start_time) {
            return res.status(400).json({ error: 'title und start_time sind erforderlich' });
        }

        const { data, error } = await supabase
            .from('calendar_events')
            .insert([payload])
            .select('*')
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (err) {
        console.error('Error creating calendar event:', err.message);
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const payload = {
            ...req.body,
            contact_id: req.body.contact_id || null,
            deal_id: req.body.deal_id || null,
        };

        const { data, error } = await supabase
            .from('calendar_events')
            .update(payload)
            .eq('id', req.params.id)
            .select('*')
            .single();

        if (error || !data) {
            return res.status(404).json({ error: 'Termin nicht gefunden' });
        }

        res.json(data);
    } catch (err) {
        console.error('Error updating calendar event:', err.message);
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const { error } = await supabase
            .from('calendar_events')
            .delete()
            .eq('id', req.params.id);

        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting calendar event:', err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
