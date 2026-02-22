const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { supabase } = require('../services/supabaseClient');
const { generateSocialPost } = require('../services/socialPlannerService');
const { publishToMeta, publishToLinkedIn } = require('../services/socialPublishService');

router.use(auth);

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

function mapCampaign(record) {
    const details = parseDescription(record.description);
    return {
        id: record.id,
        name: record.title,
        status: details.status || 'draft',
        platform: details.platform || 'instagram',
        objective: details.objective || '',
        targetProvider: details.targetProvider || null,
        targetAccountId: details.targetAccountId || null,
        scheduledAt: details.scheduledAt || null,
        caption: details.caption || '',
        hashtags: details.hashtags || [],
        imagePrompt: details.imagePrompt || '',
        createdAt: record.created_at,
    };
}

router.get('/campaigns', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const { data, error } = await supabase
            .from('activities')
            .select('*')
            .eq('type', 'social_post')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json((data || []).map(mapCampaign));
    } catch (err) {
        res.status(500).json({ error: 'Social Planner konnte nicht geladen werden' });
    }
});

router.post('/generate', async (req, res) => {
    try {
        const generated = await generateSocialPost(req.body || {});
        res.json(generated);
    } catch (err) {
        res.status(500).json({ error: err.message || 'Social Content konnte nicht generiert werden' });
    }
});

router.post('/campaigns', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const payload = {
            title: req.body.name || req.body.topic || 'Social Campaign',
            type: 'social_post',
            description: JSON.stringify({
                status: req.body.status || 'draft',
                platform: req.body.platform || 'instagram',
                objective: req.body.objective || '',
                targetProvider: req.body.targetProvider || null,
                targetAccountId: req.body.targetAccountId || null,
                scheduledAt: req.body.scheduledAt || null,
                caption: req.body.caption || '',
                hashtags: Array.isArray(req.body.hashtags) ? req.body.hashtags : [],
                imagePrompt: req.body.imagePrompt || '',
                autoPost: Boolean(req.body.autoPost),
            }),
            due_date: req.body.scheduledAt || null,
            completed: false,
            created_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
            .from('activities')
            .insert([payload])
            .select('*')
            .single();

        if (error) throw error;
        res.status(201).json(mapCampaign(data));
    } catch (err) {
        res.status(500).json({ error: 'Social Campaign konnte nicht erstellt werden' });
    }
});

router.post('/campaigns/:id/post', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const { data: existing, error: existingError } = await supabase
            .from('activities')
            .select('*')
            .eq('id', req.params.id)
            .eq('type', 'social_post')
            .single();

        if (existingError || !existing) {
            return res.status(404).json({ error: 'Campaign nicht gefunden' });
        }

        const details = parseDescription(existing.description);

        const { data: accounts, error: accountsError } = await supabase
            .from('activities')
            .select('*')
            .eq('type', 'social_account')
            .order('created_at', { ascending: false });

        if (accountsError) throw accountsError;

        const accountRecords = (accounts || []).map((record) => {
            const parsed = parseDescription(record.description);
            return parsed;
        });

        const platform = String(details.platform || '').toLowerCase();
        const targetProvider = String(details.targetProvider || '').toLowerCase();
        const targetAccountId = String(details.targetAccountId || '');
        let publishResult = { provider: 'internal', postId: null };

        const pickAccount = (provider) => {
            const providerAccounts = accountRecords.filter((account) => String(account.provider || '').toLowerCase() === provider);
            const account = targetAccountId
                ? providerAccounts.find((candidate) => String(candidate.accountId || '') === targetAccountId)
                : providerAccounts[0];

            if (!account) return null;

            const connectedAt = account.connectedAt ? new Date(account.connectedAt).getTime() : Date.now();
            const expiresIn = Number(account.expiresIn || 0);
            if (expiresIn > 0 && connectedAt + (expiresIn * 1000) <= Date.now()) {
                throw new Error(`${provider} Token ist abgelaufen. Bitte Account neu verbinden.`);
            }

            return account;
        };

        if (platform === 'facebook' || platform === 'instagram') {
            if (targetProvider && targetProvider !== 'meta') {
                return res.status(400).json({ error: 'Kampagne ist auf einen anderen Provider konfiguriert' });
            }

            const metaAccount = pickAccount('meta');
            if (!metaAccount) {
                return res.status(400).json({ error: 'Kein verbundenes Meta Konto gefunden' });
            }

            publishResult = await publishToMeta({
                accessToken: metaAccount.accessToken,
                pageId: metaAccount.pageId || process.env.META_PAGE_ID,
                message: `${details.caption || ''}\n${(details.hashtags || []).join(' ')}`.trim(),
                link: req.body.link || null,
            });
        } else if (platform === 'linkedin') {
            if (targetProvider && targetProvider !== 'linkedin') {
                return res.status(400).json({ error: 'Kampagne ist auf einen anderen Provider konfiguriert' });
            }

            const linkedinAccount = pickAccount('linkedin');
            if (!linkedinAccount) {
                return res.status(400).json({ error: 'Kein verbundenes LinkedIn Konto gefunden' });
            }

            publishResult = await publishToLinkedIn({
                accessToken: linkedinAccount.accessToken,
                ownerUrn: linkedinAccount.ownerUrn || process.env.LINKEDIN_OWNER_URN,
                message: `${details.caption || ''}\n${(details.hashtags || []).join(' ')}`.trim(),
            });
        }

        const updatedDescription = JSON.stringify({
            ...details,
            status: 'posted',
            postedAt: new Date().toISOString(),
            publishResult,
        });

        const { data, error } = await supabase
            .from('activities')
            .update({ description: updatedDescription, completed: true })
            .eq('id', req.params.id)
            .select('*')
            .single();

        if (error) throw error;
        res.json(mapCampaign(data));
    } catch (err) {
        res.status(500).json({ error: 'Campaign konnte nicht gepostet werden' });
    }
});

module.exports = router;
