const axios = require('axios');

const SIMILARWEB_BASE_URL = process.env.SIMILARWEB_BASE_URL || 'https://api.similarweb.com';

function ensureApiKey() {
    const apiKey = process.env.SIMILARWEB_API_KEY;
    if (!apiKey) {
        const error = new Error('SIMILARWEB_API_KEY fehlt in den Umgebungsvariablen');
        error.status = 503;
        throw error;
    }
    return apiKey;
}

function normalizeDomain(input) {
    if (!input) return '';
    const value = String(input).trim().toLowerCase();
    if (!value) return '';

    const withoutProtocol = value.replace(/^https?:\/\//, '');
    const withoutPath = withoutProtocol.split('/')[0];
    return withoutPath.replace(/^www\./, '');
}

async function requestSimilarweb(path, params = {}) {
    const apiKey = ensureApiKey();
    const response = await axios.get(`${SIMILARWEB_BASE_URL}${path}`, {
        params: {
            api_key: apiKey,
            main_domain_only: false,
            ...params,
        },
        timeout: 15000,
    });
    return response.data;
}

async function getTrafficAndEngagement(domain, options = {}) {
    const normalizedDomain = normalizeDomain(domain);
    if (!normalizedDomain) {
        throw new Error('domain ist erforderlich');
    }

    const endDate = options.endDate || new Date().toISOString().slice(0, 10);
    const start = new Date();
    start.setMonth(start.getMonth() - 3);
    const startDate = options.startDate || start.toISOString().slice(0, 10);

    const visits = await requestSimilarweb(
        `/v1/website/${normalizedDomain}/total-traffic-and-engagement/visits`,
        {
            start_date: startDate,
            end_date: endDate,
            granularity: 'monthly',
            country: options.country || 'world',
            format: 'json',
        },
    );

    const channels = await requestSimilarweb(
        `/v1/website/${normalizedDomain}/traffic-sources/overview-share`,
        {
            start_date: startDate,
            end_date: endDate,
            country: options.country || 'world',
            format: 'json',
        },
    );

    const latestVisits = Array.isArray(visits?.visits) && visits.visits.length
        ? visits.visits[visits.visits.length - 1]?.visits || 0
        : 0;

    return {
        domain: normalizedDomain,
        range: { startDate, endDate, country: options.country || 'world' },
        visits,
        channels,
        summary: {
            latestVisits,
            directShare: channels?.visits?.direct || 0,
            searchShare: channels?.visits?.search || 0,
            socialShare: channels?.visits?.social || 0,
            referralShare: channels?.visits?.referrals || 0,
        },
    };
}

async function compareDomains(primaryDomain, competitorDomain, options = {}) {
    const [primary, competitor] = await Promise.all([
        getTrafficAndEngagement(primaryDomain, options),
        getTrafficAndEngagement(competitorDomain, options),
    ]);

    const primaryVisits = Number(primary.summary.latestVisits || 0);
    const competitorVisits = Number(competitor.summary.latestVisits || 0);

    return {
        primary,
        competitor,
        comparison: {
            trafficGap: competitorVisits - primaryVisits,
            trafficGapPercent: primaryVisits
                ? Number((((competitorVisits - primaryVisits) / primaryVisits) * 100).toFixed(2))
                : null,
            strongerDomain: competitorVisits > primaryVisits ? competitor.domain : primary.domain,
        },
    };
}

module.exports = {
    normalizeDomain,
    getTrafficAndEngagement,
    compareDomains,
};
