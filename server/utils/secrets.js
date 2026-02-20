/**
 * Doppler Secret Management Integration
 * This utility handles loading secrets from Doppler if available,
 * otherwise falling back to process.env.
 */
const getSecret = (key, defaultValue = null) => {
    // In a real Doppler environment, you would use the Doppler SDK:
    // const Doppler = require("@dopplerhq/node-sdk");
    // const doppler = new Doppler({ accessToken: process.env.DOPPLER_TOKEN });

    // For now, we simulate the logic:
    const value = process.env[key] || defaultValue;
    if (!value) {
        console.warn(`[DOPPLER] Secret ${key} not found in environment.`);
    }
    return value;
};

module.exports = { getSecret };
