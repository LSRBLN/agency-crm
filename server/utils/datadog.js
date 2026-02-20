/**
 * Datadog Monitoring Setup
 * Configures tracing and metrics for the AI Agency CRM.
 */
let dd_trace = null;

try {
    dd_trace = require('dd-trace');
} catch (e) {
    console.warn('[DATADOG] dd-trace not installed, monitoring disabled');
}

const initMonitoring = () => {
    if (process.env.NODE_ENV === 'production') {
        if (dd_trace) {
            dd_trace.init({
                service: 'agency-crm-backend',
                env: 'production',
                version: '1.0.0',
                logInjection: true
            });
            console.log('[DATADOG] Monitoring initialized');
        } else {
            console.warn('[DATADOG] dd-trace not available, skipping init');
        }
    } else {
        console.log('[DATADOG] Monitoring skipped in development');
    }
};

/**
 * Track a custom metric in Datadog.
 * @param {string} name - Metric name (e.g. 'leads.created')
 * @param {number} value - Numeric value for the metric
 * @param {string[]} tags - Optional array of tags (e.g. ['env:production'])
 */
const trackMetric = (name, value, tags = []) => {
    if (dd_trace && process.env.NODE_ENV === 'production') {
        try {
            dd_trace.dogstatsd.gauge(name, value, tags);
        } catch (e) {
            console.warn(`[DATADOG] Failed to track metric "${name}":`, e.message);
        }
    }
};

/**
 * Track an error event in Datadog.
 * @param {Error} error - The error object to track
 * @param {string[]} tags - Optional array of tags
 */
const trackError = (error, tags = []) => {
    if (dd_trace && process.env.NODE_ENV === 'production') {
        try {
            const span = dd_trace.scope().active();
            if (span) {
                span.setTag('error', error);
            }
            dd_trace.dogstatsd.increment('errors', 1, [
                `error_name:${error.name || 'UnknownError'}`,
                ...tags
            ]);
        } catch (e) {
            console.warn('[DATADOG] Failed to track error:', e.message);
        }
    }
    console.error('[ERROR]', error.message || error);
};

module.exports = { initMonitoring, trackMetric, trackError };
