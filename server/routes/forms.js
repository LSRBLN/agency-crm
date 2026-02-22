const express = require('express');
const { supabase } = require('../services/supabaseClient');
const auth = require('../middleware/auth');

const router = express.Router();

function ensureDb(res) {
    if (!supabase) {
        res.status(503).json({ error: 'Datenbank nicht konfiguriert' });
        return false;
    }
    return true;
}

function parseDescription(description) {
    if (!description || typeof description !== 'string') return {};
    try {
        return JSON.parse(description);
    } catch {
        return {};
    }
}

function mapForm(record) {
    const details = parseDescription(record.description);
    return {
        id: record.id,
        name: record.title,
        slug: details.slug || null,
        fields: Array.isArray(details.fields) ? details.fields : [],
        successMessage: details.successMessage || 'Danke! Wir melden uns zeitnah.',
        tags: Array.isArray(details.tags) ? details.tags : [],
        source: details.source || 'form_builder',
        createdAt: record.created_at,
    };
}

function normalizeSlug(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);
}

function normalizeSubmissionField(value) {
    if (value === undefined || value === null) return null;
    if (typeof value === 'string') return value.trim();
    return String(value);
}

router.post('/public/:slug/submit', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const slug = normalizeSlug(req.params.slug);
        if (!slug) {
            return res.status(400).json({ error: 'Form slug ist erforderlich' });
        }

        const { data: forms, error: formsError } = await supabase
            .from('activities')
            .select('*')
            .eq('type', 'lead_form')
            .order('created_at', { ascending: false });

        if (formsError) throw formsError;

        const formRecord = (forms || []).find((record) => {
            const details = parseDescription(record.description);
            return normalizeSlug(details.slug) === slug;
        });

        if (!formRecord) {
            return res.status(404).json({ error: 'Formular nicht gefunden' });
        }

        const details = parseDescription(formRecord.description);
        const payload = req.body || {};

        const name = normalizeSubmissionField(payload.name || payload.fullName || payload.contactName || payload.company || 'Neuer Lead');
        const email = normalizeSubmissionField(payload.email || payload.contactEmail);
        const phone = normalizeSubmissionField(payload.phone || payload.contactPhone);
        const company = normalizeSubmissionField(payload.company || payload.companyName);

        const contactPayload = {
            name,
            email,
            phone,
            company,
            position: normalizeSubmissionField(payload.position),
            status: 'lead',
            source: details.source || 'form_builder',
            notes: normalizeSubmissionField(payload.notes),
            tags: Array.isArray(details.tags) ? details.tags : [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        const { data: contact, error: contactError } = await supabase
            .from('contacts')
            .insert([contactPayload])
            .select('*')
            .single();

        if (contactError || !contact) {
            throw contactError || new Error('Lead konnte nicht erfasst werden');
        }

        const followupAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
        const taskPayload = {
            title: `Form Follow-up: ${contact.name}`,
            type: 'task',
            description: JSON.stringify({
                kind: 'form_followup',
                formSlug: slug,
                contactId: contact.id,
                fields: payload,
            }),
            due_date: followupAt,
            completed: false,
            contact_id: contact.id,
            created_at: new Date().toISOString(),
        };

        const submissionLogPayload = {
            title: `Form Submit ${slug}`,
            type: 'form_submission',
            description: JSON.stringify({
                slug,
                payload,
                submittedAt: new Date().toISOString(),
            }),
            completed: true,
            contact_id: contact.id,
            created_at: new Date().toISOString(),
        };

        const [taskResult, submissionResult] = await Promise.all([
            supabase.from('activities').insert([taskPayload]),
            supabase.from('activities').insert([submissionLogPayload]),
        ]);

        if (taskResult.error) throw taskResult.error;
        if (submissionResult.error) throw submissionResult.error;

        res.status(201).json({
            success: true,
            contactId: contact.id,
            message: details.successMessage || 'Danke! Wir melden uns zeitnah.',
        });
    } catch (err) {
        console.error('Form submission error:', err.message);
        res.status(500).json({ error: 'Formular konnte nicht verarbeitet werden' });
    }
});

router.use(auth);

router.get('/', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const { data, error } = await supabase
            .from('activities')
            .select('*')
            .eq('type', 'lead_form')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json((data || []).map(mapForm));
    } catch (err) {
        res.status(500).json({ error: 'Formulare konnten nicht geladen werden' });
    }
});

router.post('/', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const name = String(req.body.name || '').trim();
        if (!name) {
            return res.status(400).json({ error: 'name ist erforderlich' });
        }

        const slug = normalizeSlug(req.body.slug || name);
        if (!slug) {
            return res.status(400).json({ error: 'slug ist ungültig' });
        }

        const payload = {
            title: name,
            type: 'lead_form',
            description: JSON.stringify({
                slug,
                fields: Array.isArray(req.body.fields) ? req.body.fields : [
                    { key: 'name', label: 'Name', required: true, type: 'text' },
                    { key: 'email', label: 'E-Mail', required: false, type: 'email' },
                    { key: 'phone', label: 'Telefon', required: false, type: 'text' },
                    { key: 'company', label: 'Unternehmen', required: false, type: 'text' },
                ],
                successMessage: req.body.successMessage || 'Danke! Wir melden uns zeitnah.',
                tags: Array.isArray(req.body.tags) ? req.body.tags : [],
                source: req.body.source || 'form_builder',
            }),
            completed: true,
            created_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
            .from('activities')
            .insert([payload])
            .select('*')
            .single();

        if (error) throw error;
        res.status(201).json(mapForm(data));
    } catch (err) {
        res.status(500).json({ error: 'Formular konnte nicht erstellt werden' });
    }
});

module.exports = router;
