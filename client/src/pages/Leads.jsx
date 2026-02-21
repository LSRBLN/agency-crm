import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import CSVUploader from '../components/CSVUploader'
import { Search, Filter } from 'lucide-react'

export default function Leads() {
    const [leads, setLeads] = useState([])
    const [scoredLeads, setScoredLeads] = useState([])
    const [search, setSearch] = useState('')
    const [status, setStatus] = useState('all')
    const [priority, setPriority] = useState('all')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [primaryDomain, setPrimaryDomain] = useState('')
    const [competitorDomain, setCompetitorDomain] = useState('')
    const [compareResult, setCompareResult] = useState(null)
    const [compareLoading, setCompareLoading] = useState(false)
    const [compareError, setCompareError] = useState('')
    const [enrichingLeadId, setEnrichingLeadId] = useState('')
    const [enrichMessage, setEnrichMessage] = useState('')
    const [historyLeadId, setHistoryLeadId] = useState('')
    const [historyItems, setHistoryItems] = useState([])
    const [historyLoading, setHistoryLoading] = useState(false)
    const [auditMessage, setAuditMessage] = useState('')
    const [onsiteLoadingId, setOnsiteLoadingId] = useState('')
    const [onsiteResult, setOnsiteResult] = useState(null)
    const [onsiteError, setOnsiteError] = useState('')

    const token = localStorage.getItem('token')
    const headers = { Authorization: `Bearer ${token}` }

    async function loadLeads() {
        setLoading(true)
        setError('')
        try {
            const [response, scoreResponse] = await Promise.all([
                axios.get('/api/leads', {
                    headers,
                    params: {
                        q: search || undefined,
                        status,
                    },
                }),
                axios.get('/api/leads/scored', { headers, params: { limit: 300 } }),
            ])

            const leadItems = Array.isArray(response.data) ? response.data : []
            const scoreItems = Array.isArray(scoreResponse.data?.items) ? scoreResponse.data.items : []
            const scoreMap = new Map(scoreItems.map((item) => [item.id, item]))

            setLeads(leadItems.map((lead) => {
                const scored = scoreMap.get(lead.id)
                if (!scored) return lead
                return {
                    ...lead,
                    score: scored.score,
                    priority: scored.priority,
                    scoreReasons: scored.scoreReasons,
                }
            }))
            setScoredLeads(scoreItems)
        } catch (err) {
            setError(err.response?.data?.error || 'Leads konnten nicht geladen werden')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadLeads()
    }, [search, status])

    async function handleCSVUpload() {
        await loadLeads()
    }

    const stats = useMemo(() => {
        return {
            total: leads.length,
            lead: leads.filter((lead) => lead.status === 'lead').length,
            active: leads.filter((lead) => lead.status === 'active').length,
            inactive: leads.filter((lead) => lead.status === 'inactive').length,
            hot: scoredLeads.filter((lead) => lead.priority === 'hot').length,
        }
    }, [leads, scoredLeads])

    const visibleLeads = useMemo(() => {
        if (priority === 'all') return leads
        return leads.filter((lead) => (lead.priority || 'cold') === priority)
    }, [leads, priority])

    function inferDomainFromLead(lead) {
        const candidate = String(lead.company || '').trim().toLowerCase()
        if (!candidate) return ''
        if (candidate.includes('.')) return candidate.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
        return ''
    }

    async function runCompare() {
        if (!primaryDomain || !competitorDomain) {
            setCompareError('Bitte Domain und Wettbewerber-Domain angeben')
            return
        }

        setCompareLoading(true)
        setCompareError('')
        try {
            const response = await axios.get('/api/similarweb/compare', {
                headers,
                params: {
                    domain: primaryDomain,
                    competitor: competitorDomain,
                },
            })
            setCompareResult(response.data)
        } catch (err) {
            setCompareError(err.response?.data?.error || 'Similarweb-Vergleich fehlgeschlagen')
        } finally {
            setCompareLoading(false)
        }
    }

    async function enrichLead(lead) {
        const inferred = inferDomainFromLead(lead)
        if (!inferred) {
            setEnrichMessage(`Keine Domain für ${lead.name || lead.company || 'Lead'} ableitbar`)
            return
        }

        setEnrichingLeadId(lead.id)
        setEnrichMessage('')
        try {
            const response = await axios.post(`/api/similarweb/enrich/${lead.id}`, {
                domain: inferred,
                competitor: competitorDomain || undefined,
            }, { headers })

            const visits = Number(response.data?.snapshot?.summary?.latestVisits || 0).toLocaleString('de-DE')
            setEnrichMessage(`Enrichment gespeichert für ${inferred} (${visits} Visits)`)
        } catch (err) {
            setEnrichMessage(err.response?.data?.error || 'Enrichment fehlgeschlagen')
        } finally {
            setEnrichingLeadId('')
        }
    }

    async function loadHistory(lead) {
        setHistoryLeadId(lead.id)
        setHistoryLoading(true)
        setAuditMessage('')
        try {
            const response = await axios.get('/api/similarweb/history', {
                headers,
                params: { contactId: lead.id },
            })
            setHistoryItems(Array.isArray(response.data?.items) ? response.data.items : [])
        } catch (err) {
            setAuditMessage(err.response?.data?.error || 'History konnte nicht geladen werden')
        } finally {
            setHistoryLoading(false)
        }
    }

    async function runTrustAudit(lead) {
        setAuditMessage('')
        try {
            const response = await axios.post(`/api/audits/trust-prospecting/${lead.id}`, {}, { headers })
            setAuditMessage(`Trust Audit erstellt: Score ${response.data?.score ?? response.data?.totalScore ?? '-'}%`) 
        } catch (err) {
            setAuditMessage(err.response?.data?.error || 'Trust Audit fehlgeschlagen')
        }
    }

    async function runOnsiteAnalysis(lead) {
        setOnsiteLoadingId(lead.id)
        setOnsiteError('')
        try {
            const response = await axios.post(`/api/audits/onsite-analysis/${lead.id}`, {}, { headers })
            setOnsiteResult({ lead, data: response.data })
        } catch (err) {
            setOnsiteError(err.response?.data?.error || 'Vor-Ort Analyse fehlgeschlagen')
        } finally {
            setOnsiteLoadingId('')
        }
    }

    async function downloadOnsitePdf(lead) {
        try {
            const response = await axios.get(`/api/audits/onsite-analysis/${lead.id}/pdf`, {
                headers,
                responseType: 'blob',
            })

            const blob = new Blob([response.data], { type: 'application/pdf' })
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `onsite-analyse-${(lead.name || lead.company || lead.id || 'kunde').toLowerCase().replace(/[^a-z0-9-_]+/g, '-')}.pdf`
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.URL.revokeObjectURL(url)
        } catch (err) {
            setOnsiteError(err.response?.data?.error || 'PDF konnte nicht geladen werden')
        }
    }

    async function downloadOfferPdf(lead) {
        try {
            const response = await axios.get(`/api/audits/onsite-analysis/${lead.id}/offer-pdf`, {
                headers,
                responseType: 'blob',
            })

            const blob = new Blob([response.data], { type: 'application/pdf' })
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `angebot-${(lead.name || lead.company || lead.id || 'kunde').toLowerCase().replace(/[^a-z0-9-_]+/g, '-')}.pdf`
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.URL.revokeObjectURL(url)
        } catch (err) {
            setOnsiteError(err.response?.data?.error || 'Angebots-PDF konnte nicht geladen werden')
        }
    }

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
            <div>
                <h1 className="text-3xl font-bold text-white">Lead-Management</h1>
                <p className="text-gray-400 mt-1">Importiere und verwalte neue Leads</p>
            </div>

            {error && <div className="p-3 rounded-lg bg-rose-500/15 text-rose-300 text-sm">{error}</div>}

            <CSVUploader onUpload={handleCSVUpload} />

            <div className="crm-card p-4 space-y-3">
                <div>
                    <h2 className="text-lg font-semibold text-white">Similarweb Direktvergleich</h2>
                    <p className="text-xs text-surface-400">Vergleiche potenzielle Kunden direkt mit Wettbewerbern (Traffic + Kanalanteile).</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input
                        type="text"
                        value={primaryDomain}
                        onChange={(e) => setPrimaryDomain(e.target.value)}
                        placeholder="Kunden-Domain (z. B. kunde.de)"
                        className="input-field"
                    />
                    <input
                        type="text"
                        value={competitorDomain}
                        onChange={(e) => setCompetitorDomain(e.target.value)}
                        placeholder="Wettbewerber-Domain"
                        className="input-field"
                    />
                    <button onClick={runCompare} disabled={compareLoading} className="btn-primary disabled:opacity-50">
                        {compareLoading ? 'Vergleiche...' : 'Jetzt vergleichen'}
                    </button>
                </div>
                {compareError && <p className="text-xs text-rose-300">{compareError}</p>}
                {enrichMessage && <p className="text-xs text-brand-300">{enrichMessage}</p>}
                {auditMessage && <p className="text-xs text-amber-300">{auditMessage}</p>}
                {onsiteError && <p className="text-xs text-rose-300">{onsiteError}</p>}
                {compareResult && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                        <div className="bg-surface-800/50 rounded p-3">
                            <p className="text-surface-400 mb-1">{compareResult.primary?.domain}</p>
                            <p className="text-white font-semibold">{Number(compareResult.primary?.summary?.latestVisits || 0).toLocaleString('de-DE')} Visits</p>
                            <p className="text-surface-400 text-xs">Direct: {(Number(compareResult.primary?.summary?.directShare || 0) * 100).toFixed(1)}%</p>
                        </div>
                        <div className="bg-surface-800/50 rounded p-3">
                            <p className="text-surface-400 mb-1">{compareResult.competitor?.domain}</p>
                            <p className="text-white font-semibold">{Number(compareResult.competitor?.summary?.latestVisits || 0).toLocaleString('de-DE')} Visits</p>
                            <p className="text-surface-400 text-xs">Search: {(Number(compareResult.competitor?.summary?.searchShare || 0) * 100).toFixed(1)}%</p>
                        </div>
                        <div className="bg-surface-800/50 rounded p-3">
                            <p className="text-surface-400 mb-1">Traffic Gap</p>
                            <p className="text-white font-semibold">{Number(compareResult.comparison?.trafficGap || 0).toLocaleString('de-DE')}</p>
                            <p className="text-xs text-surface-400">Stärker: {compareResult.comparison?.strongerDomain || '-'}</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="crm-card p-4"><p className="text-surface-400 text-sm">Gesamt</p><p className="text-2xl font-bold text-white">{stats.total}</p></div>
                <div className="crm-card p-4"><p className="text-surface-400 text-sm">Lead</p><p className="text-2xl font-bold text-status-info">{stats.lead}</p></div>
                <div className="crm-card p-4"><p className="text-surface-400 text-sm">Aktiv</p><p className="text-2xl font-bold text-status-success">{stats.active}</p></div>
                <div className="crm-card p-4"><p className="text-surface-400 text-sm">Inaktiv</p><p className="text-2xl font-bold text-surface-500">{stats.inactive}</p></div>
                <div className="crm-card p-4"><p className="text-surface-400 text-sm">Hot Leads</p><p className="text-2xl font-bold text-amber-300">{stats.hot}</p></div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Suche nach Name, E-Mail, Firma..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="input-field pl-10"
                    />
                </div>
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <select
                        value={status}
                        onChange={e => setStatus(e.target.value)}
                        className="input-field pl-10 pr-10 appearance-none cursor-pointer min-w-[180px]"
                    >
                        <option value="all">Alle Status</option>
                        <option value="lead">Lead</option>
                        <option value="active">Aktiv</option>
                        <option value="inactive">Inaktiv</option>
                    </select>
                </div>
                <div className="relative">
                    <select
                        value={priority}
                        onChange={e => setPriority(e.target.value)}
                        className="input-field min-w-[160px]"
                    >
                        <option value="all">Alle Prioritäten</option>
                        <option value="hot">Hot</option>
                        <option value="warm">Warm</option>
                        <option value="cold">Cold</option>
                    </select>
                </div>
            </div>

            <div className="crm-card overflow-hidden">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th className="table-header">Name</th>
                                <th className="table-header">Firma</th>
                                <th className="table-header">Kontakt</th>
                                <th className="table-header">Status</th>
                                <th className="table-header">Score</th>
                                <th className="table-header">Quelle</th>
                                <th className="table-header">Erstellt</th>
                                <th className="table-header">Intel</th>
                            </tr>
                        </thead>
                        <tbody>
                            {!loading && visibleLeads.map((lead) => (
                                <tr key={lead.id} className="hover:bg-surface-700/30">
                                    <td className="table-cell font-medium text-white">{lead.name || '-'}</td>
                                    <td className="table-cell">{lead.company || '-'}</td>
                                    <td className="table-cell text-surface-400">{lead.email || lead.phone || '-'}</td>
                                    <td className="table-cell">{lead.status || '-'}</td>
                                    <td className="table-cell">
                                        <span className="font-semibold text-white">{Number(lead.score || 0)}</span>
                                        <span className="text-xs text-surface-500 ml-2">{lead.priority || 'cold'}</span>
                                    </td>
                                    <td className="table-cell">{lead.source || '-'}</td>
                                    <td className="table-cell text-surface-400">{lead.created_at ? new Date(lead.created_at).toLocaleDateString('de-DE') : '-'}</td>
                                    <td className="table-cell">
                                        <div className="flex items-center gap-2">
                                            <button
                                                className="btn-secondary text-xs"
                                                onClick={() => setPrimaryDomain(inferDomainFromLead(lead))}
                                                title="Domain in Vergleich übernehmen"
                                            >
                                                Als Kunde wählen
                                            </button>
                                            <button
                                                className="btn-primary text-xs"
                                                onClick={() => enrichLead(lead)}
                                                disabled={enrichingLeadId === lead.id}
                                                title="Similarweb Snapshot speichern"
                                            >
                                                {enrichingLeadId === lead.id ? 'Enrich...' : 'Enrich'}
                                            </button>
                                            <button className="btn-secondary text-xs" onClick={() => loadHistory(lead)}>History</button>
                                            <button className="btn-secondary text-xs" onClick={() => runTrustAudit(lead)}>Trust Audit</button>
                                            <button
                                                className="btn-primary text-xs"
                                                onClick={() => runOnsiteAnalysis(lead)}
                                                disabled={onsiteLoadingId === lead.id}
                                            >
                                                {onsiteLoadingId === lead.id ? 'Analysiere...' : 'Vor-Ort Analyse'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {!loading && visibleLeads.length === 0 && (
                                <tr><td className="table-cell text-center text-surface-400 py-12" colSpan={8}>Keine Leads vorhanden</td></tr>
                            )}
                            {loading && (
                                <tr><td className="table-cell text-center text-surface-400 py-12" colSpan={8}>Leads werden geladen...</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {historyLeadId && (
                <div className="crm-card p-4">
                    <h3 className="text-white font-semibold mb-3">Similarweb History ({historyLeadId})</h3>
                    {historyLoading ? (
                        <p className="text-sm text-surface-400">Lade History...</p>
                    ) : historyItems.length === 0 ? (
                        <p className="text-sm text-surface-500">Keine Snapshots vorhanden</p>
                    ) : (
                        <div className="space-y-2">
                            {historyItems.map((item) => (
                                <div key={item.id} className="bg-surface-800/40 rounded p-3 flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-white">{item.domain || '-'}</p>
                                        <p className="text-xs text-surface-400">{item.enrichedAt ? new Date(item.enrichedAt).toLocaleString('de-DE') : '-'}</p>
                                    </div>
                                    <p className="text-sm text-crm-accent">{Number(item.latestVisits || 0).toLocaleString('de-DE')} Visits</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {onsiteResult && (
                <div className="crm-card p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-white font-semibold">Vor-Ort Analyse: {onsiteResult.lead?.name || onsiteResult.lead?.company || onsiteResult.lead?.id}</h3>
                        <div className="flex items-center gap-2">
                            <p className="text-xs text-surface-400">{onsiteResult.data?.generatedAt ? new Date(onsiteResult.data.generatedAt).toLocaleString('de-DE') : '-'}</p>
                            <button className="btn-secondary text-xs" onClick={() => downloadOnsitePdf(onsiteResult.lead)}>PDF Export</button>
                            <button className="btn-primary text-xs" onClick={() => downloadOfferPdf(onsiteResult.lead)}>Angebot PDF</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="bg-surface-800/40 rounded p-3">
                            <p className="text-surface-400 text-xs mb-1">Zusätzliche Leads / Monat</p>
                            <p className="text-2xl font-bold text-white">{onsiteResult.data?.analysis?.benefits?.additionalLeadsMonthly ?? '-'}</p>
                        </div>
                        <div className="bg-surface-800/40 rounded p-3">
                            <p className="text-surface-400 text-xs mb-1">Umsatzpotenzial / Monat</p>
                            <p className="text-2xl font-bold text-status-success">{Number(onsiteResult.data?.analysis?.benefits?.additionalRevenueMonthly || 0).toLocaleString('de-DE')} €</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <p className="text-sm text-white font-medium">Empfohlene Optimierungen</p>
                        {(onsiteResult.data?.analysis?.recommendations || []).map((item, idx) => (
                            <div key={`${item.area}-${idx}`} className="bg-surface-800/30 rounded p-3">
                                <p className="text-sm text-white font-medium">{item.area} <span className="text-xs text-surface-500">({item.priority})</span></p>
                                <p className="text-xs text-surface-400 mt-1">Problem: {item.issue}</p>
                                <p className="text-xs text-surface-300 mt-1">Maßnahme: {item.optimization}</p>
                                <p className="text-xs text-brand-300 mt-1">Nutzen: {item.expectedImpact}</p>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-2">
                        <p className="text-sm text-white font-medium">Pitch-Argumentation (live beim Kunden)</p>
                        {(onsiteResult.data?.analysis?.quickPitch || []).map((line, idx) => (
                            <p key={idx} className="text-sm text-surface-300">• {line}</p>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
