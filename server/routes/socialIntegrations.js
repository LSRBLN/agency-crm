const express = require('express');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const auth = require('../middleware/auth');
const { supabase } = require('../services/supabaseClient');

const router = express.Router();

function ensureDb(res) {
    if (!supabase) {
        res.status(503).json({ error: 'Datenbank nicht konfiguriert' });
        return false;
    }
    return true;
}

function getCallbackUrl(provider) {
    const base = process.env.PUBLIC_BASE_URL || process.env.VITE_API_URL || '';
    if (!base) {
        throw new Error('PUBLIC_BASE_URL fehlt für OAuth Callback');
    }
    return `${base.replace(/\/$/, '')}/api/social-integrations/oauth/${provider}/callback`;
}

function signOAuthState(payload) {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET fehlt');
    }
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
}

function verifyOAuthState(state) {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET fehlt');
    }
    return jwt.verify(state, process.env.JWT_SECRET);
}

function deriveAccountId(details) {
    if (details.provider === 'meta') {
        return details.pageId || details.accountName || 'meta-account';
    }
    if (details.provider === 'linkedin') {
        return details.ownerUrn || details.accountName || 'linkedin-account';
    }
    return details.accountName || `${details.provider || 'account'}-${Date.now()}`;
}

router.get('/accounts', auth, async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const { data, error } = await supabase
            .from('activities')
            .select('*')
            .eq('type', 'social_account')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const accounts = (data || [])
            .map((record) => {
                let details = {};
                try {
                    details = record.description ? JSON.parse(record.description) : {};
                } catch {
                    details = {};
                }

                const connectedAt = details.connectedAt || record.created_at;
                const expiresIn = Number(details.expiresIn || 0);
                const expiresAt = expiresIn > 0
                    ? new Date(new Date(connectedAt).getTime() + (expiresIn * 1000)).toISOString()
                    : null;

                const accountId = details.accountId || deriveAccountId(details);
                return {
                    accountId,
                    provider: details.provider,
                    connected: true,
                    expired: expiresAt ? new Date(expiresAt).getTime() <= Date.now() : false,
                    accountName: details.accountName || details.provider,
                    pageId: details.pageId || null,
                    ownerUrn: details.ownerUrn || null,
                    connectedAt,
                    expiresAt,
                };
            })
            .filter((account) => account.provider);

        res.json({ accounts });
    } catch (err) {
        res.status(500).json({ error: 'Social Accounts konnten nicht geladen werden' });
    }
});

router.get('/oauth/:provider/start', auth, async (req, res) => {
    try {
        const provider = String(req.params.provider || '').toLowerCase();
        const state = signOAuthState({ provider, userId: req.userId, ts: Date.now() });

        if (provider === 'meta') {
            const clientId = process.env.META_APP_ID;
            if (!clientId) return res.status(400).json({ error: 'META_APP_ID fehlt' });
            const redirectUri = getCallbackUrl('meta');
            const scope = 'pages_manage_posts,pages_read_engagement';
            const url = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}&response_type=code&scope=${encodeURIComponent(scope)}`;
            return res.json({ url });
        }

        if (provider === 'linkedin') {
            const clientId = process.env.LINKEDIN_CLIENT_ID;
            if (!clientId) return res.status(400).json({ error: 'LINKEDIN_CLIENT_ID fehlt' });
            const redirectUri = getCallbackUrl('linkedin');
            const scope = 'w_member_social';
            const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}&scope=${encodeURIComponent(scope)}`;
            return res.json({ url });
        }

        return res.status(400).json({ error: 'Provider nicht unterstützt' });
    } catch (err) {
        res.status(500).json({ error: err.message || 'OAuth Start fehlgeschlagen' });
    }
});

router.get('/oauth/:provider/callback', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const provider = String(req.params.provider || '').toLowerCase();
        const code = req.query.code;
        const state = req.query.state;

        if (!code || !state) {
            return res.status(400).send('OAuth Callback ungültig');
        }

        const decodedState = verifyOAuthState(state);
        if (decodedState.provider !== provider) {
            return res.status(400).send('OAuth State ungültig');
        }

        let tokenData;
        let accountDetails = {};

        if (provider === 'meta') {
            const appId = process.env.META_APP_ID;
            const appSecret = process.env.META_APP_SECRET;
            const pageId = process.env.META_PAGE_ID || null;
            if (!appId || !appSecret) throw new Error('META_APP_ID oder META_APP_SECRET fehlt');

            const redirectUri = getCallbackUrl('meta');
            const tokenResponse = await axios.get('https://graph.facebook.com/v21.0/oauth/access_token', {
                params: {
                    client_id: appId,
                    client_secret: appSecret,
                    redirect_uri: redirectUri,
                    code,
                },
                timeout: 15000,
            });

            tokenData = tokenResponse.data;
            accountDetails = {
                provider: 'meta',
                accountName: 'Meta Account',
                accessToken: tokenData.access_token,
                tokenType: tokenData.token_type,
                expiresIn: tokenData.expires_in,
                pageId,
            };
        } else if (provider === 'linkedin') {
            const clientId = process.env.LINKEDIN_CLIENT_ID;
            const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
            const ownerUrn = process.env.LINKEDIN_OWNER_URN || null;
            if (!clientId || !clientSecret) throw new Error('LinkedIn Credentials fehlen');

            const redirectUri = getCallbackUrl('linkedin');
            const tokenResponse = await axios.post(
                'https://www.linkedin.com/oauth/v2/accessToken',
                new URLSearchParams({
                    grant_type: 'authorization_code',
                    code,
                    redirect_uri: redirectUri,
                    client_id: clientId,
                    client_secret: clientSecret,
                }).toString(),
                {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    timeout: 15000,
                },
            );

            tokenData = tokenResponse.data;
            accountDetails = {
                provider: 'linkedin',
                accountName: 'LinkedIn Account',
                accessToken: tokenData.access_token,
                expiresIn: tokenData.expires_in,
                ownerUrn,
            };
        } else {
            return res.status(400).send('Provider nicht unterstützt');
        }

        const payload = {
            title: `Social Account ${provider}`,
            type: 'social_account',
            description: JSON.stringify({
                ...accountDetails,
                accountId: deriveAccountId(accountDetails),
                userId: decodedState.userId,
                connectedAt: new Date().toISOString(),
            }),
            completed: true,
            created_at: new Date().toISOString(),
        };

        const { error } = await supabase.from('activities').insert([payload]);
        if (error) throw error;

        return res.status(200).send('<html><body style="font-family:sans-serif;background:#111;color:#fff;padding:24px;">Social Account erfolgreich verbunden. Dieses Fenster kann geschlossen werden.</body></html>');
    } catch (err) {
        return res.status(500).send(`<html><body style="font-family:sans-serif;background:#111;color:#fff;padding:24px;">OAuth Fehler: ${String(err.message || err)}</body></html>`);
    }
});

module.exports = router;
