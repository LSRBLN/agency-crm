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

function parseDescription(description) {
    if (!description || typeof description !== 'string') {
        return {};
    }

    try {
        return JSON.parse(description);
    } catch {
        return {};
    }
}

function mapOutreach(record) {
    const details = parseDescription(record.description);
    return {
        _id: record.id,
        templateName: record.title,
        subject: details.subject || record.title,
        channel: details.channel || 'email',
        status: details.status || 'draft',
        sentAt: details.sentAt || null,
        recipient: details.recipient || '',
        messages: Array.isArray(details.messages) ? details.messages : [],
        createdAt: record.created_at,
    };
}

// GET all outreach
router.get('/', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const { data, error } = await supabase
            .from('activities')
            .select('*')
            .eq('type', 'outreach')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json((data || []).map(mapOutreach));
    } catch (err) {
        res.status(500).json({ error: 'Outreach konnte nicht geladen werden' });
    }
});

// POST create outreach
router.post('/', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const payload = {
            title: req.body.templateName || req.body.subject || 'Outreach',
            type: 'outreach',
            description: JSON.stringify({
                subject: req.body.subject || req.body.templateName || 'Outreach',
                recipient: req.body.recipient || '',
                channel: req.body.channel || 'email',
                status: req.body.status || 'draft',
                sentAt: req.body.sentAt || null,
                messages: Array.isArray(req.body.messages) ? req.body.messages : [],
            }),
            completed: false,
        };

        const { data, error } = await supabase
            .from('activities')
            .insert([payload])
            .select('*')
            .single();

        if (error || !data) {
            throw error || new Error('Outreach konnte nicht erstellt werden');
        }

        res.status(201).json(mapOutreach(data));
    } catch (err) {
        res.status(500).json({ error: 'Outreach konnte nicht erstellt werden' });
    }
});

// POST send outreach
router.post('/:id/send', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const { data: existing, error: existingError } = await supabase
            .from('activities')
            .select('*')
            .eq('id', req.params.id)
            .eq('type', 'outreach')
            .single();

        if (existingError || !existing) {
            return res.status(404).json({ error: 'Outreach nicht gefunden' });
        }

        const details = parseDescription(existing.description);
        const sentAt = new Date().toISOString();
        const updatedDescription = JSON.stringify({
            ...details,
            status: 'sent',
            sentAt,
        });

        const { data, error } = await supabase
            .from('activities')
            .update({
                description: updatedDescription,
                completed: true,
                due_date: sentAt,
            })
            .eq('id', req.params.id)
            .select('*')
            .single();

        if (error || !data) {
            throw error || new Error('Outreach konnte nicht versendet werden');
        }

        res.json(mapOutreach(data));
    } catch (err) {
        res.status(500).json({ error: 'Outreach konnte nicht versendet werden' });
    }
});

router.post('/:id/message', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const { data: existing, error: existingError } = await supabase
            .from('activities')
            .select('*')
            .eq('id', req.params.id)
            .eq('type', 'outreach')
            .single();

        if (existingError || !existing) {
            return res.status(404).json({ error: 'Outreach nicht gefunden' });
        }

        const details = parseDescription(existing.description);
        const messages = Array.isArray(details.messages) ? details.messages : [];
        const text = String(req.body.text || '').trim();

        if (!text) {
            return res.status(400).json({ error: 'text ist erforderlich' });
        }

        messages.push({
            direction: req.body.direction || 'inbound',
            channel: req.body.channel || details.channel || 'email',
            text,
            at: new Date().toISOString(),
        });

        const updatedDescription = JSON.stringify({
            ...details,
            messages,
        });

        const { data, error } = await supabase
            .from('activities')
            .update({ description: updatedDescription })
            .eq('id', req.params.id)
            .select('*')
            .single();

        if (error || !data) {
            throw error || new Error('Nachricht konnte nicht gespeichert werden');
        }

        res.json(mapOutreach(data));
    } catch (err) {
        res.status(500).json({ error: 'Nachricht konnte nicht gespeichert werden' });
    }
});

router.post('/:id/auto-followup', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const { data: existing, error: existingError } = await supabase
            .from('activities')
            .select('*')
            .eq('id', req.params.id)
            .eq('type', 'outreach')
            .single();

        if (existingError || !existing) {
            return res.status(404).json({ error: 'Outreach nicht gefunden' });
        }

        const details = parseDescription(existing.description);
        const messages = Array.isArray(details.messages) ? details.messages : [];
        const recipient = details.recipient || 'Interessent';
        const followUpText = `Hallo ${recipient}, nur eine kurze Rückmeldung zu meiner letzten Nachricht. Wenn es passt, können wir direkt einen Termin abstimmen.`;

        messages.push({
            direction: 'outbound',
            channel: details.channel || 'email',
            text: followUpText,
            automated: true,
            at: new Date().toISOString(),
        });

        const updatedDescription = JSON.stringify({
            ...details,
            status: 'followup_sent',
            messages,
        });

        const { data, error } = await supabase
            .from('activities')
            .update({
                description: updatedDescription,
                due_date: new Date().toISOString(),
            })
            .eq('id', req.params.id)
            .select('*')
            .single();

        if (error || !data) {
            throw error || new Error('Auto-Follow-up fehlgeschlagen');
        }

        res.json(mapOutreach(data));
    } catch (err) {
        res.status(500).json({ error: 'Auto-Follow-up fehlgeschlagen' });
    }
});

module.exports = router;
