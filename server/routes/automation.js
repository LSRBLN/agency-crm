const express = require('express');
const router = express.Router();
const { supabase } = require('../services/supabaseClient');
const auth = require('../middleware/auth');

function ensureDb(res) {
    if (!supabase) {
        res.status(503).json({ error: 'Datenbank nicht konfiguriert' });
        return false;
    }
    return true;
}

function getDefaultOwner() {
    return String(process.env.ADMIN_EMAIL || process.env.DEFAULT_OWNER || 'owner').trim().toLowerCase();
}

function normalizeLeadPayload(body) {
    return {
        name: body.name || body.fullName || body.contactName || body.company || 'Neuer Lead',
        email: body.email || body.contactEmail || null,
        phone: body.phone || body.contactPhone || null,
        company: body.company || body.companyName || null,
        position: body.position || null,
        status: body.status || 'lead',
        source: body.source || body.formType || 'web_form',
        notes: body.notes || null,
        tags: Array.isArray(body.tags) ? body.tags : [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
}

function parseDescription(description) {
    if (!description || typeof description !== 'string') return {};
    try {
        return JSON.parse(description);
    } catch {
        return {};
    }
}

function normalizeRoutingRulePayload(body = {}) {
    const priorityBand = String(body.priorityBand || 'all').toLowerCase();
    const assignmentMode = String(body.assignmentMode || 'single').toLowerCase();
    const owners = Array.isArray(body.owners)
        ? body.owners.map((value) => String(value || '').trim()).filter(Boolean)
        : [];
    const fallbackOwner = String(body.assignTo || '').trim();
    const resolvedOwners = owners.length > 0 ? owners : (fallbackOwner ? [fallbackOwner] : []);
    const resolvedAssignTo = fallbackOwner || resolvedOwners[0] || getDefaultOwner();

    return {
        name: String(body.name || '').trim() || 'Routing Rule',
        enabled: body.enabled !== false,
        priorityBand: ['hot', 'warm', 'cold', 'all'].includes(priorityBand) ? priorityBand : 'all',
        sourceContains: String(body.sourceContains || '').trim().toLowerCase() || null,
        assignmentMode: ['single', 'round_robin'].includes(assignmentMode) ? assignmentMode : 'single',
        assignTo: resolvedAssignTo,
        owners: resolvedOwners,
        slaHours: Math.min(Math.max(Number(body.slaHours || 24), 1), 240),
        createTask: body.createTask !== false,
        taskTitle: String(body.taskTitle || 'SLA Erstkontakt').trim(),
        notes: String(body.notes || '').trim() || null,
    };
}

function getRoutingStateTitle(ruleId) {
    return `Routing State ${ruleId}`;
}

async function getRoutingState(ruleId) {
    if (!ruleId) return null;

    const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('type', 'routing_state')
        .eq('title', getRoutingStateTitle(ruleId))
        .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    return parseDescription(data.description);
}

async function saveRoutingState(ruleId, state = {}) {
    if (!ruleId) return;

    const title = getRoutingStateTitle(ruleId);
    const existing = await getRoutingState(ruleId);

    if (!existing) {
        const { error } = await supabase.from('activities').insert([{
            title,
            type: 'routing_state',
            description: JSON.stringify({
                ruleId,
                ...state,
                updatedAt: new Date().toISOString(),
            }),
            completed: true,
            created_at: new Date().toISOString(),
        }]);

        if (error) throw error;
        return;
    }

    const { error } = await supabase
        .from('activities')
        .update({
            description: JSON.stringify({
                ...existing,
                ...state,
                ruleId,
                updatedAt: new Date().toISOString(),
            }),
        })
        .eq('type', 'routing_state')
        .eq('title', title);

    if (error) throw error;
}

async function resolveAssignedOwner(rule, priority) {
    if (!rule || !rule.id) {
        return getDefaultOwner();
    }

    const owners = Array.isArray(rule.owners) ? rule.owners.filter(Boolean) : [];
    if (rule.assignmentMode !== 'round_robin' || owners.length <= 1) {
        return rule.assignTo || owners[0] || getDefaultOwner();
    }

    const state = await getRoutingState(rule.id);
    const lastIndex = Number(state?.lastIndex);
    const safeLastIndex = Number.isFinite(lastIndex) ? lastIndex : -1;
    const nextIndex = (safeLastIndex + 1) % owners.length;
    const owner = owners[nextIndex];

    await saveRoutingState(rule.id, {
        lastIndex: nextIndex,
        lastOwner: owner,
    });

    return owner;
}

function getLeadPriority(lead) {
    let score = 0;
    if (lead.email) score += 25;
    if (lead.phone) score += 15;
    if (lead.company) score += 10;

    const source = String(lead.source || '').toLowerCase();
    if (source.includes('similarweb') || source.includes('intent')) score += 30;
    else if (source.includes('referral') || source.includes('inbound') || source.includes('form')) score += 20;

    if (score >= 70) return 'hot';
    if (score >= 40) return 'warm';
    return 'cold';
}

function pickRoutingRule(contact, rules = []) {
    const priority = getLeadPriority(contact);
    const source = String(contact.source || '').toLowerCase();

    const candidates = rules.filter((rule) => {
        if (!rule.enabled) return false;
        if (rule.priorityBand !== 'all' && rule.priorityBand !== priority) return false;
        if (rule.sourceContains && !source.includes(rule.sourceContains)) return false;
        return true;
    });

    return {
        rule: candidates[0] || null,
        priority,
    };
}

async function getRoutingRules() {
    const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('type', 'routing_rule')
        .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((record) => {
        const details = parseDescription(record.description);
        return {
            id: record.id,
            ...normalizeRoutingRulePayload(details),
            createdAt: record.created_at,
        };
    });
}

async function applyRoutingForContact(contact, trigger = 'manual') {
    const rules = await getRoutingRules();
    const { rule, priority } = pickRoutingRule(contact, rules);

    const effectiveRule = rule || {
        id: null,
        name: 'Fallback Routing',
        assignmentMode: 'single',
        owners: [],
        assignTo: getDefaultOwner(),
        slaHours: priority === 'hot' ? 4 : priority === 'warm' ? 12 : 24,
        createTask: true,
        taskTitle: 'SLA Erstkontakt',
    };

    const assignedOwner = await resolveAssignedOwner(effectiveRule, priority);

    const slaDueAt = new Date(Date.now() + (Number(effectiveRule.slaHours || 24) * 60 * 60 * 1000)).toISOString();

    const assignmentPayload = {
        title: `Lead Routing ${contact.name || contact.id}`,
        type: 'lead_assignment',
        description: JSON.stringify({
            contactId: contact.id,
            ruleId: effectiveRule.id,
            ruleName: effectiveRule.name,
            owner: assignedOwner,
            assignmentMode: effectiveRule.assignmentMode || 'single',
            owners: effectiveRule.owners || [assignedOwner],
            priority,
            slaHours: effectiveRule.slaHours,
            slaDueAt,
            trigger,
            assignedAt: new Date().toISOString(),
        }),
        due_date: slaDueAt,
        completed: false,
        contact_id: contact.id,
        created_at: new Date().toISOString(),
    };

    const { data: assignment, error: assignmentError } = await supabase
        .from('activities')
        .insert([assignmentPayload])
        .select('*')
        .single();

    if (assignmentError || !assignment) {
        throw assignmentError || new Error('Lead Assignment konnte nicht gespeichert werden');
    }

    let task = null;
    if (effectiveRule.createTask) {
        const taskPayload = {
            title: `${effectiveRule.taskTitle}: ${contact.name || 'Lead'}`,
            type: 'task',
            description: JSON.stringify({
                kind: 'sla_first_contact',
                owner: assignedOwner,
                priority,
                contactId: contact.id,
                assignmentActivityId: assignment.id,
            }),
            due_date: slaDueAt,
            completed: false,
            contact_id: contact.id,
            created_at: new Date().toISOString(),
        };

        const { data: taskData, error: taskError } = await supabase
            .from('activities')
            .insert([taskPayload])
            .select('*')
            .single();

        if (taskError) throw taskError;
        task = taskData;
    }

    return {
        assignment,
        task,
        priority,
        owner: assignedOwner,
        slaDueAt,
        ruleId: effectiveRule.id,
    };
}

router.post('/lead-capture', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const leadPayload = normalizeLeadPayload(req.body || {});
        if (!leadPayload.name) {
            return res.status(400).json({ error: 'name ist erforderlich' });
        }

        const { data: contact, error: contactError } = await supabase
            .from('contacts')
            .insert([leadPayload])
            .select('*')
            .single();

        if (contactError || !contact) {
            throw contactError || new Error('Lead konnte nicht erfasst werden');
        }

        const reminderDue = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        const taskPayload = {
            title: `Follow-up: ${contact.name}`,
            type: 'task',
            description: JSON.stringify({
                kind: 'lead_followup',
                contactId: contact.id,
                contactName: contact.name,
                source: contact.source,
                reminder: true,
            }),
            due_date: reminderDue,
            completed: false,
            contact_id: contact.id,
            created_at: new Date().toISOString(),
        };

        const outreachPayload = {
            title: `Outreach ${contact.name}`,
            type: 'outreach',
            description: JSON.stringify({
                subject: `Kurzes Follow-up für ${contact.name}`,
                recipient: contact.email || '',
                channel: 'email',
                status: 'draft',
                sentAt: null,
                messages: [],
            }),
            completed: false,
            contact_id: contact.id,
            created_at: new Date().toISOString(),
        };

        const [taskRes, outreachRes] = await Promise.all([
            supabase.from('activities').insert([taskPayload]).select('*').single(),
            supabase.from('activities').insert([outreachPayload]).select('*').single(),
        ]);

        if (taskRes.error) throw taskRes.error;
        if (outreachRes.error) throw outreachRes.error;

        const routing = await applyRoutingForContact(contact, 'lead_capture');

        res.status(201).json({
            success: true,
            lead: contact,
            automation: {
                task: taskRes.data,
                outreach: outreachRes.data,
                routing,
            },
        });
    } catch (err) {
        console.error('Lead capture automation error:', err.message);
        res.status(500).json({ error: 'Lead Capture fehlgeschlagen' });
    }
});

router.use(auth);

router.get('/routing-rules', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const rules = await getRoutingRules();
        res.json({ items: rules });
    } catch (err) {
        res.status(500).json({ error: 'Routing-Regeln konnten nicht geladen werden' });
    }
});

router.post('/routing-rules', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const rule = normalizeRoutingRulePayload(req.body || {});

        const payload = {
            title: `Routing Rule ${rule.name}`,
            type: 'routing_rule',
            description: JSON.stringify(rule),
            completed: true,
            created_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
            .from('activities')
            .insert([payload])
            .select('*')
            .single();

        if (error || !data) {
            throw error || new Error('Routing-Regel konnte nicht erstellt werden');
        }

        res.status(201).json({
            id: data.id,
            ...rule,
            createdAt: data.created_at,
        });
    } catch (err) {
        res.status(500).json({ error: 'Routing-Regel konnte nicht erstellt werden' });
    }
});

router.put('/routing-rules/:id', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const rule = normalizeRoutingRulePayload(req.body || {});

        const { data, error } = await supabase
            .from('activities')
            .update({
                title: `Routing Rule ${rule.name}`,
                description: JSON.stringify(rule),
            })
            .eq('id', req.params.id)
            .eq('type', 'routing_rule')
            .select('*')
            .single();

        if (error || !data) {
            return res.status(404).json({ error: 'Routing-Regel nicht gefunden' });
        }

        res.json({
            id: data.id,
            ...rule,
            createdAt: data.created_at,
        });
    } catch (err) {
        res.status(500).json({ error: 'Routing-Regel konnte nicht aktualisiert werden' });
    }
});

router.delete('/routing-rules/:id', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const { error } = await supabase
            .from('activities')
            .delete()
            .eq('id', req.params.id)
            .eq('type', 'routing_rule');

        if (error) throw error;

        await supabase
            .from('activities')
            .delete()
            .eq('type', 'routing_state')
            .eq('title', getRoutingStateTitle(req.params.id));

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Routing-Regel konnte nicht gelöscht werden' });
    }
});

router.post('/apply-routing/:contactId', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const { data: contact, error: contactError } = await supabase
            .from('contacts')
            .select('*')
            .eq('id', req.params.contactId)
            .single();

        if (contactError || !contact) {
            return res.status(404).json({ error: 'Lead nicht gefunden' });
        }

        const routing = await applyRoutingForContact(contact, 'manual_apply');
        res.status(201).json({
            success: true,
            contactId: contact.id,
            routing,
        });
    } catch (err) {
        res.status(500).json({ error: 'Routing konnte nicht angewendet werden' });
    }
});

router.get('/tasks', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const { data, error } = await supabase
            .from('activities')
            .select('*')
            .eq('type', 'task')
            .order('due_date', { ascending: true });

        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ error: 'Tasks konnten nicht geladen werden' });
    }
});

router.post('/tasks', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const payload = {
            title: req.body.title,
            type: 'task',
            description: req.body.description || null,
            due_date: req.body.due_date || null,
            completed: Boolean(req.body.completed),
            contact_id: req.body.contact_id || null,
            deal_id: req.body.deal_id || null,
            created_at: new Date().toISOString(),
        };

        if (!payload.title) {
            return res.status(400).json({ error: 'title ist erforderlich' });
        }

        const { data, error } = await supabase
            .from('activities')
            .insert([payload])
            .select('*')
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (err) {
        res.status(500).json({ error: 'Task konnte nicht erstellt werden' });
    }
});

router.put('/tasks/:id', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const updates = {
            ...req.body,
        };

        const { data, error } = await supabase
            .from('activities')
            .update(updates)
            .eq('id', req.params.id)
            .eq('type', 'task')
            .select('*')
            .single();

        if (error || !data) {
            return res.status(404).json({ error: 'Task nicht gefunden' });
        }

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'Task konnte nicht aktualisiert werden' });
    }
});

module.exports = router;
