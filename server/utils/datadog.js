/**
 * Datadog Monitoring Setup
 * Configures tracing and metrics for the AI Agency CRM.
 */
const dd_trace = require('dd-trace');

const initMonitoring = () => {
    if (process.env.NODE_ENV === 'production') {
        dd_trace.init({
            service: 'agency-crm-backend',
            env: 'production',
            version: '1.0.0',
            logInjection: true
        });
        console.log('[DATADOG] Monitoring initialized');
    } else {
        console.log('[DATADOG] Monitoring skipped in development');
    }
};

module.exports = { initMonitoring };
