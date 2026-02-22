import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { Plus, Play, RefreshCw, Sparkles } from 'lucide-react'

const initialForm = {
    name: '',
    objective: '',
    platform: 'instagram',
    targetProvider: 'meta',
    targetAccountId: '',
    topic: '',
    tone: 'professionell',
    scheduledAt: '',
    caption: '',
    hashtags: '',
    imagePrompt: '',
}

export default function Marketing() {
    const [campaigns, setCampaigns] = useState([])
    const [accounts, setAccounts] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState(initialForm)
    const [generating, setGenerating] = useState(false)

    const token = localStorage.getItem('token')
    const headers = { Authorization: `Bearer ${token}` }

    async function loadCampaigns() {
        setLoading(true)
        setError('')
        try {
            const [campaignsRes, accountsRes] = await Promise.all([
                axios.get('/api/social-planner/campaigns', { headers }),
                axios.get('/api/social-integrations/accounts', { headers }),
            ])
            setCampaigns(Array.isArray(campaignsRes.data) ? campaignsRes.data : [])
            setAccounts(Array.isArray(accountsRes.data?.accounts) ? accountsRes.data.accounts : [])
        } catch (err) {
            setError(err.response?.data?.error || 'Social Planner konnte nicht geladen werden')
        } finally {
            setLoading(false)
        }
    }

    async function connectProvider(provider) {
        try {
            const response = await axios.get(`/api/social-integrations/oauth/${provider}/start`, { headers })
            const url = response.data?.url
            if (!url) throw new Error('OAuth URL fehlt')
            window.open(url, '_blank', 'width=720,height=800')
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'OAuth Start fehlgeschlagen')
        }
    }

    useEffect(() => {
        loadCampaigns()
    }, [])

    const stats = useMemo(() => {
        const active = campaigns.filter((campaign) => campaign.status === 'scheduled' || campaign.status === 'draft').length
        const posted = campaigns.filter((campaign) => campaign.status === 'posted').length
        return {
            active,
            posted,
            total: campaigns.length,
            platforms: new Set(campaigns.map((campaign) => campaign.platform).filter(Boolean)).size,
        }
    }, [campaigns])

    const compatibleAccounts = useMemo(() => {
        if (form.platform === 'linkedin') {
            return accounts.filter((account) => account.provider === 'linkedin')
        }
        if (form.platform === 'facebook' || form.platform === 'instagram') {
            return accounts.filter((account) => account.provider === 'meta')
        }
        return []
    }, [accounts, form.platform])

    async function generateWithAI() {
        setGenerating(true)
        setError('')
        try {
            const response = await axios.post('/api/social-planner/generate', {
                businessName: 'Gemini CRM Agency',
                objective: form.objective,
                platform: form.platform,
                tone: form.tone,
                topic: form.topic,
            }, { headers })

            const generated = response.data || {}
            setForm((prev) => ({
                ...prev,
                caption: generated.caption || prev.caption,
                hashtags: Array.isArray(generated.hashtags) ? generated.hashtags.join(' ') : prev.hashtags,
                imagePrompt: generated.imagePrompt || prev.imagePrompt,
            }))
        } catch (err) {
            setError(err.response?.data?.error || 'KI-Generierung fehlgeschlagen')
        } finally {
            setGenerating(false)
        }
    }

    async function saveCampaign(e) {
        e.preventDefault()
        setError('')
        try {
            await axios.post('/api/social-planner/campaigns', {
                name: form.name,
                objective: form.objective,
                platform: form.platform,
                targetProvider: form.targetProvider || null,
                targetAccountId: form.targetAccountId || null,
                topic: form.topic,
                status: form.scheduledAt ? 'scheduled' : 'draft',
                scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null,
                caption: form.caption,
                hashtags: form.hashtags.split(' ').filter(Boolean),
                imagePrompt: form.imagePrompt,
                autoPost: Boolean(form.scheduledAt),
            }, { headers })

            setForm(initialForm)
            setShowForm(false)
            await loadCampaigns()
        } catch (err) {
            setError(err.response?.data?.error || 'Campaign konnte nicht gespeichert werden')
        }
    }

    async function postNow(campaignId) {
        try {
            await axios.post(`/api/social-planner/campaigns/${campaignId}/post`, {}, { headers })
            await loadCampaigns()
        } catch (err) {
            setError(err.response?.data?.error || 'Posting fehlgeschlagen')
        }
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Social Planner</h1>
                    <p className="text-surface-400 mt-1">KI-Inhalte erstellen, planen und posten</p>
                </div>
                <button className="btn-primary flex items-center gap-2" onClick={() => setShowForm(true)}>
                    <Plus className="w-4 h-4" />
                    Neue Kampagne
                </button>
            </div>

            {error && <div className="mb-4 p-3 rounded-lg bg-rose-500/15 text-rose-300 text-sm">{error}</div>}

            <div className="crm-card p-4 mb-6">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-white font-semibold">Social Accounts</h2>
                    <div className="flex gap-2">
                        <button className="btn-secondary text-xs" onClick={() => connectProvider('meta')}>Meta verbinden</button>
                        <button className="btn-secondary text-xs" onClick={() => connectProvider('linkedin')}>LinkedIn verbinden</button>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    {accounts.map((account, index) => (
                        <div key={`${account.provider}-${index}`} className="bg-surface-800/40 rounded p-3">
                            <p className="text-white font-medium">{account.provider}</p>
                            <p className="text-surface-400">{account.accountName || '-'}</p>
                            <p className="text-xs text-surface-500">ID: {account.accountId || '-'}</p>
                            <p className={`text-xs ${account.expired ? 'text-rose-300' : 'text-emerald-300'}`}>{account.expired ? 'Token abgelaufen' : 'Token aktiv'}</p>
                            <p className="text-xs text-surface-500">Verbunden: {account.connectedAt ? new Date(account.connectedAt).toLocaleString('de-DE') : '-'}</p>
                        </div>
                    ))}
                    {accounts.length === 0 && <p className="text-surface-500">Noch keine verbundenen Accounts</p>}
                </div>
            </div>

            {showForm && (
                <form onSubmit={saveCampaign} className="crm-card p-4 mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input className="input-field" placeholder="Kampagnenname" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    <input className="input-field" placeholder="Ziel" value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} />
                    <select
                        className="input-field"
                        value={form.platform}
                        onChange={(e) => {
                            const nextPlatform = e.target.value
                            const nextProvider = nextPlatform === 'linkedin' ? 'linkedin' : (nextPlatform === 'facebook' || nextPlatform === 'instagram' ? 'meta' : '')
                            setForm({ ...form, platform: nextPlatform, targetProvider: nextProvider, targetAccountId: '' })
                        }}
                    >
                        <option value="instagram">Instagram</option>
                        <option value="facebook">Facebook</option>
                        <option value="linkedin">LinkedIn</option>
                        <option value="x">X</option>
                    </select>
                    <select
                        className="input-field"
                        value={form.targetAccountId}
                        onChange={(e) => {
                            const selected = compatibleAccounts.find((account) => String(account.accountId) === e.target.value)
                            setForm({
                                ...form,
                                targetAccountId: e.target.value,
                                targetProvider: selected?.provider || form.targetProvider,
                            })
                        }}
                    >
                        <option value="">Account automatisch wählen</option>
                        {compatibleAccounts.map((account) => (
                            <option key={`${account.provider}-${account.accountId}`} value={account.accountId}>
                                {account.accountName || account.provider} ({account.accountId})
                            </option>
                        ))}
                    </select>
                    <input className="input-field" placeholder="Thema" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
                    <select className="input-field" value={form.tone} onChange={(e) => setForm({ ...form, tone: e.target.value })}>
                        <option value="professionell">Professionell</option>
                        <option value="freundlich">Freundlich</option>
                        <option value="verkaufsstark">Verkaufsstark</option>
                    </select>
                    <input type="datetime-local" className="input-field" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} />
                    <textarea className="input-field md:col-span-2" rows={3} placeholder="Caption" value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} />
                    <input className="input-field" placeholder="#hashtags" value={form.hashtags} onChange={(e) => setForm({ ...form, hashtags: e.target.value })} />
                    <input className="input-field md:col-span-2" placeholder="Bild-Prompt" value={form.imagePrompt} onChange={(e) => setForm({ ...form, imagePrompt: e.target.value })} />
                    <div className="md:col-span-1 flex justify-end gap-2">
                        <button type="button" className="btn-secondary flex items-center gap-2" onClick={generateWithAI} disabled={generating}>
                            {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            KI
                        </button>
                        <button type="submit" className="btn-primary">Speichern</button>
                    </div>
                </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="crm-card p-4"><p className="text-surface-400 text-sm">Aktive Planner</p><p className="text-2xl font-bold text-white">{stats.active}</p></div>
                <div className="crm-card p-4"><p className="text-surface-400 text-sm">Gepostet</p><p className="text-2xl font-bold text-status-success">{stats.posted}</p></div>
                <div className="crm-card p-4"><p className="text-surface-400 text-sm">Plattformen</p><p className="text-2xl font-bold text-status-info">{stats.platforms}</p></div>
                <div className="crm-card p-4"><p className="text-surface-400 text-sm">Kampagnen</p><p className="text-2xl font-bold text-crm-accent">{stats.total}</p></div>
            </div>

            <div className="crm-card overflow-hidden">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th className="table-header">Kampagne</th>
                                <th className="table-header">Plattform</th>
                                <th className="table-header">Status</th>
                                <th className="table-header">Zeitpunkt</th>
                                <th className="table-header">Caption</th>
                                <th className="table-header text-right">Aktion</th>
                            </tr>
                        </thead>
                        <tbody>
                            {!loading && campaigns.map((campaign) => (
                                <tr key={campaign.id} className="hover:bg-surface-700/30">
                                    <td className="table-cell font-medium text-white">{campaign.name}</td>
                                    <td className="table-cell">{campaign.platform}</td>
                                    <td className="table-cell">{campaign.status}</td>
                                    <td className="table-cell text-surface-400">{campaign.scheduledAt ? new Date(campaign.scheduledAt).toLocaleString('de-DE') : '-'}</td>
                                    <td className="table-cell text-surface-400 truncate max-w-[280px]">{campaign.caption || '-'}</td>
                                    <td className="table-cell text-right">
                                        <button className="btn-secondary text-xs inline-flex items-center gap-1" onClick={() => postNow(campaign.id)} disabled={campaign.status === 'posted'}>
                                            <Play className="w-3 h-3" />
                                            Posten
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {!loading && campaigns.length === 0 && (
                                <tr><td className="table-cell text-center text-surface-400 py-12" colSpan={6}>Keine Kampagnen vorhanden</td></tr>
                            )}
                            {loading && (
                                <tr><td className="table-cell text-center text-surface-400 py-12" colSpan={6}>Lade Kampagnen...</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
