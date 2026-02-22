// tickets.js - Service Tickets Supabase version
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

// GET all tickets
router.get('/', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const { data, error } = await supabase
            .from('tickets')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        console.error('Error fetching tickets:', err.message);
        res.status(500).json({ error: 'Tickets konnten nicht geladen werden' });
    }
});

// GET single ticket
router.get('/:id', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const { data, error } = await supabase
            .from('tickets')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(404).json({ error: 'Ticket nicht gefunden' });
    }
});

// POST create ticket
router.post('/', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const newTicket = {
            ...req.body,
            created_at: new Date(),
            status: req.body.status || 'open',
            priority: req.body.priority || 'medium'
        };

        const { data, error } = await supabase
            .from('tickets')
            .insert([newTicket])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (err) {
        console.error('Error creating ticket:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// PUT update ticket
router.put('/:id', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const { data, error } = await supabase
            .from('tickets')
            .update({ ...req.body, updated_at: new Date() })
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('Error updating ticket:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// DELETE ticket
router.delete('/:id', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const { error } = await supabase
            .from('tickets')
            .delete()
            .eq('id', req.params.id);

        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting ticket:', err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
