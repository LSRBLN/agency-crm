const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const auth = require('../middleware/auth');
const { supabase } = require('../services/supabaseClient');
const { normalizeDomain } = require('../services/similarwebService');

const router = express.Router();
router.use(auth);

// --- Caches (single-node VPS friendly) ---
// Purpose: reduce API cost/latency and make the lead search feel "instant" like GHL.
const websiteIntelCache = new Map();
const WEBSITE_INTEL_TTL_MS = 12 * 60 * 60 * 1000; // 12h

const geocodeCache = new Map();
const GEOCODE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7d

const placeDetailsCache = new Map();
const PLACE_DETAILS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7d

function getCached(map, key, ttlMs) {
    const hit = map.get(key);
    if (!hit) return null;
    if (Date.now() - hit.at > ttlMs) {
        map.delete(key);
        return null;
    }
    return hit.value;
}

function setCached(map, key, value) {
    map.set(key, { at: Date.now(), value });
    return value;
}

function safeJsonParse(value, fallback) {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'object') return value;
    if (typeof value !== 'string') return fallback;
    const trimmed = value.trim();
    if (!trimmed) return fallback;
    try {
        return JSON.parse(trimmed);
    } catch {
        return fallback;
    }
}

function hasSimilarwebKey() {
    return Boolean(process.env.SIMILARWEB_API_KEY);
}

function ensureDb(res) {
    if (!supabase) {
        res.status(503).json({ error: 'Datenbank nicht konfiguriert' });
        return false;
    }
    return true;
}

function ensureGoogleKey(res) {
    const key = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
    if (!key) {
        res.status(500).json({ error: 'GOOGLE_PLACES_API_KEY fehlt in der Server-Konfiguration' });
        return null;
    }
    return key;
}

function ensurePageSpeedKey() {
    // Allow separate key, but also allow reusing the Places key.
    return process.env.GOOGLE_PAGESPEED_API_KEY || process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';
}

function pickResultFields(item, details) {
    const placeId = item?.place_id || details?.place_id || null;
    const location = item?.geometry?.location || null;

    const website = details?.website || null;
    const domain = domainFromWebsite(website);

    return {
        placeId,
        name: item?.name || details?.name || null,
        address: item?.formatted_address || details?.formatted_address || null,
        rating: item?.rating ?? details?.rating ?? null,
        userRatingsTotal: item?.user_ratings_total ?? details?.user_ratings_total ?? null,
        types: Array.isArray(item?.types) ? item.types : Array.isArray(details?.types) ? details.types : [],
        lat: typeof location?.lat === 'number' ? location.lat : null,
        lng: typeof location?.lng === 'number' ? location.lng : null,
        website,
        domain,
        phone: details?.formatted_phone_number || null,
        googleMapsUrl: details?.url || null,
    };
}

const pagespeedCache = new Map();
const PAGESPEED_TTL_MS = 12 * 60 * 60 * 1000; // 12h

function getPageSpeedCached(key) {
    const hit = pagespeedCache.get(key);
    if (!hit) return null;
    if (Date.now() - hit.at > PAGESPEED_TTL_MS) {
        pagespeedCache.delete(key);
        return null;
    }
    return hit.value;
}

async function runPageSpeed(url, { strategy = 'mobile' } = {}) {
    const normalizedUrl = normalizeWebsiteUrl(url);
    if (!normalizedUrl) return { error: 'Keine URL' };

    const key = ensurePageSpeedKey();
    if (!key) return { error: 'GOOGLE_PAGESPEED_API_KEY fehlt' };

    const cacheKey = `${strategy}:${normalizedUrl}`;
    const cached = getPageSpeedCached(cacheKey);
    if (cached) return cached;

    try {
        const resp = await axios.get('https://www.googleapis.com/pagespeedonline/v5/runPagespeed', {
            params: {
                url: normalizedUrl,
                strategy,
                category: ['PERFORMANCE', 'SEO', 'ACCESSIBILITY', 'BEST_PRACTICES'],
                key,
            },
            timeout: 25000,
        });

        const lighthouse = resp.data?.lighthouseResult || null;
        const categories = lighthouse?.categories || {};
        const audits = lighthouse?.audits || {};

        const scoreTo100 = (value) => {
            const n = Number(value);
            if (!Number.isFinite(n)) return null;
            return Math.round(n * 100);
        };

        const result = {
            url: normalizedUrl,
            strategy,
            fetchedAt: new Date().toISOString(),
            scores: {
                performance: scoreTo100(categories?.performance?.score),
                seo: scoreTo100(categories?.seo?.score),
                accessibility: scoreTo100(categories?.accessibility?.score),
                bestPractices: scoreTo100(categories?.['best-practices']?.score),
            },
            metrics: {
                lcpMs: audits?.['largest-contentful-paint']?.numericValue ?? null,
                fcpMs: audits?.['first-contentful-paint']?.numericValue ?? null,
                cls: audits?.['cumulative-layout-shift']?.numericValue ?? null,
                tbtMs: audits?.['total-blocking-time']?.numericValue ?? null,
                siMs: audits?.['speed-index']?.numericValue ?? null,
            },
        };

        pagespeedCache.set(cacheKey, { at: Date.now(), value: result });
        return result;
    } catch (err) {
        const result = { url: normalizedUrl, strategy, error: err?.response?.data?.error?.message || err?.message || String(err) };
        pagespeedCache.set(`${strategy}:${normalizedUrl}`, { at: Date.now(), value: result });
        return result;
    }
}

async function mapWithConcurrency(items, limit, mapper) {
    const list = Array.isArray(items) ? items : [];
    const concurrency = Math.max(1, Number(limit) || 1);
    const results = new Array(list.length);
    let idx = 0;

    async function worker() {
        while (idx < list.length) {
            const current = idx;
            idx += 1;
            try {
                results[current] = await mapper(list[current], current);
            } catch (err) {
                results[current] = { error: err?.message || String(err) };
            }
        }
    }

    const workers = Array.from({ length: Math.min(concurrency, list.length) }, () => worker());
    await Promise.all(workers);
    return results;
}

function normalizeWebsiteUrl(raw) {
    const value = String(raw || '').trim();
    if (!value) return null;
    if (/^https?:\/\//i.test(value)) return value;
    return `https://${value}`;
}

function detectPlatformFromSignals({ url, headers = {}, html = '' }) {
    const lowerHtml = String(html || '').toLowerCase();
    const lowerUrl = String(url || '').toLowerCase();
    const headerEntries = Object.entries(headers || {}).map(([k, v]) => [String(k).toLowerCase(), String(v).toLowerCase()]);
    const getHeader = (name) => headerEntries.find(([k]) => k === name)?.[1] || '';

    const signals = [];

    // WordPress
    if (lowerUrl.includes('wordpress.com')) signals.push('url:wordpress.com');
    if (lowerHtml.includes('wp-content') || lowerHtml.includes('wp-includes') || lowerHtml.includes('wp-json')) signals.push('html:wp');
    if (lowerHtml.includes('generator') && lowerHtml.includes('wordpress')) signals.push('meta:generator=wordpress');
    if (signals.some((s) => s.includes('wp'))) {
        return { name: 'WordPress', confidence: signals.length >= 2 ? 'high' : 'medium', signals };
    }

    // Shopify
    if (lowerHtml.includes('cdn.shopify.com') || lowerHtml.includes('shopify') || getHeader('x-shopify-stage')) {
        signals.push('html/shopify');
        return { name: 'Shopify', confidence: 'medium', signals };
    }

    // Wix
    if (lowerHtml.includes('wix.com') || lowerHtml.includes('wixsite.com') || lowerHtml.includes('wixstatic.com')) {
        signals.push('html:wix');
        return { name: 'Wix', confidence: 'medium', signals };
    }

    // Squarespace
    if (lowerHtml.includes('squarespace.com') || lowerHtml.includes('static.squarespace.com')) {
        signals.push('html:squarespace');
        return { name: 'Squarespace', confidence: 'medium', signals };
    }

    // Webflow
    if (lowerHtml.includes('webflow') || lowerHtml.includes('webflow.com') || lowerHtml.includes('webflow.io')) {
        signals.push('html:webflow');
        return { name: 'Webflow', confidence: 'medium', signals };
    }

    // Joomla
    if (lowerHtml.includes('joomla') || lowerHtml.includes('/media/system/js/')) {
        signals.push('html:joomla');
        return { name: 'Joomla', confidence: 'low', signals };
    }

    // TYPO3
    if (lowerHtml.includes('typo3') || lowerHtml.includes('typo3temp') || lowerHtml.includes('data-typo3')) {
        signals.push('html:typo3');
        return { name: 'TYPO3', confidence: 'low', signals };
    }

    return { name: 'Unbekannt', confidence: 'low', signals };
}

async function detectWebsitePlatform(website) {
    const url = normalizeWebsiteUrl(website);
    if (!url) {
        return {
            hasWebsite: false,
            url: null,
            platform: null,
            seo: null,
            checkedAt: new Date().toISOString(),
        };
    }

    const cached = getCached(websiteIntelCache, url, WEBSITE_INTEL_TTL_MS);
    if (cached) return cached;

    try {
        const startedAt = Date.now();
        const resp = await axios.get(url, {
            timeout: 4500,
            maxRedirects: 5,
            responseType: 'text',
            maxContentLength: 220000,
            maxBodyLength: 220000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
            validateStatus: (status) => status >= 200 && status < 500,
        });

        const responseTimeMs = Date.now() - startedAt;
        const html = String(resp.data || '');
        const lower = html.toLowerCase();

        const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        const metaDescMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i);
        const robotsMatch = html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i);

        const robots = robotsMatch?.[1] ? String(robotsMatch[1]).toLowerCase() : '';
        const robotsNoindex = robots.includes('noindex') || robots.includes('none');

        const seo = {
            finalUrl: String(resp.request?.res?.responseUrl || url),
            responseTimeMs,
            contentLength: typeof resp.data === 'string' ? resp.data.length : null,
            title: titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim().slice(0, 180) : null,
            metaDescription: metaDescMatch ? metaDescMatch[1].replace(/\s+/g, ' ').trim().slice(0, 240) : null,
            robots,
            robotsNoindex,
            hasH1: /<h1\b/i.test(html),
            hasOpenGraph: lower.includes('property="og:') || lower.includes("property='og:"),
            hasSchemaOrg: lower.includes('application/ld+json') || lower.includes('schema.org'),
            hasSitemapLink: /<link[^>]+rel=["']sitemap["']/i.test(html),
            https: /^https:\/\//i.test(String(resp.request?.res?.responseUrl || url)),
        };

        const visibility = (() => {
            // Heuristic visibility score (not a SERP rank): helps sales quickly spot "broken" sites.
            let score = 50;
            const reasons = [];

            if (seo.https) {
                score += 10;
                reasons.push('HTTPS')
            } else {
                score -= 10;
                reasons.push('kein HTTPS')
            }

            if (seo.robotsNoindex) {
                score -= 40;
                reasons.push('noindex')
            }

            if (seo.title) {
                score += 10;
                reasons.push('Title')
            } else {
                score -= 8;
                reasons.push('kein Title')
            }

            if (seo.metaDescription) {
                score += 6;
                reasons.push('Meta')
            } else {
                score -= 4;
                reasons.push('keine Meta')
            }

            if (seo.hasH1) {
                score += 4;
                reasons.push('H1')
            }
            if (seo.hasSchemaOrg) {
                score += 6;
                reasons.push('Schema')
            }
            if (typeof seo.responseTimeMs === 'number') {
                if (seo.responseTimeMs < 900) score += 4;
                else if (seo.responseTimeMs > 2500) score -= 6;
            }

            score = Math.max(0, Math.min(100, score));
            const grade = score >= 80 ? 'A' : score >= 65 ? 'B' : score >= 45 ? 'C' : 'D';
            return { score, grade, reasons };
        })();

        const platform = detectPlatformFromSignals({
            url,
            headers: resp.headers || {},
            html,
        });

        return setCached(websiteIntelCache, url, {
            hasWebsite: true,
            url,
            platform,
            httpStatus: resp.status,
            seo,
            visibility,
            checkedAt: new Date().toISOString(),
        });
    } catch (err) {
        return setCached(websiteIntelCache, url, {
            hasWebsite: true,
            url,
            platform: { name: 'Unbekannt', confidence: 'low', signals: ['fetch_failed'] },
            seo: null,
            error: err?.message || String(err),
            checkedAt: new Date().toISOString(),
        });
    }
}

function computePopularitySignals(fields) {
    const rating = Number(fields?.rating || 0);
    const reviews = Number(fields?.userRatingsTotal || 0);
    const hasWebsite = Boolean(fields?.site?.hasWebsite);
    const visibilityScore = Number(fields?.site?.visibility?.score || 0);
    const responseTimeMs = Number(fields?.site?.seo?.responseTimeMs || 0);

    let score = 35;
    const reasons = [];

    if (rating >= 4.6) {
        score += 18;
        reasons.push('sehr gutes Rating');
    } else if (rating >= 4.2) {
        score += 12;
        reasons.push('gutes Rating');
    } else if (rating > 0) {
        score += 6;
        reasons.push('Rating vorhanden');
    }

    if (reviews >= 500) {
        score += 22;
        reasons.push('viele Reviews');
    } else if (reviews >= 150) {
        score += 16;
        reasons.push('Reviews');
    } else if (reviews >= 30) {
        score += 10;
        reasons.push('einige Reviews');
    }

    if (hasWebsite) {
        score += 8;
        reasons.push('Website');
    } else {
        score -= 10;
        reasons.push('keine Website');
    }

    if (visibilityScore >= 80) {
        score += 12;
        reasons.push('sehr sichtbar');
    } else if (visibilityScore >= 65) {
        score += 8;
        reasons.push('sichtbar');
    } else if (visibilityScore > 0) {
        score += 3;
        reasons.push('basic SEO');
    }

    if (responseTimeMs > 0) {
        if (responseTimeMs < 900) {
            score += 4;
            reasons.push('schnell');
        } else if (responseTimeMs > 2500) {
            score -= 6;
            reasons.push('langsam');
        }
    }

    score = Math.max(0, Math.min(100, score));
    const tier = score >= 80 ? 'high' : score >= 55 ? 'medium' : 'low';
    return { score, tier, reasons };
}

async function googleTextSearch({ query, limit = 10 }) {
    const key = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
    const url = 'https://maps.googleapis.com/maps/api/place/textsearch/json';
    const response = await axios.get(url, {
        params: {
            query,
            key,
        },
        timeout: 25000,
    });

    const payload = response.data || {};
    const results = Array.isArray(payload.results) ? payload.results : [];
    return results.slice(0, Math.max(1, Math.min(20, Number(limit) || 10)));
}

async function googleTextSearchWithLocation({ query, location, radius = 5000, limit = 20 }) {
    const key = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
    const url = 'https://maps.googleapis.com/maps/api/place/textsearch/json';
    const loc = location && typeof location.lat === 'number' && typeof location.lng === 'number'
        ? `${location.lat},${location.lng}`
        : '';

    const response = await axios.get(url, {
        params: {
            query,
            location: loc || undefined,
            radius: loc ? Math.max(1000, Math.min(50000, Number(radius) || 5000)) : undefined,
            key,
        },
        timeout: 25000,
    });

    const payload = response.data || {};
    const results = Array.isArray(payload.results) ? payload.results : [];
    return results.slice(0, Math.max(1, Math.min(20, Number(limit) || 20)));
}

const gridRankCache = new Map();
const GRID_RANK_TTL_MS = 60 * 60 * 1000; // 1h

function kmToDegLat(km) {
    return km / 111;
}

function kmToDegLng(km, atLat) {
    const lat = Number(atLat);
    const denom = 111 * Math.cos((lat * Math.PI) / 180);
    if (!Number.isFinite(denom) || denom === 0) return km / 111;
    return km / denom;
}

function summarizeRanks(points = []) {
    const ranks = points.map((p) => (typeof p.rank === 'number' ? p.rank : null)).filter((x) => typeof x === 'number');
    if (!ranks.length) {
        return { found: 0, total: points.length, best: null, worst: null, avg: null };
    }
    const sum = ranks.reduce((a, b) => a + b, 0);
    return {
        found: ranks.length,
        total: points.length,
        best: Math.min(...ranks),
        worst: Math.max(...ranks),
        avg: Number((sum / ranks.length).toFixed(2)),
    };
}

async function computeGridRank({ q, near, placeId, gridSize = 3, stepKm = 1.5, radius = 5000, limit = 20 }) {
    const oddGrid = gridSize % 2 === 1 ? gridSize : gridSize - 1;
    const center = await googleGeocode(near);
    if (!center) {
        const err = new Error('Ort konnte nicht geocodiert werden (Geocoding API aktiv?)');
        err.status = 502;
        throw err;
    }

    const half = Math.floor(oddGrid / 2);
    const dLat = kmToDegLat(stepKm);
    const dLng = kmToDegLng(stepKm, center.lat);

    const points = [];
    for (let y = -half; y <= half; y += 1) {
        for (let x = -half; x <= half; x += 1) {
            points.push({
                x,
                y,
                lat: Number((center.lat + y * dLat).toFixed(6)),
                lng: Number((center.lng + x * dLng).toFixed(6)),
                rank: null,
            });
        }
    }

    if (points.length > 25) {
        const err = new Error('gridSize zu groß');
        err.status = 400;
        throw err;
    }

    const scored = await mapWithConcurrency(points, 2, async (p) => {
        const results = await googleTextSearchWithLocation({
            query: `${q} in ${near}`,
            location: { lat: p.lat, lng: p.lng },
            radius,
            limit,
        });
        const idx = (results || []).findIndex((r) => r?.place_id === placeId);
        const rank = idx >= 0 ? idx + 1 : null;
        return { ...p, rank };
    });

    const matrix = [];
    for (let row = 0; row < oddGrid; row += 1) {
        const start = row * oddGrid;
        matrix.push(scored.slice(start, start + oddGrid).map((p) => p.rank));
    }

    return {
        query: q,
        near,
        placeId,
        center,
        gridSize: oddGrid,
        stepKm,
        radius,
        limit,
        summary: summarizeRanks(scored),
        points: scored,
        matrix,
        generatedAt: new Date().toISOString(),
    };
}

async function persistGridRankScan({ placeId, payload }) {
    try {
        const details = await googlePlaceDetails(placeId);
        const website = details?.website || null;
        const domain = domainFromWebsite(website);

        const record = {
            id: crypto.randomUUID(),
            place_id: placeId,
            place_name: details?.name || null,
            website,
            domain,
            query: payload.query,
            near: payload.near,
            center_lat: payload.center?.lat ?? null,
            center_lng: payload.center?.lng ?? null,
            grid_size: payload.gridSize,
            step_km: payload.stepKm,
            radius: payload.radius,
            result_limit: payload.limit,
            summary: JSON.stringify(payload.summary),
            matrix: JSON.stringify(payload.matrix),
            points: JSON.stringify(payload.points),
            generated_at: payload.generatedAt,
            created_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
            .from('grid_rank_scans')
            .insert([record])
            .select('id')
            .single();

        if (!error && data?.id) return data.id;
        return null;
    } catch {
        return null;
    }
}

// GET grid-rank: "Local Falcon light" for a single place within the query
router.get('/grid-rank', async (req, res) => {
    const key = ensureGoogleKey(res);
    if (!key) return;

    try {
        const q = String(req.query.q || '').trim();
        const near = String(req.query.near || '').trim();
        const placeId = String(req.query.placeId || '').trim();
        const save = String(req.query.save || '').trim() === '1';

        if (!q) return res.status(400).json({ error: 'q ist erforderlich' });
        if (!near) return res.status(400).json({ error: 'near ist erforderlich' });
        if (!placeId) return res.status(400).json({ error: 'placeId ist erforderlich' });

        const gridSize = Math.max(3, Math.min(5, Number(req.query.gridSize || 3)));
        const oddGrid = gridSize % 2 === 1 ? gridSize : gridSize - 1;
        const stepKm = Math.max(0.5, Math.min(5, Number(req.query.stepKm || 1.5)));
        const radius = Math.max(1000, Math.min(50000, Number(req.query.radius || 5000)));
        const limit = Math.max(10, Math.min(20, Number(req.query.limit || 20)));

        const cacheKey = JSON.stringify({ q, near, placeId, oddGrid, stepKm, radius, limit });
        const cached = getCached(gridRankCache, cacheKey, GRID_RANK_TTL_MS);
        if (cached) return res.json({ cached: true, ...cached });

        const computed = await computeGridRank({ q, near, placeId, gridSize: oddGrid, stepKm, radius, limit });
        const payload = { cached: false, ...computed };

        let savedScanId = null;
        if (save) {
            savedScanId = await persistGridRankScan({ placeId, payload });
        }

        const responsePayload = { ...payload, savedScanId };

        setCached(gridRankCache, cacheKey, responsePayload);
        res.json(responsePayload);
    } catch (err) {
        res.status(500).json({ error: err?.message || 'Grid Rank fehlgeschlagen' });
    }
});

// POST batch grid scan for multiple placeIds (rate-limited)
router.post('/grid-rank/batch', async (req, res) => {
    const key = ensureGoogleKey(res);
    if (!key) return;
    if (!ensureDb(res)) return;

    try {
        const q = String(req.body?.q || '').trim();
        const near = String(req.body?.near || '').trim();
        const placeIds = Array.isArray(req.body?.placeIds) ? req.body.placeIds.map((x) => String(x).trim()).filter(Boolean) : [];

        if (!q) return res.status(400).json({ error: 'q ist erforderlich' });
        if (!near) return res.status(400).json({ error: 'near ist erforderlich' });
        if (!placeIds.length) return res.status(400).json({ error: 'placeIds ist erforderlich' });

        const maxItems = 10;
        const safePlaceIds = placeIds.slice(0, maxItems);

        const gridSize = Math.max(3, Math.min(5, Number(req.body?.gridSize || 3)));
        const oddGrid = gridSize % 2 === 1 ? gridSize : gridSize - 1;
        const stepKm = Math.max(0.5, Math.min(5, Number(req.body?.stepKm || 1.5)));
        const radius = Math.max(1000, Math.min(50000, Number(req.body?.radius || 5000)));
        const limit = Math.max(10, Math.min(20, Number(req.body?.limit || 20)));

        const results = [];

        // Sequential by design: protects quota and keeps server stable.
        for (const placeId of safePlaceIds) {
            try {
                const computed = await computeGridRank({ q, near, placeId, gridSize: oddGrid, stepKm, radius, limit });
                const payload = { cached: false, ...computed };
                const savedScanId = await persistGridRankScan({ placeId, payload });
                results.push({ placeId, savedScanId, summary: payload.summary, gridSize: payload.gridSize });
            } catch (err) {
                results.push({ placeId, error: err?.message || 'Scan fehlgeschlagen' });
            }
        }

        res.json({
            query: q,
            near,
            requested: placeIds.length,
            processed: safePlaceIds.length,
            results,
            generatedAt: new Date().toISOString(),
        });
    } catch (err) {
        res.status(500).json({ error: err?.message || 'Batch Grid Rank fehlgeschlagen' });
    }
});

// List persisted grid rank scans for the Map Dashboard
router.get('/grid-scans', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const limit = Math.min(300, Math.max(1, Number(req.query.limit || 120)));
        const q = String(req.query.q || '').trim().toLowerCase();

        let dbQuery = supabase
            .from('grid_rank_scans')
            .select('id,place_id,place_name,website,domain,query,near,center_lat,center_lng,grid_size,step_km,radius,result_limit,summary,generated_at,created_at')
            .order('created_at', { ascending: false })
            .limit(limit);

        // Simple client-side filtering after fetch (SQLite adapter or() is limited)
        const { data, error } = await dbQuery;
        if (error) throw error;

        let items = Array.isArray(data) ? data : [];
        if (q) {
            items = items.filter((row) => {
                const hay = `${row.place_name || ''} ${row.domain || ''} ${row.query || ''} ${row.near || ''}`.toLowerCase();
                return hay.includes(q);
            });
        }

        const mapped = items.map((row) => {
            const summary = safeJsonParse(row.summary, null);
            return { ...row, summary };
        });

        res.json({ items: mapped });
    } catch (err) {
        res.status(500).json({ error: err?.message || 'Grid Scans konnten nicht geladen werden' });
    }
});

router.get('/grid-scans/:id', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const { data, error } = await supabase
            .from('grid_rank_scans')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (error || !data) {
            return res.status(404).json({ error: 'Scan nicht gefunden' });
        }

        res.json({
            ...data,
            summary: safeJsonParse(data.summary, null),
            matrix: safeJsonParse(data.matrix, []),
            points: safeJsonParse(data.points, []),
        });
    } catch (err) {
        res.status(500).json({ error: err?.message || 'Scan konnte nicht geladen werden' });
    }
});

async function googlePlaceDetails(placeId) {
    const cacheKey = String(placeId || '').trim();
    if (!cacheKey) return null;
    const cached = getCached(placeDetailsCache, cacheKey, PLACE_DETAILS_TTL_MS);
    if (cached) return cached;

    const key = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
    const url = 'https://maps.googleapis.com/maps/api/place/details/json';
    const response = await axios.get(url, {
        params: {
            place_id: placeId,
            fields: 'place_id,name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,types,url',
            key,
        },
        timeout: 25000,
    });

    const result = response.data?.result || null;
    return setCached(placeDetailsCache, cacheKey, result);
}

async function googleGeocode(address) {
    const key = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
    const value = String(address || '').trim();
    if (!value) return null;

    const cached = getCached(geocodeCache, value.toLowerCase(), GEOCODE_TTL_MS);
    if (cached) return cached;

    const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
        params: {
            address: value,
            key,
        },
        timeout: 20000,
    });

    const loc = response.data?.results?.[0]?.geometry?.location || null;
    if (!loc || typeof loc.lat !== 'number' || typeof loc.lng !== 'number') {
        return setCached(geocodeCache, value.toLowerCase(), null);
    }

    return setCached(geocodeCache, value.toLowerCase(), { lat: loc.lat, lng: loc.lng });
}

function domainFromWebsite(website) {
    const normalized = normalizeDomain(website);
    return normalized || null;
}

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
    } else if (source.includes('google')) {
        score += 8;
        reasons.push('Google Business Quelle');
    }

    return {
        score: Math.max(0, Math.min(100, score)),
        priority: score >= 75 ? 'hot' : score >= 45 ? 'warm' : 'cold',
        reasons,
    };
}

router.get('/', async (req, res) => {
    const key = ensureGoogleKey(res);
    if (!key) return;

    try {
        const q = String(req.query.q || '').trim();
        const near = String(req.query.near || 'Berlin, Deutschland').trim();
        const limit = Number(req.query.limit || 10);

        if (!q) {
            return res.status(400).json({ error: 'q ist erforderlich' });
        }

        const query = near ? `${q} in ${near}` : q;
        const results = await googleTextSearch({ query, limit });

        const includePageSpeed = String(req.query.pagespeed || '').trim() === '1';
        const concurrency = includePageSpeed ? 2 : 3;

        const enriched = await mapWithConcurrency(results, concurrency, async (item, idx) => {
            const placeId = item?.place_id;
            let details = null;
            if (placeId) {
                try {
                    details = await googlePlaceDetails(placeId);
                } catch {
                    details = null;
                }
            }

            const fields = pickResultFields(item, details);
            fields.site = await detectWebsitePlatform(fields.website);

            // Approximate "Google Platzierung" as the ordering within this query result.
            // This is *not* organic rank, but it's very useful for Maps/Places lead prospecting.
            fields.googleRank = typeof idx === 'number' ? idx + 1 : null;
            fields.googleQuery = query;

            // Free “traffic-ish” proxy signals (no paid APIs).
            fields.popularity = computePopularitySignals(fields);

            if (includePageSpeed && fields.site?.hasWebsite && (fields.site?.seo?.finalUrl || fields.site?.url)) {
                fields.pagespeed = await runPageSpeed(fields.site.seo?.finalUrl || fields.site.url, { strategy: 'mobile' });
            }
            return fields;
        });

        res.json({ query, items: enriched });
    } catch (err) {
        res.status(500).json({ error: 'Lead-Suche fehlgeschlagen' });
    }
});

router.post('/import', async (req, res) => {
    if (!ensureDb(res)) return;

    const key = ensureGoogleKey(res);
    if (!key) return;

    try {
        const placeId = String(req.body?.placeId || '').trim();
        if (!placeId) {
            return res.status(400).json({ error: 'placeId ist erforderlich' });
        }

        const details = await googlePlaceDetails(placeId);
        if (!details) {
            return res.status(404).json({ error: 'Place nicht gefunden' });
        }

        const website = details.website || null;
        const domain = domainFromWebsite(website);

        const site = await detectWebsitePlatform(website);

        const baseCustomFields = {
            google: {
                placeId: details.place_id || placeId,
                mapsUrl: details.url || null,
                rating: details.rating ?? null,
                userRatingsTotal: details.user_ratings_total ?? null,
                types: Array.isArray(details.types) ? details.types : [],
            },
            websiteIntel: {
                hasWebsite: Boolean(site?.hasWebsite),
                url: site?.url || null,
                httpStatus: site?.httpStatus ?? null,
                platform: site?.platform?.name || null,
                platformConfidence: site?.platform?.confidence || null,
                platformSignals: site?.platform?.signals || [],
                checkedAt: site?.checkedAt || null,
                error: site?.error || null,
            },
        };

        const leadPayload = {
            name: details.name || null,
            first_name: null,
            last_name: null,
            email: null,
            phone: details.formatted_phone_number || null,
            mobile_phone: null,
            company: details.name || null,
            website,
            street_address: details.formatted_address || null,
            position: null,
            status: 'lead',
            source: 'google_places',
            attribution_source: 'google_places',
            attribution_campaign: null,
            notes: [
                details.formatted_address ? `Adresse: ${details.formatted_address}` : null,
                details.rating ? `Rating: ${details.rating} (${details.user_ratings_total || 0})` : null,
                website ? `Website: ${website}` : null,
                details.url ? `Maps: ${details.url}` : null,
            ].filter(Boolean).join('\n'),
            tags: Array.isArray(details.types) ? details.types.slice(0, 8) : [],
            custom_fields: JSON.stringify(baseCustomFields),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        const { data: contact, error: insertError } = await supabase
            .from('contacts')
            .insert([leadPayload])
            .select('*')
            .single();

        if (insertError || !contact) {
            throw insertError || new Error('Lead konnte nicht gespeichert werden');
        }

        // Similarweb is paid; keep enrichment disabled by default.
        // If you later add a key, you can re-enable this part.
        let enrichmentSnapshot = null;
        let enrichmentError = null;

        if (!domain) {
            enrichmentError = 'Keine Website/Domäne vorhanden (Traffic nicht schätzbar)';
        } else if (!hasSimilarwebKey()) {
            enrichmentError = 'Traffic-Quelle deaktiviert (Similarweb kostenpflichtig)';
        }

        const scoring = extractLeadScore(contact, enrichmentSnapshot);

        res.status(201).json({
            success: true,
            contact,
            place: pickResultFields(details, details),
            enrichment: enrichmentSnapshot ? { summary: enrichmentSnapshot.summary, domain: enrichmentSnapshot.domain } : null,
            enrichmentError,
            scoring,
        });
    } catch (err) {
        res.status(500).json({ error: err.message || 'Import fehlgeschlagen' });
    }
});

module.exports = router;
