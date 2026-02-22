import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import ScoreGauge from '../components/ScoreGauge'

function safeJson(value, fallback) {
    if (value === null || value === undefined) return fallback
    if (typeof value === 'object') return value
    if (typeof value !== 'string') return fallback
    const trimmed = value.trim()
    if (!trimmed) return fallback
    try {
        return JSON.parse(trimmed)
    } catch {
        return fallback
    }
}

function normalizeTags(value) {
    if (Array.isArray(value)) return value.map((t) => String(t).trim()).filter(Boolean)
    if (typeof value === 'string') {
        return value
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
    }
    return []
}

function formatDt(value) {
    if (!value) return '-'
    const dt = new Date(value)
    if (Number.isNaN(dt.getTime())) return '-'
    return dt.toLocaleString('de-DE')
}

function normalizeUrl(raw) {
    const value = String(raw || '').trim()
    if (!value) return ''
    if (/^https?:\/\//i.test(value)) return value
    return `https://${value}`
}

function typeLabel(type) {
    const t = String(type || '').toLowerCase()
    if (!t) return 'Activity'
    if (t === 'note') return 'Note'
    if (t === 'outreach') return 'Outreach'
    if (t === 'task') return 'Task'
    if (t === 'onsite_analysis') return 'Onsite'
    if (t === 'lead_research') return 'Research'
    if (t === 'lead_profile') return 'Profile'
    if (t === 'similarweb_enrichment') return 'Enrichment'
    return t.replace(/_/g, ' ')
}

function typeBadgeClass(type) {
    const t = String(type || '').toLowerCase()
    if (t === 'note') return 'bg-surface-800 text-surface-200'
    if (t.includes('audit') || t === 'onsite_analysis') return 'bg-emerald-500/15 text-emerald-200'
    if (t.includes('enrich') || t.includes('research')) return 'bg-indigo-500/15 text-indigo-200'
    if (t === 'outreach') return 'bg-amber-500/15 text-amber-200'
    return 'bg-surface-800 text-surface-200'
}

function buildMapsQuery(contact) {
    const parts = [contact?.company, contact?.name, contact?.city, contact?.country].filter(Boolean)
    return parts.join(' ')
}

function calcCategoryScores(audit) {
    const checks = audit?.details?.trustAudit ? (audit.details.checks || []) : []

    const groups = [
        { label: 'Business Details', keys: ['website_presence', 'contact_data'] },
        { label: 'SEO Analysis', keys: ['ai_visibility', 'traffic_health'] },
        { label: 'Online Reputation', keys: ['review_signal'] },
        { label: 'Website Performance', keys: ['chat_widget'] },
        { label: 'Techno Stack', keys: [] },
        { label: 'Google Business Profile', keys: [] },
        { label: 'Listings', keys: [] },
    ]

    const byKey = new Map(checks.map((c) => [c.key, c]))

    return groups.map((group) => {
        const relevant = group.keys.map((k) => byKey.get(k)).filter(Boolean)
        const score = relevant.length
            ? Math.round((relevant.filter((c) => c.passed).length / relevant.length) * 100)
            : 0
        return { label: group.label, score }
    })
}

function scoreTone(score) {
    if (score >= 80) return 'text-emerald-300'
    if (score >= 50) return 'text-amber-300'
    return 'text-rose-300'
}

export default function LeadReport() {
    const { id } = useParams()
    const [contact, setContact] = useState(null)
    const [intelligence, setIntelligence] = useState(null)
    const [audit, setAudit] = useState(null)
    const [onsite, setOnsite] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)
    const [tagsInput, setTagsInput] = useState('')
    const [customRows, setCustomRows] = useState([])
    const [noteText, setNoteText] = useState('')

    const token = localStorage.getItem('token')
    const headers = { Authorization: `Bearer ${token}` }

    async function loadAll() {
        setLoading(true)
        setError('')
        try {
            const intelResp = await axios.get(`/api/leads/${id}/intelligence`, { headers })
            setIntelligence(intelResp.data)
            setContact(intelResp.data?.contact || null)

            const [auditResp, onsiteResp] = await Promise.allSettled([
                axios.get(`/api/audits/latest/by-lead/${id}`, { headers }),
                axios.get(`/api/audits/onsite-analysis/${id}`, { headers }),
            ])

            if (auditResp.status === 'fulfilled') setAudit(auditResp.value.data)
            if (onsiteResp.status === 'fulfilled') setOnsite(onsiteResp.value.data)
        } catch (err) {
            setError(err.response?.data?.error || 'Lead Report konnte nicht geladen werden')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        const tags = normalizeTags(contact?.tags)
        setTagsInput(tags.join(', '))

        const custom = safeJson(contact?.custom_fields, {})
        const entries = custom && typeof custom === 'object' && !Array.isArray(custom) ? Object.entries(custom) : []
        setCustomRows(entries.map(([key, value]) => ({ key, value })))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [contact?.id])

    useEffect(() => {
        loadAll()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id])

    async function runTrustAudit() {
        setError('')
        try {
            const resp = await axios.post(`/api/audits/trust-prospecting/${id}`, {}, { headers })
            setAudit(resp.data)
        } catch (err) {
            setError(err.response?.data?.error || 'Trust Audit fehlgeschlagen')
        }
    }

    async function runOnsiteAnalysis() {
        setError('')
        try {
            const resp = await axios.post(`/api/audits/onsite-analysis/${id}`, {}, { headers })
            setOnsite(resp.data)
        } catch (err) {
            setError(err.response?.data?.error || 'Vor-Ort Analyse fehlgeschlagen')
        }
    }

    async function downloadPdf(kind) {
        setError('')
        try {
            const suffix = kind === 'offer' ? 'offer-pdf' : 'pdf'
            const response = await axios.get(`/api/audits/onsite-analysis/${id}/${suffix}`, {
                headers,
                responseType: 'blob',
            })

            const blob = new Blob([response.data], { type: 'application/pdf' })
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `${kind === 'offer' ? 'angebot' : 'onsite-analyse'}-${(contact?.name || contact?.company || id).toLowerCase().replace(/[^a-z0-9-_]+/g, '-')}.pdf`
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.URL.revokeObjectURL(url)
        } catch (err) {
            setError(err.response?.data?.error || 'PDF konnte nicht geladen werden')
        }
    }

    const overallScore = Number(audit?.score || 0)
    const categories = useMemo(() => calcCategoryScores(audit), [audit])
    const mapQuery = buildMapsQuery(contact)
    const mapUrl = mapQuery
        ? `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`
        : null

    if (loading) {
        return (
            <div className="p-8 max-w-7xl mx-auto">
                <div className="crm-card p-6 text-surface-300">Lade Report...</div>
            </div>
        )
    }

    const tags = normalizeTags(contact?.tags)
    const customFields = safeJson(contact?.custom_fields, {})
    const websiteIntel = safeJson(customFields?.websiteIntel, null)
    const platformName = websiteIntel?.platform || null
    const platformConfidence = websiteIntel?.platformConfidence || null

    async function saveTags() {
        setError('')
        setSaving(true)
        try {
            const nextTags = normalizeTags(tagsInput)
            const resp = await axios.put(`/api/contacts/${id}`, { tags: nextTags }, { headers })
            setContact(resp.data)
        } catch (err) {
            setError(err.response?.data?.error || 'Tags konnten nicht gespeichert werden')
        } finally {
            setSaving(false)
        }
    }

    async function saveCustomFields() {
        setError('')
        setSaving(true)
        try {
            const obj = {}
            for (const row of customRows) {
                const k = String(row?.key || '').trim()
                if (!k) continue
                obj[k] = row?.value
            }

            const resp = await axios.put(`/api/contacts/${id}`, { custom_fields: obj }, { headers })
            setContact(resp.data)
        } catch (err) {
            setError(err.response?.data?.error || 'Custom Fields konnten nicht gespeichert werden')
        } finally {
            setSaving(false)
        }
    }

    async function addNote() {
        setError('')
        const text = String(noteText || '').trim()
        if (!text) return
        setSaving(true)
        try {
            await axios.post(`/api/leads/${id}/note`, { text }, { headers })
            setNoteText('')
            const intelResp = await axios.get(`/api/leads/${id}/intelligence`, { headers })
            setIntelligence(intelResp.data)
            setContact(intelResp.data?.contact || null)
        } catch (err) {
            setError(err.response?.data?.error || 'Notiz konnte nicht gespeichert werden')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs text-surface-400"><Link to="/leads" className="hover:underline">Leads</Link> / Report</p>
                    <h1 className="text-2xl font-bold text-white">{contact?.company || contact?.name || 'Lead Report'}</h1>
                    <div className="text-sm text-surface-400 mt-1 space-x-3">
                        {contact?.email && <span>{contact.email}</span>}
                        {contact?.phone && <span>{contact.phone}</span>}
                        {contact?.mobile_phone && <span>{contact.mobile_phone}</span>}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {!!contact?.status && (
                            <span className="px-2 py-1 rounded-full text-xs bg-surface-800 text-surface-200">Status: {contact.status}</span>
                        )}
                        {!!contact?.source && (
                            <span className="px-2 py-1 rounded-full text-xs bg-surface-800 text-surface-200">Quelle: {contact.source}</span>
                        )}
                        {!!contact?.attribution_source && (
                            <span className="px-2 py-1 rounded-full text-xs bg-surface-800 text-surface-200">Attribution: {contact.attribution_source}{contact?.attribution_campaign ? ` / ${contact.attribution_campaign}` : ''}</span>
                        )}
                        {!!platformName && (
                            <span className={`px-2 py-1 rounded-full text-xs ${typeBadgeClass('lead_research')}`}>Website: {platformName}{platformConfidence ? ` (${platformConfidence})` : ''}</span>
                        )}
                        {!platformName && contact?.website && (
                            <span className="px-2 py-1 rounded-full text-xs bg-surface-800 text-surface-200">Website: vorhanden</span>
                        )}
                        {!contact?.website && (
                            <span className="px-2 py-1 rounded-full text-xs bg-rose-500/15 text-rose-200">Keine Website</span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button className="btn-secondary" onClick={runTrustAudit}>Trust Audit</button>
                    <button className="btn-primary" onClick={runOnsiteAnalysis}>Vor-Ort Analyse</button>
                    <button className="btn-secondary" onClick={() => downloadPdf('onsite')}>PDF</button>
                    <button className="btn-primary" onClick={() => downloadPdf('offer')}>Angebot</button>
                </div>
            </div>

            {error && <div className="p-3 rounded-lg bg-rose-500/15 text-rose-300 text-sm">{error}</div>}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <aside className="lg:col-span-3 space-y-4">
                    <div className="crm-card p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <p className="text-white font-semibold leading-tight">{contact?.name || contact?.company || '-'}</p>
                                <p className="text-xs text-surface-400 mt-1">{contact?.company && contact?.name ? contact.company : contact?.position || contact?.company || ''}</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-surface-800 flex items-center justify-center text-surface-200 font-semibold">
                                {String(contact?.company || contact?.name || '?').slice(0, 1).toUpperCase()}
                            </div>
                        </div>

                        {tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {tags.slice(0, 12).map((t) => (
                                    <span key={t} className="px-2 py-1 rounded-full text-xs bg-surface-800 text-surface-200">{t}</span>
                                ))}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-2">
                            <a
                                className={`btn-secondary text-center ${!contact?.email ? 'opacity-50 pointer-events-none' : ''}`}
                                href={contact?.email ? `mailto:${contact.email}` : undefined}
                            >
                                Email
                            </a>
                            <a
                                className={`btn-secondary text-center ${!(contact?.mobile_phone || contact?.phone) ? 'opacity-50 pointer-events-none' : ''}`}
                                href={(contact?.mobile_phone || contact?.phone) ? `tel:${encodeURIComponent(contact?.mobile_phone || contact?.phone)}` : undefined}
                            >
                                Call
                            </a>
                            <a
                                className={`btn-primary text-center col-span-2 ${!contact?.website ? 'opacity-50 pointer-events-none' : ''}`}
                                href={contact?.website ? normalizeUrl(contact.website) : undefined}
                                target="_blank"
                                rel="noreferrer"
                            >
                                Website öffnen
                            </a>
                        </div>

                        <div className="text-xs text-surface-400 space-y-1">
                            {contact?.street_address && (
                                <p><span className="text-surface-500">Adresse:</span> {contact.street_address}</p>
                            )}
                            {(contact?.zip_code || contact?.city) && (
                                <p><span className="text-surface-500">Ort:</span> {[contact.zip_code, contact.city].filter(Boolean).join(' ')}</p>
                            )}
                            {(contact?.state || contact?.country) && (
                                <p><span className="text-surface-500">Region:</span> {[contact.state, contact.country].filter(Boolean).join(', ')}</p>
                            )}
                            {contact?.created_at && (
                                <p><span className="text-surface-500">Erstellt:</span> {formatDt(contact.created_at)}</p>
                            )}
                        </div>
                    </div>

                    <div className="crm-card p-4">
                        <ScoreGauge score={overallScore} size={160} label="Overall Score" />
                    </div>

                    <div className="crm-card p-4 space-y-3">
                        {categories.map((item) => (
                            <div key={item.label} className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-surface-200">{item.label}</p>
                                    <p className={`text-sm font-semibold ${scoreTone(item.score)}`}>{item.score}%</p>
                                </div>
                                <div className="h-2 bg-surface-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-crm-primary" style={{ width: `${item.score}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </aside>

                <section className="lg:col-span-9 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="crm-card p-4 space-y-2">
                            <div className="flex items-center justify-between">
                                <p className="text-white font-semibold">Tags</p>
                                <button className="btn-secondary" onClick={saveTags} disabled={saving}>Speichern</button>
                            </div>
                            <p className="text-xs text-surface-400">Kommagetrennt, wie bei GHL (z.B. <span className="text-surface-300">wordpress, hot-lead, berlin</span>)</p>
                            <input
                                className="input w-full"
                                value={tagsInput}
                                onChange={(e) => setTagsInput(e.target.value)}
                                placeholder="tags..."
                            />
                        </div>

                        <div className="crm-card p-4 space-y-2">
                            <div className="flex items-center justify-between">
                                <p className="text-white font-semibold">Quick Note</p>
                                <button className="btn-primary" onClick={addNote} disabled={saving || !String(noteText || '').trim()}>Add</button>
                            </div>
                            <textarea
                                className="input w-full min-h-[88px]"
                                value={noteText}
                                onChange={(e) => setNoteText(e.target.value)}
                                placeholder="Kurze Notiz für die Timeline…"
                            />
                        </div>
                    </div>

                    {mapUrl && (
                        <div className="crm-card overflow-hidden">
                            <div className="h-[320px] w-full bg-surface-800">
                                <iframe
                                    title="map"
                                    src={mapUrl}
                                    className="w-full h-full"
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                />
                            </div>
                            <div className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-white font-semibold">{contact?.name || '-'}</p>
                                    <p className="text-xs text-surface-400">{mapQuery}</p>
                                </div>
                                <a
                                    href={`https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn-secondary"
                                >
                                    View on map
                                </a>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="crm-card p-4">
                            <p className="text-surface-400 text-xs mb-1">Company</p>
                            <p className="text-white font-semibold">{contact?.company || '-'}</p>
                            <p className="text-surface-400 text-xs mt-2">Status: <span className="text-surface-200">{contact?.status || '-'}</span></p>
                            <p className="text-surface-400 text-xs">Quelle: <span className="text-surface-200">{contact?.source || '-'}</span></p>
                            <p className="text-surface-400 text-xs">Attribution: <span className="text-surface-200">{contact?.attribution_source || '-'}{contact?.attribution_campaign ? ` / ${contact.attribution_campaign}` : ''}</span></p>
                            <p className="text-surface-400 text-xs">Website: <span className="text-surface-200">{contact?.website ? contact.website : '-'}</span></p>
                            <p className="text-surface-400 text-xs">Platform: <span className="text-surface-200">{platformName || '-'}</span></p>
                        </div>
                        <div className="crm-card p-4">
                            <p className="text-surface-400 text-xs mb-1">Audit Checks</p>
                            {(audit?.details?.checks || []).slice(0, 6).map((check) => (
                                <div key={check.key} className="flex items-center justify-between text-sm py-1">
                                    <span className="text-surface-200">{check.label}</span>
                                    <span className={check.passed ? 'text-emerald-300' : 'text-rose-300'}>{check.passed ? 'OK' : 'Fix'}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="crm-card p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-white font-semibold">Custom Fields</h2>
                            <div className="flex items-center gap-2">
                                <button
                                    className="btn-secondary"
                                    onClick={() => setCustomRows((prev) => [...prev, { key: '', value: '' }])}
                                >
                                    + Feld
                                </button>
                                <button className="btn-primary" onClick={saveCustomFields} disabled={saving}>Speichern</button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {customRows.length === 0 && (
                                <p className="text-sm text-surface-400">Noch keine Custom Fields gesetzt.</p>
                            )}
                            {customRows.map((row, idx) => (
                                <div key={idx} className="grid grid-cols-12 gap-2">
                                    <input
                                        className="input col-span-4"
                                        value={row.key}
                                        onChange={(e) => {
                                            const value = e.target.value
                                            setCustomRows((prev) => prev.map((r, i) => (i === idx ? { ...r, key: value } : r)))
                                        }}
                                        placeholder="key"
                                    />
                                    <input
                                        className="input col-span-7"
                                        value={typeof row.value === 'string' ? row.value : JSON.stringify(row.value)}
                                        onChange={(e) => {
                                            const value = e.target.value
                                            setCustomRows((prev) => prev.map((r, i) => (i === idx ? { ...r, value } : r)))
                                        }}
                                        placeholder="value"
                                    />
                                    <button
                                        className="btn-secondary col-span-1"
                                        title="Entfernen"
                                        onClick={() => setCustomRows((prev) => prev.filter((_, i) => i !== idx))}
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="crm-card p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-white font-semibold">Timeline</h2>
                            <p className="text-xs text-surface-400">{(intelligence?.activities || []).length} Einträge</p>
                        </div>

                        <div className="space-y-2">
                            {(intelligence?.activities || []).slice(0, 60).map((act) => (
                                <div key={act.id} className="bg-surface-800/30 rounded p-3 flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-1 rounded-full text-xs ${typeBadgeClass(act.type)}`}>{typeLabel(act.type)}</span>
                                            <p className="text-sm text-white font-medium truncate">{act.title || '-'}</p>
                                        </div>
                                        <p className="text-xs text-surface-400 mt-1">{formatDt(act.created_at)}{act.due_date ? ` · Due: ${formatDt(act.due_date)}` : ''}</p>
                                    </div>
                                    <div className="text-xs text-surface-400 whitespace-nowrap">
                                        {act.completed ? '✓' : ''}
                                    </div>
                                </div>
                            ))}
                            {(intelligence?.activities || []).length === 0 && (
                                <p className="text-sm text-surface-400">Noch keine Timeline-Aktivitäten. Tipp: oben eine Quick Note hinzufügen.</p>
                            )}
                        </div>
                    </div>

                    <div className="crm-card p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-white font-semibold">Vor-Ort Potenzialanalyse</h2>
                            <p className="text-xs text-surface-400">{onsite?.generatedAt ? new Date(onsite.generatedAt).toLocaleString('de-DE') : '-'}</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="bg-surface-800/40 rounded p-3">
                                <p className="text-surface-400 text-xs mb-1">Zusätzliche Leads / Monat</p>
                                <p className="text-2xl font-bold text-white">{onsite?.analysis?.benefits?.additionalLeadsMonthly ?? '-'}</p>
                            </div>
                            <div className="bg-surface-800/40 rounded p-3">
                                <p className="text-surface-400 text-xs mb-1">Umsatzpotenzial / Monat</p>
                                <p className="text-2xl font-bold text-status-success">{Number(onsite?.analysis?.benefits?.additionalRevenueMonthly || 0).toLocaleString('de-DE')} €</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <p className="text-sm text-white font-medium">Empfohlene Optimierungen</p>
                            {(onsite?.analysis?.recommendations || []).map((item, idx) => (
                                <div key={`${item.area}-${idx}`} className="bg-surface-800/30 rounded p-3">
                                    <p className="text-sm text-white font-medium">{item.area} <span className="text-xs text-surface-500">({item.priority})</span></p>
                                    <p className="text-xs text-surface-400 mt-1">Problem: {item.issue}</p>
                                    <p className="text-xs text-surface-300 mt-1">Maßnahme: {item.optimization}</p>
                                    <p className="text-xs text-brand-300 mt-1">Nutzen: {item.expectedImpact}</p>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-2">
                            <p className="text-sm text-white font-medium">Pitch-Argumentation</p>
                            {(onsite?.analysis?.quickPitch || []).map((line, idx) => (
                                <p key={idx} className="text-sm text-surface-300">• {line}</p>
                            ))}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    )
}
