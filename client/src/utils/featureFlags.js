const STORAGE_KEY = 'crmFeatureFlags'

export const defaultFeatureFlags = {
    // Paid / optional
    similarweb: false,

    // Local SEO / Lead intel
    gridRank: true,
    mapDashboard: true,

    // Optional (can increase latency / quota)
    pageSpeedInsights: false,
}

export function getFeatureFlags() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return { ...defaultFeatureFlags }
        const parsed = JSON.parse(raw)
        return { ...defaultFeatureFlags, ...(parsed || {}) }
    } catch {
        return { ...defaultFeatureFlags }
    }
}

export function setFeatureFlags(next) {
    const current = getFeatureFlags()
    const merged = { ...current, ...(next || {}) }
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
    } catch {
        // ignore
    }

    // Same-tab update signal
    try {
        window.dispatchEvent(new CustomEvent('crm:featureFlags', { detail: merged }))
    } catch {
        // ignore
    }

    return merged
}

function getToken() {
    try {
        return localStorage.getItem('token')
    } catch {
        return null
    }
}

export async function refreshFeatureFlagsFromServer() {
    const token = getToken()
    if (!token) return getFeatureFlags()

    try {
        const resp = await fetch('/api/settings/feature-flags', {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })
        const json = await resp.json()
        if (!resp.ok) return getFeatureFlags()

        const flags = { ...defaultFeatureFlags, ...(json?.flags || {}) }
        return setFeatureFlags(flags)
    } catch {
        return getFeatureFlags()
    }
}

export async function saveFeatureFlagsToServer(patch) {
    const token = getToken()
    const merged = setFeatureFlags(patch)
    if (!token) return merged

    try {
        const resp = await fetch('/api/settings/feature-flags', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ flags: merged }),
        })
        const json = await resp.json()
        if (!resp.ok) return merged
        return setFeatureFlags({ ...defaultFeatureFlags, ...(json?.flags || {}) })
    } catch {
        return merged
    }
}

export function subscribeFeatureFlags(onChange) {
    if (typeof onChange !== 'function') return () => {}

    const handler = () => onChange(getFeatureFlags())
    const customHandler = (evt) => {
        if (evt?.detail) onChange({ ...defaultFeatureFlags, ...evt.detail })
        else onChange(getFeatureFlags())
    }

    window.addEventListener('storage', handler)
    window.addEventListener('crm:featureFlags', customHandler)

    return () => {
        window.removeEventListener('storage', handler)
        window.removeEventListener('crm:featureFlags', customHandler)
    }
}
