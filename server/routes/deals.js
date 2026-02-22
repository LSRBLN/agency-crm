// deals.js - Deals/Pipeline Supabase version
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

// GET all deals
router.get('/', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const { data, error } = await supabase
            .from('deals')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        console.error('Error fetching deals:', err.message);
        res.status(500).json({ error: 'Deals konnten nicht geladen werden' });
    }
});

// GET single deal
router.get('/:id', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const { data, error } = await supabase
            .from('deals')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(404).json({ error: 'Deal nicht gefunden' });
    }
});

// POST create deal
router.post('/', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const newDeal = {
            ...req.body,
            created_at: new Date(),
            stage: req.body.stage || 'new',
            probability: req.body.probability || 10
        };

        const { data, error } = await supabase
            .from('deals')
            .insert([newDeal])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (err) {
        console.error('Error creating deal:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// PUT update deal
router.put('/:id', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const { data, error } = await supabase
            .from('deals')
            .update({ ...req.body, updated_at: new Date() })
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('Error updating deal:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// DELETE deal
router.delete('/:id', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const { error } = await supabase
            .from('deals')
            .delete()
            .eq('id', req.params.id);

        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting deal:', err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
