// leads.js - Supabase version
const express = require('express');
const router = express.Router();
const multer = require('multer');
const csvParser = require('csv-parser');
const { Readable } = require('stream');
const axios = require('axios');
const { supabase } = require('../services/supabaseClient');
const auth = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage() });
router.use(auth);

function extractLeadScore(lead, enrichment) {
    let score = 0;
    const reasons = [];

    if (lead.email) {
        score += 20;
        reasons.push('E-Mail vorhanden');
    }

    if (lead.phone) {
        score += 10;
        reasons.push('Telefon vorhanden');
    }

    if (lead.company) {
        score += 10;
        reasons.push('Unternehmen bekannt');
    }

    const status = String(lead.status || '').toLowerCase();
    if (status === 'active') {
        score += 20;
        reasons.push('Status aktiv');
    } else if (status === 'lead') {
        score += 10;
        reasons.push('Status Lead');
    }

    const source = String(lead.source || '').toLowerCase();
    if (source.includes('similarweb') || source.includes('intent')) {
        score += 10;
        reasons.push('Intent-basierte Quelle');
    } else if (source.includes('referral') || source.includes('inbound')) {
        score += 8;
        reasons.push('Inbound/Referral Quelle');
    }

    const latestVisits = Number(enrichment?.summary?.latestVisits || 0);
    if (latestVisits >= 50000) {
        score += 20;
        reasons.push('Hoher Website-Traffic');
    } else if (latestVisits >= 10000) {
        score += 12;
        reasons.push('Mittlerer Website-Traffic');
    } else if (latestVisits > 0) {
        score += 6;
        reasons.push('Traffic-Daten vorhanden');
    }

    return {
        score: Math.max(0, Math.min(100, score)),
        priority: score >= 75 ? 'hot' : score >= 45 ? 'warm' : 'cold',
        reasons,
    };
}

async function getLatestEnrichmentMap(contactIds = []) {
    if (!Array.isArray(contactIds) || contactIds.length === 0) {
        return new Map();
    }

    const { data, error } = await supabase
        .from('activities')
        .select('contact_id, description, created_at')
        .eq('type', 'similarweb_enrichment')
        .in('contact_id', contactIds)
        .order('created_at', { ascending: false });

    if (error) throw error;

    const map = new Map();
    for (const item of data || []) {
        if (!item.contact_id || map.has(item.contact_id)) continue;
        try {
            map.set(item.contact_id, item.description ? JSON.parse(item.description) : null);
        } catch {
            map.set(item.contact_id, null);
        }
    }

    return map;
}

async function getLatestAssignmentMap(contactIds = []) {
    if (!Array.isArray(contactIds) || contactIds.length === 0) {
        return new Map();
    }

    const { data, error } = await supabase
        .from('activities')
        .select('contact_id, description, created_at')
        .eq('type', 'lead_assignment')
        .in('contact_id', contactIds)
        .order('created_at', { ascending: false });

    if (error) throw error;

    const map = new Map();
    for (const item of data || []) {
        if (!item.contact_id || map.has(item.contact_id)) continue;
        try {
            map.set(item.contact_id, item.description ? JSON.parse(item.description) : null);
        } catch {
            map.set(item.contact_id, null);
        }
    }

    return map;
}

function parseActivityDescription(value) {
    if (!value || typeof value !== 'string') return {};
    try {
        return JSON.parse(value);
    } catch {
        return {};
    }
}

function extractDomainFromLead(lead) {
    const candidates = [
        lead.website,
        lead.company,
        lead.notes,
    ].filter(Boolean).map((value) => String(value).trim().toLowerCase());

    for (const item of candidates) {
        const match = item.match(/(?:https?:\/\/)?(?:www\.)?([a-z0-9.-]+\.[a-z]{2,})/i);
        if (match && match[1]) return match[1].toLowerCase();
    }

    return '';
}

function collectEmails(text) {
    const matches = String(text || '').match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) || [];
    return Array.from(new Set(matches)).slice(0, 15);
}

function collectPhones(text) {
    const matches = String(text || '').match(/\+?[0-9][0-9\s().-]{6,}[0-9]/g) || [];
    return Array.from(new Set(matches.map((value) => value.trim()))).slice(0, 15);
}

function collectSocialLinks(html) {
    const links = String(html || '').match(/https?:\/\/[^"'\s)]+/gi) || [];
    const social = links.filter((link) => /(linkedin|instagram|facebook|youtube|tiktok|x\.com|twitter)/i.test(link));
    return Array.from(new Set(social)).slice(0, 20);
}

async function getLatestActivityByType(contactId, type) {
    const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('contact_id', contactId)
        .eq('type', type)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) throw error;
    return data || null;
}

function ensureDb(res) {
    if (!supabase) {
        res.status(503).json({ error: 'Datenbank nicht konfiguriert' });
        return false;
    }
    return true;
}

// GET all leads (contacts)
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
        console.error('Error fetching leads:', err.message);
        res.status(500).json({ error: 'Leads konnten nicht geladen werden' });
    }
});

function normalizeCsvRow(row) {
    const name = row.name || row.contact_name || row.contactName || row.full_name || row.fullName || null;
    const company = row.company || row.company_name || row.companyName || row.business_name || row.businessName || row.domain || row.website || row.url || null;
    const email = row.email || row.contact_email || row.contactEmail || null;
    const phone = row.phone || row.contact_phone || row.contactPhone || null;
    const source = row.source || 'csv_import';

    return {
        name: name || company || 'Unbekannter Lead',
        company: company || null,
        email: email || null,
        phone: phone || null,
        position: row.position || null,
        status: row.status || 'lead',
        source,
        notes: row.notes || null,
        tags: [],
        created_at: new Date(),
        updated_at: new Date(),
    };
}

router.post('/upload-metrics', upload.single('file'), async (req, res) => {
    if (!ensureDb(res)) return;

    if (!req.file || !req.file.buffer) {
        return res.status(400).json({ error: 'CSV-Datei fehlt' });
    }

    try {
        const rows = [];

        await new Promise((resolve, reject) => {
            const stream = Readable.from(req.file.buffer);
            stream
                .pipe(csvParser())
                .on('data', (data) => rows.push(data))
                .on('end', resolve)
                .on('error', reject);
        });

        if (rows.length === 0) {
            return res.json({ createdCount: 0, updatedCount: 0 });
        }

        const payload = rows.map(normalizeCsvRow);
        let createdCount = 0;

        const batchSize = 200;
        for (let index = 0; index < payload.length; index += batchSize) {
            const batch = payload.slice(index, index + batchSize);
            const { error } = await supabase.from('contacts').insert(batch);
            if (error) throw error;
            createdCount += batch.length;
        }

        res.json({ createdCount, updatedCount: 0 });
    } catch (err) {
        console.error('Error uploading leads CSV:', err.message);
        res.status(500).json({ error: 'CSV konnte nicht verarbeitet werden' });
    }
});

router.get('/scored', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const limit = Math.min(Math.max(Number(req.query.limit || 100), 1), 300);
        const { data: contacts, error: contactsError } = await supabase
            .from('contacts')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (contactsError) throw contactsError;

        const contactIds = (contacts || []).map((contact) => contact.id).filter(Boolean);
        const enrichmentMap = await getLatestEnrichmentMap(contactIds);
        const assignmentMap = await getLatestAssignmentMap(contactIds);

        const items = (contacts || []).map((lead) => {
            const enrichment = enrichmentMap.get(lead.id) || null;
            const assignment = assignmentMap.get(lead.id) || null;
            const scoring = extractLeadScore(lead, enrichment);
            return {
                ...lead,
                score: scoring.score,
                priority: scoring.priority,
                scoreReasons: scoring.reasons,
                assignedOwner: assignment?.owner || null,
                slaDueAt: assignment?.slaDueAt || null,
            };
        });

        items.sort((a, b) => b.score - a.score);
        res.json({ items });
    } catch (err) {
        console.error('Error generating lead scoring list:', err.message);
        res.status(500).json({ error: 'Lead Scoring konnte nicht berechnet werden' });
    }
});

router.get('/:id/score', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const { data: lead, error: leadError } = await supabase
            .from('contacts')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (leadError || !lead) {
            return res.status(404).json({ error: 'Lead nicht gefunden' });
        }

        const enrichmentMap = await getLatestEnrichmentMap([lead.id]);
        const enrichment = enrichmentMap.get(lead.id) || null;
        const scoring = extractLeadScore(lead, enrichment);

        res.json({
            contactId: lead.id,
            score: scoring.score,
            priority: scoring.priority,
            reasons: scoring.reasons,
        });
    } catch (err) {
        console.error('Error generating lead score:', err.message);
        res.status(500).json({ error: 'Lead Score konnte nicht berechnet werden' });
    }
});

router.get('/:id/routing', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const assignmentMap = await getLatestAssignmentMap([req.params.id]);
        const assignment = assignmentMap.get(req.params.id) || null;

        if (!assignment) {
            return res.status(404).json({ error: 'Keine Routing-Zuweisung gefunden' });
        }

        res.json({
            contactId: req.params.id,
            owner: assignment.owner || null,
            priority: assignment.priority || null,
            ruleId: assignment.ruleId || null,
            ruleName: assignment.ruleName || null,
            slaDueAt: assignment.slaDueAt || null,
            assignedAt: assignment.assignedAt || null,
        });
    } catch (err) {
        console.error('Error fetching lead routing:', err.message);
        res.status(500).json({ error: 'Routing-Info konnte nicht geladen werden' });
    }
});

router.post('/:id/profile', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const payload = {
            companySize: req.body?.companySize || null,
            industry: req.body?.industry || null,
            website: req.body?.website || null,
            linkedin: req.body?.linkedin || null,
            instagram: req.body?.instagram || null,
            city: req.body?.city || null,
            country: req.body?.country || null,
            decisionMaker: req.body?.decisionMaker || null,
            budgetRange: req.body?.budgetRange || null,
            painPoints: Array.isArray(req.body?.painPoints) ? req.body.painPoints : [],
            serviceInterest: Array.isArray(req.body?.serviceInterest) ? req.body.serviceInterest : [],
            techStack: Array.isArray(req.body?.techStack) ? req.body.techStack : [],
            qualificationNotes: req.body?.qualificationNotes || null,
            updatedAt: new Date().toISOString(),
        };

        const existing = await getLatestActivityByType(req.params.id, 'lead_profile');
        if (!existing) {
            const { data, error } = await supabase
                .from('activities')
                .insert([{
                    title: `Lead Profile ${req.params.id}`,
                    type: 'lead_profile',
                    description: JSON.stringify(payload),
                    completed: true,
                    contact_id: req.params.id,
                    created_at: new Date().toISOString(),
                }])
                .select('*')
                .single();

            if (error) throw error;
            return res.status(201).json({ id: data.id, ...payload });
        }

        const existingPayload = parseActivityDescription(existing.description);
        const merged = { ...existingPayload, ...payload };

        const { data, error } = await supabase
            .from('activities')
            .update({ description: JSON.stringify(merged) })
            .eq('id', existing.id)
            .select('*')
            .single();

        if (error) throw error;
        res.json({ id: data.id, ...merged });
    } catch (err) {
        console.error('Error saving lead profile:', err.message);
        res.status(500).json({ error: 'Lead-Profil konnte nicht gespeichert werden' });
    }
});

router.post('/:id/research', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const { data: lead, error: leadError } = await supabase
            .from('contacts')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (leadError || !lead) {
            return res.status(404).json({ error: 'Lead nicht gefunden' });
        }

        const providedDomain = String(req.body?.domain || '').trim().toLowerCase();
        const domain = providedDomain || extractDomainFromLead(lead);
        if (!domain) {
            return res.status(400).json({ error: 'Keine Domain erkennbar. Übergib domain im Request.' });
        }

        const candidates = [`https://${domain}`, `http://${domain}`];
        let html = '';
        let finalUrl = '';

        for (const url of candidates) {
            try {
                const response = await axios.get(url, { timeout: 10000, maxRedirects: 5 });
                html = String(response.data || '');
                finalUrl = String(response.request?.res?.responseUrl || url);
                break;
            } catch {
                continue;
            }
        }

        if (!html) {
            return res.status(502).json({ error: 'Website konnte nicht geladen werden' });
        }

        const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        const metaDescMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i);

        const emails = collectEmails(html);
        const phones = collectPhones(html);
        const socials = collectSocialLinks(html);

        const snapshot = {
            domain,
            finalUrl,
            title: titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim().slice(0, 300) : null,
            metaDescription: metaDescMatch ? metaDescMatch[1].replace(/\s+/g, ' ').trim().slice(0, 500) : null,
            emails,
            phones,
            socialLinks: socials,
            researchedAt: new Date().toISOString(),
        };

        const { data, error } = await supabase
            .from('activities')
            .insert([{
                title: `Lead Research ${domain}`,
                type: 'lead_research',
                description: JSON.stringify(snapshot),
                completed: true,
                contact_id: lead.id,
                created_at: new Date().toISOString(),
            }])
            .select('*')
            .single();

        if (error) throw error;

        res.status(201).json({
            success: true,
            contactId: lead.id,
            activityId: data.id,
            snapshot,
        });
    } catch (err) {
        console.error('Error researching lead:', err.message);
        res.status(500).json({ error: 'Lead-Recherche fehlgeschlagen' });
    }
});

router.get('/:id/intelligence', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const { data: lead, error: leadError } = await supabase
            .from('contacts')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (leadError || !lead) {
            return res.status(404).json({ error: 'Lead nicht gefunden' });
        }

        const [assignment, enrichment, profile, research, allActivities] = await Promise.all([
            getLatestActivityByType(lead.id, 'lead_assignment'),
            getLatestActivityByType(lead.id, 'similarweb_enrichment'),
            getLatestActivityByType(lead.id, 'lead_profile'),
            getLatestActivityByType(lead.id, 'lead_research'),
            supabase
                .from('activities')
            .select('id,title,type,created_at,completed,due_date')
                .eq('contact_id', lead.id)
                .order('created_at', { ascending: false })
                .limit(200),
        ]);

        if (allActivities.error) throw allActivities.error;

        const activitySummary = (allActivities.data || []).reduce((acc, item) => {
            acc[item.type] = (acc[item.type] || 0) + 1;
            return acc;
        }, {});

        res.json({
            contact: lead,
            assignment: assignment ? parseActivityDescription(assignment.description) : null,
            enrichment: enrichment ? parseActivityDescription(enrichment.description) : null,
            profile: profile ? parseActivityDescription(profile.description) : null,
            research: research ? parseActivityDescription(research.description) : null,
            activities: allActivities.data || [],
            activitySummary,
        });
    } catch (err) {
        console.error('Error loading lead intelligence:', err.message);
        res.status(500).json({ error: 'Lead Intelligence konnte nicht geladen werden' });
    }
});

// POST add a timeline note (GHL-style quick note)
router.post('/:id/note', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const text = String(req.body?.text || '').trim();
        if (!text) {
            return res.status(400).json({ error: 'text ist erforderlich' });
        }

        const createdAt = new Date().toISOString();
        const title = `Note: ${text.replace(/\s+/g, ' ').slice(0, 60)}`;

        const payload = {
            title,
            type: 'note',
            description: JSON.stringify({ text, userId: req.userId || null, createdAt }),
            completed: true,
            contact_id: req.params.id,
            created_at: createdAt,
        };

        const { data, error } = await supabase
            .from('activities')
            .insert([payload])
            .select('*')
            .single();

        if (error || !data) throw error || new Error('Notiz konnte nicht gespeichert werden');

        res.status(201).json(data);
    } catch (err) {
        console.error('Error adding lead note:', err.message);
        res.status(500).json({ error: 'Notiz konnte nicht gespeichert werden' });
    }
});

// GET single lead
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
        res.status(404).json({ error: 'Lead nicht gefunden' });
    }
});

// POST create lead
router.post('/', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const newLead = {
            ...req.body,
            created_at: new Date(),
            status: req.body.status || 'new'
        };

        const { data, error } = await supabase
            .from('contacts')
            .insert([newLead])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (err) {
        console.error('Error creating lead:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// PUT update lead
router.put('/:id', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const { data, error } = await supabase
            .from('contacts')
            .update({ ...req.body, updated_at: new Date() })
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('Error updating lead:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// DELETE lead
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
        console.error('Error deleting lead:', err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
