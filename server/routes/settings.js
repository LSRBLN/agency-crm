const express = require('express');
const auth = require('../middleware/auth');
const { supabase } = require('../services/supabaseClient');
const crypto = require('crypto');

const router = express.Router();
router.use(auth);

const COMPANY_PROFILE_KEY = 'company_profile';
const FEATURE_FLAGS_KEY = 'feature_flags';

const DEFAULT_FEATURE_FLAGS = {
    similarweb: false,
    gridRank: true,
    mapDashboard: true,
    pageSpeedInsights: false,
};
const DEFAULT_COMPANY_PROFILE = {
    companyName: 'Mustermann Consulting',
    ownerName: 'Max Mustermann',
    street: 'Musterstraße 1',
    zip: '10115',
    city: 'Berlin',
    country: 'Deutschland',
    email: 'info@mustermann.de',
    phone: '+49 30 000000',
    website: 'https://mustermann.de',
    taxId: '12/345/67890',
    vatId: 'DE123456789',
    logoUrl: 'server/routes/ChatGPT Image 21. Feb. 2026, 19_51_41.png',
    offerSetupFee: 1500,
    offerMonthlyRetainer: 1200,
    offerTermMonths: 6,
};

function ensureDb(res) {
    if (!supabase) {
        res.status(503).json({ error: 'Datenbank nicht konfiguriert' });
        return false;
    }
    return true;
}

function parseJson(value) {
    if (!value || typeof value !== 'string') return {};
    try {
        return JSON.parse(value);
    } catch {
        return {};
    }
}

function normalizeFeatureFlags(input = {}) {
    const raw = input && typeof input === 'object' ? input : {};
    const merged = { ...DEFAULT_FEATURE_FLAGS, ...raw };
    return {
        similarweb: Boolean(merged.similarweb),
        gridRank: Boolean(merged.gridRank),
        mapDashboard: Boolean(merged.mapDashboard),
        pageSpeedInsights: Boolean(merged.pageSpeedInsights),
        updatedAt: new Date().toISOString(),
    };
}

async function getUserSetting(userId, key) {
    const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .eq('key', key)
        .maybeSingle();

    if (error) throw error;
    return data || null;
}

function normalizeCompanyProfile(body = {}) {
    return {
        companyName: String(body.companyName ?? DEFAULT_COMPANY_PROFILE.companyName).trim(),
        ownerName: String(body.ownerName ?? DEFAULT_COMPANY_PROFILE.ownerName).trim(),
        street: String(body.street ?? DEFAULT_COMPANY_PROFILE.street).trim(),
        zip: String(body.zip ?? DEFAULT_COMPANY_PROFILE.zip).trim(),
        city: String(body.city ?? DEFAULT_COMPANY_PROFILE.city).trim(),
        country: String(body.country ?? DEFAULT_COMPANY_PROFILE.country).trim(),
        email: String(body.email ?? DEFAULT_COMPANY_PROFILE.email).trim(),
        phone: String(body.phone ?? DEFAULT_COMPANY_PROFILE.phone).trim(),
        website: String(body.website ?? DEFAULT_COMPANY_PROFILE.website).trim(),
        taxId: String(body.taxId ?? DEFAULT_COMPANY_PROFILE.taxId).trim(),
        vatId: String(body.vatId ?? DEFAULT_COMPANY_PROFILE.vatId).trim(),
        logoUrl: String(body.logoUrl ?? DEFAULT_COMPANY_PROFILE.logoUrl).trim(),
        offerSetupFee: Number(body.offerSetupFee ?? DEFAULT_COMPANY_PROFILE.offerSetupFee),
        offerMonthlyRetainer: Number(body.offerMonthlyRetainer ?? DEFAULT_COMPANY_PROFILE.offerMonthlyRetainer),
        offerTermMonths: Number(body.offerTermMonths ?? DEFAULT_COMPANY_PROFILE.offerTermMonths),
        updatedAt: new Date().toISOString(),
    };
}

function withCompanyDefaults(profile = {}) {
    return {
        ...DEFAULT_COMPANY_PROFILE,
        ...(profile || {}),
    };
}

async function getSettingRecord(key) {
    const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('type', 'app_setting')
        .eq('title', `Setting ${key}`)
        .maybeSingle();

    if (error) throw error;
    return data || null;
}

router.get('/company-profile', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const record = await getSettingRecord(COMPANY_PROFILE_KEY);
        const profile = withCompanyDefaults(record ? parseJson(record.description) : {});
        res.json({ profile });
    } catch (err) {
        res.status(500).json({ error: 'Firmendaten konnten nicht geladen werden' });
    }
});

router.put('/company-profile', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const profile = normalizeCompanyProfile(withCompanyDefaults(req.body || {}));
        const existing = await getSettingRecord(COMPANY_PROFILE_KEY);

        if (!existing) {
            const { data, error } = await supabase
                .from('activities')
                .insert([{
                    title: `Setting ${COMPANY_PROFILE_KEY}`,
                    type: 'app_setting',
                    description: JSON.stringify(profile),
                    completed: true,
                    created_at: new Date().toISOString(),
                }])
                .select('*')
                .single();

            if (error || !data) {
                throw error || new Error('Firmendaten konnten nicht gespeichert werden');
            }

            return res.json({ profile });
        }

        const currentProfile = withCompanyDefaults(parseJson(existing.description));
        const merged = withCompanyDefaults({ ...currentProfile, ...profile });

        const { error } = await supabase
            .from('activities')
            .update({ description: JSON.stringify(merged) })
            .eq('id', existing.id)
            .eq('type', 'app_setting');

        if (error) throw error;

        res.json({ profile: merged });
    } catch (err) {
        res.status(500).json({ error: 'Firmendaten konnten nicht gespeichert werden' });
    }
});

// Feature Flags (per user)
router.get('/feature-flags', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const userId = req.userId;
        if (!userId) return res.status(401).json({ error: 'Nicht authentifiziert' });

        const record = await getUserSetting(userId, FEATURE_FLAGS_KEY);
        const parsed = record?.value ? parseJson(record.value) : {};
        const flags = normalizeFeatureFlags(parsed);
        res.json({ flags });
    } catch (err) {
        res.status(500).json({ error: 'Feature Flags konnten nicht geladen werden' });
    }
});

router.put('/feature-flags', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const userId = req.userId;
        if (!userId) return res.status(401).json({ error: 'Nicht authentifiziert' });

        const existing = await getUserSetting(userId, FEATURE_FLAGS_KEY);
        const current = existing?.value ? parseJson(existing.value) : {};
        const next = normalizeFeatureFlags({ ...current, ...(req.body?.flags || req.body || {}) });

        if (!existing) {
            const payload = {
                id: crypto.randomUUID(),
                user_id: userId,
                key: FEATURE_FLAGS_KEY,
                value: JSON.stringify(next),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };

            const { error } = await supabase
                .from('user_settings')
                .insert([payload]);

            if (error) throw error;
            return res.json({ flags: next });
        }

        const { error } = await supabase
            .from('user_settings')
            .update({ value: JSON.stringify(next), updated_at: new Date().toISOString() })
            .eq('id', existing.id)
            .eq('user_id', userId)
            .eq('key', FEATURE_FLAGS_KEY);

        if (error) throw error;
        res.json({ flags: next });
    } catch (err) {
        res.status(500).json({ error: 'Feature Flags konnten nicht gespeichert werden' });
    }
});

module.exports = router;
