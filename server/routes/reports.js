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

function toIsoStart(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString();
}

router.get('/summary', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const days = Number(req.query.days || 30);
        const rangeStart = toIsoStart(days);

        const [
            contactsRes,
            dealsRes,
            outreachRes,
            calendarRes,
            tasksRes,
            enrichmentRes,
            assignmentRes,
        ] = await Promise.all([
            supabase.from('contacts').select('*'),
            supabase.from('deals').select('*'),
            supabase.from('activities').select('*').eq('type', 'outreach'),
            supabase.from('calendar_events').select('*').gte('start_time', rangeStart),
            supabase.from('activities').select('*').eq('type', 'task'),
            supabase.from('activities').select('*').eq('type', 'similarweb_enrichment'),
            supabase.from('activities').select('*').eq('type', 'lead_assignment'),
        ]);

        if (contactsRes.error) throw contactsRes.error;
        if (dealsRes.error) throw dealsRes.error;
        if (outreachRes.error) throw outreachRes.error;
        if (calendarRes.error) throw calendarRes.error;
        if (tasksRes.error) throw tasksRes.error;
        if (enrichmentRes.error) throw enrichmentRes.error;
        if (assignmentRes.error) throw assignmentRes.error;

        const contacts = contactsRes.data || [];
        const deals = dealsRes.data || [];
        const outreach = outreachRes.data || [];
        const calendarEvents = calendarRes.data || [];
        const tasks = tasksRes.data || [];
        const enrichments = enrichmentRes.data || [];
        const assignments = assignmentRes.data || [];

        const leadsByStatus = contacts.reduce((acc, contact) => {
            const key = contact.status || 'unknown';
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});

        const leadsBySource = contacts.reduce((acc, contact) => {
            const key = contact.source || 'unbekannt';
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});

        const totalDeals = deals.length;
        const wonDeals = deals.filter((deal) => deal.stage === 'won').length;
        const conversionRate = totalDeals ? Number(((wonDeals / totalDeals) * 100).toFixed(1)) : 0;

        const pipelineValue = deals
            .filter((deal) => deal.stage !== 'lost')
            .reduce((sum, deal) => sum + Number(deal.value || 0), 0);

        const wonValue = deals
            .filter((deal) => deal.stage === 'won')
            .reduce((sum, deal) => sum + Number(deal.value || 0), 0);

        const outreachSent = outreach.filter((item) => {
            try {
                const details = item.description ? JSON.parse(item.description) : {};
                return details.status === 'sent';
            } catch {
                return false;
            }
        }).length;

        const outreachByChannel = outreach.reduce((acc, item) => {
            try {
                const details = item.description ? JSON.parse(item.description) : {};
                const key = details.channel || 'email';
                acc[key] = (acc[key] || 0) + 1;
            } catch {
                acc.email = (acc.email || 0) + 1;
            }
            return acc;
        }, {});

        const leadTimelineMap = {};
        contacts.forEach((contact) => {
            if (!contact.created_at) return;
            const date = new Date(contact.created_at);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            leadTimelineMap[key] = (leadTimelineMap[key] || 0) + 1;
        });

        const revenueTimelineMap = {};
        deals.forEach((deal) => {
            if (!deal.created_at) return;
            const date = new Date(deal.created_at);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            revenueTimelineMap[key] = (revenueTimelineMap[key] || 0) + Number(deal.value || 0);
        });

        const leadsByMonth = Object.entries(leadTimelineMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-6)
            .map(([month, count]) => ({ month, count }));

        const revenueByMonth = Object.entries(revenueTimelineMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-6)
            .map(([month, value]) => ({ month, value }));

        const meetingsCount = calendarEvents.length;
        const taskOpen = tasks.filter((task) => !task.completed).length;
        const taskDone = tasks.filter((task) => Boolean(task.completed)).length;
        const overdueTasks = tasks.filter((task) => !task.completed && task.due_date && new Date(task.due_date) < new Date()).length;

        const routedByPriority = assignments.reduce((acc, item) => {
            try {
                const details = item.description ? JSON.parse(item.description) : {};
                const key = details.priority || 'unknown';
                acc[key] = (acc[key] || 0) + 1;
            } catch {
                acc.unknown = (acc.unknown || 0) + 1;
            }
            return acc;
        }, {});

        const slaBreaches = assignments.filter((item) => !item.completed && item.due_date && new Date(item.due_date) < new Date()).length;

        res.json({
            rangeDays: days,
            metrics: {
                totalLeads: contacts.length,
                conversionRate,
                pipelineValue,
                wonValue,
                outreachSent,
                meetingsCount,
                taskOpen,
                taskDone,
                overdueTasks,
                enrichmentCount: enrichments.length,
                assignmentCount: assignments.length,
                slaBreaches,
            },
            leadsByStatus,
            leadsBySource,
            outreachByChannel,
            routedByPriority,
            leadsByMonth,
            revenueByMonth,
        });
    } catch (err) {
        console.error('Error generating reports summary:', err.message);
        res.status(500).json({ error: 'Reporting konnte nicht geladen werden' });
    }
});

module.exports = router;
