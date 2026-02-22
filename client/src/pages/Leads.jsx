import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import CSVUploader from '../components/CSVUploader'
import { Search, Filter } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getFeatureFlags, subscribeFeatureFlags } from '../utils/featureFlags'

export default function Leads() {
    const navigate = useNavigate()
    const [flags, setFlags] = useState(() => getFeatureFlags())
    const ENABLE_SIMILARWEB = Boolean(flags?.similarweb)
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

    const [googleQuery, setGoogleQuery] = useState('')
    const [googleNear, setGoogleNear] = useState('Berlin, Deutschland')
    const [googleItems, setGoogleItems] = useState([])
    const [googleLoading, setGoogleLoading] = useState(false)
    const [googleError, setGoogleError] = useState('')
    const [googleImportingId, setGoogleImportingId] = useState('')
    const [googleMessage, setGoogleMessage] = useState('')
    const [googleIncludePageSpeed, setGoogleIncludePageSpeed] = useState(false)
    const [googleGridLoadingId, setGoogleGridLoadingId] = useState('')
    const [googleBatchLoading, setGoogleBatchLoading] = useState(false)

    const token = localStorage.getItem('token')
    const headers = { Authorization: `Bearer ${token}` }

    useEffect(() => subscribeFeatureFlags(setFlags), [])

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

    async function runGoogleLeadSearch() {
        setGoogleLoading(true)
        setGoogleError('')
        setGoogleMessage('')
        try {
            const response = await axios.get('/api/lead-search', {
                headers,
                params: {
                    q: googleQuery || undefined,
                    near: googleNear || undefined,
                    limit: 10,
                    pagespeed: flags?.pageSpeedInsights && googleIncludePageSpeed ? 1 : 0,
                },
            })

            setGoogleItems(Array.isArray(response.data?.items) ? response.data.items : [])
        } catch (err) {
            setGoogleError(err.response?.data?.error || 'Lead-Suche fehlgeschlagen')
        } finally {
            setGoogleLoading(false)
        }
    }

    async function importGoogleLead(item) {
        if (!item?.placeId) return
        setGoogleImportingId(item.placeId)
        setGoogleError('')
        setGoogleMessage('')
        try {
            const response = await axios.post('/api/lead-search/import', {
                placeId: item.placeId,
            }, { headers })

            const created = response.data?.contact
            const scoring = response.data?.scoring
            const enrichment = response.data?.enrichment
            const enrichmentError = response.data?.enrichmentError

            setGoogleItems((prev) => prev.map((x) => {
                if (x.placeId !== item.placeId) return x
                return {
                    ...x,
                    importedContactId: created?.id || null,
                    scoring: scoring || null,
                    enrichment: enrichment || null,
                    enrichmentError: enrichmentError || null,
                }
            }))

            if (scoring) {
                const enrichHint = enrichmentError ? ` (${enrichmentError})` : ''
                setGoogleMessage(`Import OK: ${scoring.priority?.toUpperCase?.() || scoring.priority} • Score ${scoring.score}${enrichHint}`)
            }

            if (created?.id) {
                await loadLeads()
                navigate(`/leads/${created.id}`)
            }
        } catch (err) {
            setGoogleError(err.response?.data?.error || 'Import fehlgeschlagen')
        } finally {
            setGoogleImportingId('')
        }
    }

    function gridCellClass(rank) {
        if (rank === null || rank === undefined) return 'bg-surface-800/40 text-surface-500'
        const r = Number(rank)
        if (!Number.isFinite(r)) return 'bg-surface-800/40 text-surface-500'
        if (r <= 3) return 'bg-emerald-500/20 text-emerald-200'
        if (r <= 10) return 'bg-amber-500/20 text-amber-200'
        return 'bg-rose-500/15 text-rose-200'
    }

    async function runGridRank(item) {
        if (!item?.placeId) return
        setGoogleGridLoadingId(item.placeId)
        setGoogleError('')
        try {
            const response = await axios.get('/api/lead-search/grid-rank', {
                headers,
                params: {
                    q: googleQuery || undefined,
                    near: googleNear || undefined,
                    placeId: item.placeId,
                    save: 1,
                    gridSize: 3,
                    stepKm: 1.5,
                    radius: 5000,
                    limit: 20,
                },
            })

            setGoogleItems((prev) => prev.map((x) => {
                if (x.placeId !== item.placeId) return x
                return { ...x, gridRank: response.data }
            }))
        } catch (err) {
            setGoogleError(err.response?.data?.error || 'Grid Rank fehlgeschlagen')
        } finally {
            setGoogleGridLoadingId('')
        }
    }

    async function runGridRankBatchTop() {
        if (!googleItems.length || !googleQuery.trim() || !googleNear.trim()) return
        setGoogleBatchLoading(true)
        setGoogleError('')
        setGoogleMessage('')
        try {
            const placeIds = googleItems
                .map((x) => x?.placeId)
                .filter(Boolean)
                .slice(0, 5)

            const resp = await axios.post('/api/lead-search/grid-rank/batch', {
                q: googleQuery,
                near: googleNear,
                placeIds,
                gridSize: 3,
                stepKm: 1.5,
                radius: 5000,
                limit: 20,
            }, { headers })

            const byPlace = new Map((resp.data?.results || []).map((r) => [r.placeId, r]))
            setGoogleItems((prev) => prev.map((x) => {
                const hit = byPlace.get(x.placeId)
                if (!hit || hit.error) return x
                // We don't have full matrix in batch response; store summary so list shows progress.
                return {
                    ...x,
                    gridRank: {
                        ...(x.gridRank || {}),
                        summary: hit.summary,
                        gridSize: hit.gridSize,
                        savedScanId: hit.savedScanId,
                    },
                }
            }))

            const ok = (resp.data?.results || []).filter((r) => r && !r.error).length
            setGoogleMessage(`Grid Rank Batch: ${ok}/${placeIds.length} gespeichert (siehe Map Dashboard)`) 
        } catch (err) {
            setGoogleError(err.response?.data?.error || 'Batch Grid Rank fehlgeschlagen')
        } finally {
            setGoogleBatchLoading(false)
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

            {ENABLE_SIMILARWEB && (
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
            )}

            <div className="crm-card p-4 space-y-3">
                <div>
                    <h2 className="text-lg font-semibold text-white">Lead Suche (Google)</h2>
                    <p className="text-xs text-surface-400">Suche wie bei Google/Maps, importiere passende Kunden und nutze sofort Intel (Website Tech, Sichtbarkeit, Speed, PageSpeed Insights, Grid Rank Scan).</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <input
                        type="text"
                        value={googleQuery}
                        onChange={(e) => setGoogleQuery(e.target.value)}
                        placeholder="z. B. Dachdecker, Zahnarzt, Steuerberater"
                        className="input-field md:col-span-3"
                    />
                    <input
                        type="text"
                        value={googleNear}
                        onChange={(e) => setGoogleNear(e.target.value)}
                        placeholder="Ort (z. B. Berlin, Deutschland)"
                        className="input-field md:col-span-1"
                    />
                    <button
                        onClick={runGoogleLeadSearch}
                        disabled={googleLoading || !googleQuery.trim()}
                        className="btn-primary disabled:opacity-50 md:col-span-1"
                    >
                        {googleLoading ? 'Suche...' : 'Suchen'}
                    </button>
                </div>

                {(flags?.gridRank || flags?.mapDashboard) && (
                    <div className="flex items-center gap-2">
                        {flags?.gridRank && (
                            <button
                                className="btn-secondary text-xs"
                                onClick={runGridRankBatchTop}
                                disabled={googleBatchLoading || googleLoading || googleItems.length === 0 || !googleQuery.trim()}
                                title="Grid Rank Scan für die Top Ergebnisse speichern"
                            >
                                {googleBatchLoading ? 'Batch...' : 'Grid Rank Top 5'}
                            </button>
                        )}
                        {flags?.mapDashboard && (
                            <a className="text-xs text-brand-300 hover:underline" href="/map-dashboard">Map Dashboard öffnen</a>
                        )}
                    </div>
                )}

                {googleError && <p className="text-xs text-rose-300">{googleError}</p>}
                {googleMessage && <p className="text-xs text-brand-300">{googleMessage}</p>}

                <div className="flex flex-col gap-2">
                    <p className="text-xs text-surface-400">Hinweis: Traffic (Similarweb) ist kostenpflichtig und hier deaktiviert. Wir nutzen stattdessen kostenlose Proxy-Signale (Reviews, Visibility, Speed, SEO).</p>
                    {flags?.pageSpeedInsights && (
                        <div className="flex items-center gap-2 text-xs text-surface-400">
                            <input
                                id="google-pagespeed"
                                type="checkbox"
                                className="accent-brand-400"
                                checked={googleIncludePageSpeed}
                                onChange={(e) => setGoogleIncludePageSpeed(e.target.checked)}
                            />
                            <label htmlFor="google-pagespeed" className="cursor-pointer">
                                PageSpeed Insights (Lighthouse Scores) laden (langsamer)
                            </label>
                        </div>
                    )}
                </div>

                {googleItems.length > 0 && (
                    <div className="space-y-2">
                        {googleItems.map((item) => (
                            <div key={item.placeId} className="bg-surface-800/40 rounded p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        {item.googleRank && <span className="badge-neutral">#{item.googleRank}</span>}
                                        <p className="text-sm text-white font-semibold truncate">{item.name || '-'}</p>
                                    </div>
                                    <p className="text-xs text-surface-400 truncate">{item.address || '-'}</p>
                                    <div className="text-xs text-surface-400 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                                        {item.phone && <span>{item.phone}</span>}
                                        {item.website ? (
                                            <a className="text-brand-300 hover:underline" href={item.website} target="_blank" rel="noreferrer">Website</a>
                                        ) : (
                                            <span className="badge-error">Keine Website</span>
                                        )}
                                        {item.site?.platform?.name && item.site.platform.name !== 'Unbekannt' && (
                                            <span className="badge-info">{item.site.platform.name}</span>
                                        )}
                                        {item.site?.platform?.name === 'Unbekannt' && item.website && (
                                            <span className="badge-neutral">Technik unbekannt</span>
                                        )}
                                        {item.rating && <span>Rating: {item.rating} ({item.userRatingsTotal || 0})</span>}
                                        {typeof item.site?.seo?.responseTimeMs === 'number' && (
                                            <span>TTFB: {item.site.seo.responseTimeMs}ms</span>
                                        )}
                                        {typeof item.site?.visibility?.score === 'number' && (
                                            <span className="badge-neutral">Visibility: {item.site.visibility.grade} ({item.site.visibility.score})</span>
                                        )}
                                        {typeof item.pagespeed?.scores?.seo === 'number' && (
                                            <span className="badge-info">PSI SEO: {item.pagespeed.scores.seo}</span>
                                        )}
                                        {typeof item.pagespeed?.scores?.performance === 'number' && (
                                            <span className="badge-info">PSI Perf: {item.pagespeed.scores.performance}</span>
                                        )}
                                    </div>

                                    {item.scoring && (
                                        <div className="mt-2 text-xs text-surface-300 flex flex-wrap gap-x-3 gap-y-1">
                                            <span className="text-white/80">Score: <span className="font-semibold">{item.scoring.score}</span> ({item.scoring.priority})</span>
                                            {typeof item.popularity?.score === 'number' && (
                                                <span>Popularity: {item.popularity.tier} ({item.popularity.score})</span>
                                            )}
                                            {item.enrichmentError && <span className="text-amber-300">{item.enrichmentError}</span>}
                                        </div>
                                    )}

                                    <details className="mt-2">
                                        <summary className="text-xs text-brand-300 cursor-pointer select-none">Intel anzeigen</summary>
                                        <div className="mt-2 text-xs text-surface-300 space-y-1">
                                            <p><span className="text-surface-500">Query:</span> {item.googleQuery || '-'} <span className="text-surface-500">Rank:</span> {item.googleRank || '-'}</p>
                                            <p><span className="text-surface-500">Domain:</span> {item.domain || '-'}</p>
                                            <p><span className="text-surface-500">HTTP:</span> {item.site?.httpStatus ?? '-'} <span className="text-surface-500">HTTPS:</span> {item.site?.seo?.https ? 'ja' : 'nein'}</p>
                                            {typeof item.site?.visibility?.score === 'number' && (
                                                <p><span className="text-surface-500">Visibility:</span> {item.site.visibility.grade} ({item.site.visibility.score}) · {Array.isArray(item.site.visibility.reasons) ? item.site.visibility.reasons.join(', ') : ''}</p>
                                            )}
                                            <p><span className="text-surface-500">Index:</span> {item.site?.seo?.robotsNoindex ? <span className="text-rose-300">noindex</span> : 'ok'}</p>
                                            <p><span className="text-surface-500">Title:</span> {item.site?.seo?.title || '-'}</p>
                                            <p><span className="text-surface-500">Meta:</span> {item.site?.seo?.metaDescription || '-'}</p>
                                            <p><span className="text-surface-500">Schema:</span> {item.site?.seo?.hasSchemaOrg ? 'ja' : 'nein'} <span className="text-surface-500">OG:</span> {item.site?.seo?.hasOpenGraph ? 'ja' : 'nein'} <span className="text-surface-500">H1:</span> {item.site?.seo?.hasH1 ? 'ja' : 'nein'}</p>

                                            {typeof item.popularity?.score === 'number' && (
                                                <p><span className="text-surface-500">Popularity:</span> {item.popularity.tier} ({item.popularity.score}) · {Array.isArray(item.popularity.reasons) ? item.popularity.reasons.join(', ') : ''}</p>
                                            )}

                                            {(item.pagespeed?.scores || item.pagespeed?.error) && (
                                                <div className="pt-2">
                                                    <p className="text-surface-500">PageSpeed Insights</p>
                                                    {item.pagespeed?.error ? (
                                                        <p className="text-amber-300">{item.pagespeed.error}</p>
                                                    ) : (
                                                        <div className="space-y-1">
                                                            <p>Perf {item.pagespeed.scores.performance ?? '-'} · SEO {item.pagespeed.scores.seo ?? '-'} · Best {item.pagespeed.scores.bestPractices ?? '-'} · A11y {item.pagespeed.scores.accessibility ?? '-'}</p>
                                                            <p className="text-surface-400">LCP {item.pagespeed.metrics?.lcpMs ? Math.round(item.pagespeed.metrics.lcpMs) + 'ms' : '-'} · FCP {item.pagespeed.metrics?.fcpMs ? Math.round(item.pagespeed.metrics.fcpMs) + 'ms' : '-'} · TBT {item.pagespeed.metrics?.tbtMs ? Math.round(item.pagespeed.metrics.tbtMs) + 'ms' : '-'} · CLS {typeof item.pagespeed.metrics?.cls === 'number' ? item.pagespeed.metrics.cls.toFixed(2) : '-'}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {item.gridRank?.matrix && (
                                                <div className="pt-2">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-surface-500">Grid Rank (Maps)</p>
                                                        <p className="text-surface-500">Best {item.gridRank.summary?.best ?? '-'} · Avg {item.gridRank.summary?.avg ?? '-'} · Found {item.gridRank.summary?.found ?? 0}/{item.gridRank.summary?.total ?? 0}</p>
                                                    </div>
                                                    <div className="mt-2 inline-block">
                                                        {item.gridRank.matrix.map((row, rIdx) => (
                                                            <div key={rIdx} className="flex gap-1 mb-1">
                                                                {row.map((cell, cIdx) => (
                                                                    <div
                                                                        key={`${rIdx}-${cIdx}`}
                                                                        className={`w-9 h-8 rounded flex items-center justify-center text-[11px] ${gridCellClass(cell)}`}
                                                                        title={cell ? `Rank ${cell}` : 'nicht in Top 20'}
                                                                    >
                                                                        {cell ?? '–'}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <p className="text-surface-500 mt-1">Grid {item.gridRank.gridSize}×{item.gridRank.gridSize} · Step {item.gridRank.stepKm}km · Radius {item.gridRank.radius}m · Limit {item.gridRank.limit}</p>
                                                </div>
                                            )}
                                        </div>
                                    </details>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {item.googleMapsUrl && (
                                        <a className="btn-secondary text-xs" href={item.googleMapsUrl} target="_blank" rel="noreferrer">Maps</a>
                                    )}
                                    {flags?.gridRank && (
                                        <button
                                            className="btn-secondary text-xs"
                                            onClick={() => runGridRank(item)}
                                            disabled={googleGridLoadingId === item.placeId || !googleQuery.trim()}
                                            title="Local Grid Rank Scan"
                                        >
                                            {googleGridLoadingId === item.placeId ? 'Grid...' : 'Grid Rank'}
                                        </button>
                                    )}
                                    <button
                                        className="btn-primary text-xs"
                                        onClick={() => importGoogleLead(item)}
                                        disabled={googleImportingId === item.placeId}
                                    >
                                        {googleImportingId === item.placeId ? 'Import...' : 'Importieren'}
                                    </button>
                                </div>
                            </div>
                        ))}
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
                                    <td className="table-cell font-medium text-white">
                                        <button
                                            className="hover:underline"
                                            onClick={() => navigate(`/leads/${lead.id}`)}
                                            title="Lead Report öffnen"
                                        >
                                            {lead.name || lead.company || '-'}
                                        </button>
                                    </td>
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
                                            {ENABLE_SIMILARWEB && (
                                                <>
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
                                                </>
                                            )}
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

            {ENABLE_SIMILARWEB && historyLeadId && (
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
