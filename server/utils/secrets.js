/**
 * Doppler Secret Management Integration
 * This utility handles loading secrets from Doppler if available,
 * otherwise falling back to process.env.
 */
let dopplerClient = null;

async function initDoppler() {
    try {
        const { DopplerSDK } = require('@dopplerhq/node-sdk');
        dopplerClient = new DopplerSDK({ accessToken: process.env.DOPPLER_TOKEN });
        console.log('[DOPPLER] Initialized successfully');
    } catch (e) {
        console.log('[DOPPLER] Not available, falling back to process.env');
    }
}

async function getSecret(key) {
    if (dopplerClient) {
        try {
            const { value } = await dopplerClient.secrets.get(process.env.DOPPLER_PROJECT, process.env.DOPPLER_CONFIG, key);
            return value.computed;
        } catch (e) {
            console.warn(`[DOPPLER] Failed to get ${key}, falling back to env`);
        }
    }
    return process.env[key];
}

module.exports = { initDoppler, getSecret };
